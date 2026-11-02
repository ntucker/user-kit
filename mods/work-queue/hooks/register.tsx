import { atom, read, update } from 'claude-code';
import type { EngineInterface, Register, Timer } from 'claude-code';

import type { Group, Item, Queue, QueueSnapshot, Tab, ToolInput } from '../types';
import {
  ALL_GROUPS,
  GROUP_TITLE,
  OPEN_GROUPS,
  QueueError,
  byNumber,
  groupItems,
  isoDay,
  itemText,
  markMerged,
  newlyReady,
  openPrs,
  parseQueue,
  rowLabel,
  runTool,
  serialize,
  statusText,
  summaryText,
  toMarkdown,
  TOOL_SCHEMA,
} from './queue';

const PANE = 'work-queue';
const TITLE = 'Work queue';
const TOOL = 'mcp__work-queue__queue';
const snapshotAtom = atom({ plugin: 'work-queue', key: 'snapshot' } as const, null);
const tabAtom = atom({ plugin: 'work-queue', key: 'tab' } as const, 'open');
const selectedAtom = atom({ plugin: 'work-queue', key: 'selected' } as const, null);
/** A stat of the file: cheap, so others' edits show within this */
const POLL_MS = 20_000;
const PR_POLL_MS = 5 * 60_000;

const GROUP_COLOR: Partial<Record<Group, string>> = {
  decision: 'warning',
  ready: 'success',
  pr: 'suggestion',
  running: 'claude',
};

const USAGE =
  'Usage: /queue [all | <n> | start <n> | done <n> [outcome] | drop <n> [reason]]';
const FINISH = { done: 'done', drop: 'dropped' } as const;

type Options = { file: string; markdown: string; checkPrs: boolean };

let options: Options = { file: 'work-queue.json', markdown: '', checkPrs: true };
let poll: Timer | undefined;
let prPoll: Timer | undefined;
/** Reads and writes of the file run one after another */
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(work, work);
  chain = run.catch(() => undefined);
  return run;
}

async function today($: EngineInterface) {
  return isoDay(new Date(await $.clock.now()));
}

/** The file's mtime, or undefined while it does not exist */
async function mtimeOf($: EngineInterface): Promise<number | undefined> {
  const stat = await $.fs.stat(options.file).catch(() => undefined);
  return stat?.mtimeMs;
}

async function readFile($: EngineInterface): Promise<QueueSnapshot> {
  const mtimeMs = await mtimeOf($);
  if (mtimeMs === undefined) return { kind: 'missing' };
  try {
    return { kind: 'ok', queue: parseQueue(await $.fs.read(options.file)), mtimeMs };
  } catch (error) {
    return { kind: 'error', message: (error as Error).message };
  }
}

/** Shows a new snapshot: state, status line, toasts for newly ready items */
async function show($: EngineInterface, next: QueueSnapshot) {
  const previous = await read($, snapshotAtom);
  await update($, snapshotAtom, () => next);
  if (next.kind !== 'ok') {
    $.ui.status(undefined);
    syncPrPoll($, next);
    return;
  }
  const day = await today($);
  const grouped = groupItems(next.queue, day);
  $.ui.status(statusText(grouped));
  if (previous?.kind === 'ok')
    for (const item of newlyReady(previous.queue, grouped.ready, day))
      $.ui.toast(`Queue #${item.n} is ready: ${item.title}`);
  syncPrPoll($, next);
}

/** Re-reads the file when it changed since the last read */
function refresh($: EngineInterface, force = false): Promise<QueueSnapshot> {
  return serial(async () => {
    const current = await read($, snapshotAtom);
    if (!force && current?.kind === 'ok' && (await mtimeOf($)) === current.mtimeMs)
      return current;
    const next = await readFile($);
    await show($, next);
    return next;
  });
}

/** The queue as it is now, or a QueueError saying why there is none */
async function currentQueue($: EngineInterface): Promise<Queue> {
  const snapshot = await refresh($);
  if (snapshot.kind !== 'ok') throw new QueueError(describe(snapshot));
  return snapshot.queue;
}

/**
 * Runs a tool input against the file as it is now, so others' edits survive,
 * and writes it back when it changed. Throws QueueError for a bad input.
 */
function apply($: EngineInterface, input: ToolInput): Promise<string> {
  return serial(async () => {
    const day = await today($);
    const read = await readFile($);
    if (read.kind === 'error') throw new QueueError(describe(read));
    const queue: Queue = read.kind === 'ok' ? read.queue : { version: 1, items: [] };
    const ran = runTool(queue, input, day);
    if (ran.queue) await write($, ran.queue, day);
    return ran.text;
  });
}

async function write($: EngineInterface, queue: Queue, day: string) {
  await $.fs.write(options.file, serialize(queue));
  if (options.markdown) await $.fs.write(options.markdown, toMarkdown(queue, day));
  await show($, { kind: 'ok', queue, mtimeMs: (await mtimeOf($)) ?? 0 });
}

/** Clears waits on PRs gh reports merged */
async function checkPrs($: EngineInterface) {
  const snapshot = await read($, snapshotAtom);
  if (snapshot?.kind !== 'ok') return;
  const states = await Promise.all(
    openPrs(snapshot.queue).map(async pr => {
      const [repo = '', number = ''] = pr.split('#');
      const ran = await $.process.run([
        'gh', 'pr', 'view', number, '-R', repo, '--json', 'state', '-q', '.state',
      ]);
      return ran.exitCode === 0 && ran.stdout.trim() === 'MERGED' ? pr : undefined;
    }),
  );
  const merged = new Set(states.filter(pr => pr !== undefined));
  if (merged.size === 0) return;
  await serial(async () => {
    const read = await readFile($);
    if (read.kind !== 'ok') return;
    const next = markMerged(read.queue, merged);
    if (next !== read.queue) await write($, next, await today($));
  });
}

function syncPrPoll($: EngineInterface, snapshot: QueueSnapshot) {
  const wanted =
    options.checkPrs && snapshot.kind === 'ok' && openPrs(snapshot.queue).length > 0;
  if (wanted) prPoll ??= $.clock.every(PR_POLL_MS, () => void checkPrs($).catch(() => undefined));
  else {
    prPoll?.cancel();
    prPoll = undefined;
  }
}

/** Asks Claude to start item n */
async function startItem($: EngineInterface, n: number): Promise<string> {
  const text = itemText(await currentQueue($), n, await today($));
  if (text.startsWith('No item')) return text;
  // /queue's command.run hook holds the turn a submit would wait on, so submit after it
  $.clock.after(0, () =>
    void $.prompt
      .submit({
        text: `Start work-queue item #${n}. When the work begins, mark it running with the queue tool (set thread to where it runs); when it ends, mark it done with an outcome, adding any follow-ups as new items.\n\n${text}`,
      })
      .catch(error => $.ui.toast(`Could not start #${n}: ${(error as Error).message}`)),
  );
  return `Starting #${n}.`;
}

async function command($: EngineInterface, args: string): Promise<string> {
  const [verb = '', arg = '', ...rest] = args.trim().split(/\s+/).filter(Boolean);
  if (verb === '' || verb === 'all') {
    await $.ui.open({ id: PANE, title: TITLE });
    const queue = await currentQueue($);
    return summaryText(queue, await today($), { withDone: verb === 'all' });
  }
  if (/^\d+$/.test(verb)) return itemText(await currentQueue($), Number(verb), await today($));
  if (!/^\d+$/.test(arg)) return USAGE;
  const n = Number(arg);
  if (verb === 'start') return startItem($, n);
  if (verb === 'done' || verb === 'drop') {
    const outcome = rest.join(' ');
    return apply($, { action: 'update', n, state: FINISH[verb], ...(outcome && { outcome }) });
  }
  return USAGE;
}

export const register: Register = (on, rawOptions) => {
  options = rawOptions as unknown as Options;

  on('session.start', async ($, e, next) => {
    await Promise.all([
      $.command.register({
        name: 'queue',
        description: 'Show the work queue, or start, finish or drop an item',
        argumentHint: '[all | <n> | start <n> | done <n> [outcome] | drop <n> [reason]]',
      }),
      $.tool.register({
        name: 'queue',
        description: `The shared work queue (${options.file}): numbered items with a self-contained brief, a state (queued, running, done, dropped) and what each waits on (a PR, the person's decision, another item, an event). list shows open items grouped by what they wait on; get shows one; add and update change the file. Use it instead of editing the queue file by hand. Mark an item running when work on it starts and done (with an outcome) when it ends; record new follow-ups with add.`,
        inputSchema: TOOL_SCHEMA as unknown as Record<string, unknown>,
        isDeferred: false,
      }),
    ]);
    poll ??= $.clock.every(POLL_MS, () => void refresh($));
    void refresh($, true);
    return next(e);
  });

  on('command.run', { command: 'queue' }, async ($, e) => {
    try {
      return { text: await command($, e.args) };
    } catch (error) {
      return { text: `Queue: ${(error as Error).message}` };
    }
  });

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const { tool: _tool, tool_use_id: _id, ...input } = e;
    try {
      const isRead = input.action === 'list' || input.action === 'get';
      const text =
        isRead ? runTool(await currentQueue($), input, await today($)).text : await apply($, input);
      return { result: text };
    } catch (error) {
      if (error instanceof QueueError) return { result: `Error: ${error.message}` };
      throw error;
    }
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    const snapshot = await read($, snapshotAtom);
    const tab: Tab = await read($, tabAtom);
    const selected = await read($, selectedAtom);

    if (snapshot?.kind !== 'ok')
      return (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{snapshot ? describe(snapshot) : 'Reading the queue…'}</Text>
          <Button key="refresh" label="Refresh" hotkey="r" onPress={() => refresh($, true)} />
        </Box>
      );

    const { queue } = snapshot;
    const day = await today($);
    const byN = byNumber(queue);
    const select = (n: number | null) => update($, selectedAtom, () => n);
    const item = selected === null ? undefined : byN.get(selected);

    if (item)
      return (
        <Box flexDirection="column" gap={1}>
          <Box gap={1}>
            <Button key="back" label="Back" hotkey="b" onPress={() => select(null)} />
            {item.state === 'queued' && (
              <Button key="start" label="Start" variant="primary" hotkey="s" onPress={() => startItem($, item.n)} />
            )}
          </Box>
          <Text wrap="wrap">{itemText(queue, item.n, day)}</Text>
        </Box>
      );

    const grouped = groupItems(queue, day, byN);
    const open = OPEN_GROUPS.reduce((sum, group) => sum + grouped[group].length, 0);
    const tabs: [Tab, string][] = [
      ['open', `Open ${open}`],
      ['running', `Running ${grouped.running.length}`],
      ['done', `Done ${grouped.done.length}`],
    ];
    const shown = (tab === 'open' ? OPEN_GROUPS : ALL_GROUPS.filter(group => group === tab)).filter(
      group => grouped[group].length > 0,
    );
    const row = (group: Group) => (one: Item) => {
      const label = rowLabel(one, group, byN, day);
      return (
        <Button key={`item-${one.n}`} plain onPress={() => select(one.n)}>
          <Text dimColor>{String(one.n).padStart(3)} </Text>
          {one.title}
          {label ? <Text dimColor>{`  ${label}`}</Text> : ''}
        </Button>
      );
    };

    return (
      <Box flexDirection="column" gap={1}>
        <Box gap={1}>
          {tabs.map(([id, label]) => (
            <Button
              key={`tab-${id}`}
              label={label}
              variant={id === tab ? 'primary' : undefined}
              onPress={() => update($, tabAtom, () => id)}
            />
          ))}
          <Button key="refresh" label="Refresh" hotkey="r" dimColor onPress={() => refresh($, true)} />
        </Box>
        {shown.map(group => (
          <Box key={`group-${group}`} flexDirection="column">
            <Text bold color={GROUP_COLOR[group]}>
              {GROUP_TITLE[group]} <Text dimColor>{grouped[group].length}</Text>
            </Text>
            {grouped[group].map(row(group))}
          </Box>
        ))}
        {shown.length === 0 && <Text dimColor>Nothing here.</Text>}
      </Box>
    );
  });
};

function describe(snapshot: Exclude<QueueSnapshot, { kind: 'ok' }>): string {
  return snapshot.kind === 'missing' ?
      'No queue file yet. Ask Claude to add an item with the queue tool, or set the file in /config.'
    : `The queue file is invalid: ${snapshot.message}`;
}
