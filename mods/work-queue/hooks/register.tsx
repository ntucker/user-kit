import type { EngineInterface, Register, Timer } from 'claude-code';

import type { Group, Item, Queue, QueueSnapshot, Tab, ToolInput } from '../types';
import {
  GROUP_TITLE,
  OPEN_GROUPS,
  QueueError,
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
const snapshotRef = { plugin: 'work-queue', key: 'snapshot' } as const;
const tabRef = { plugin: 'work-queue', key: 'tab' } as const;
const selectedRef = { plugin: 'work-queue', key: 'selected' } as const;
/** A stat of the file: cheap, so others' edits show within this */
const POLL_MS = 20_000;
const PR_POLL_MS = 5 * 60_000;

const GROUP_COLOR: Partial<Record<Group, string>> = {
  decision: 'warning',
  ready: 'success',
  pr: 'suggestion',
  running: 'claude',
};

const today = () => isoDay(new Date());

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

async function readFile($: EngineInterface): Promise<QueueSnapshot> {
  if (!(await $.fs.exists(options.file))) return { kind: 'missing' };
  const stat = await $.fs.stat(options.file);
  try {
    const queue = parseQueue(await $.fs.read(options.file));
    return { kind: 'ok', queue, mtimeMs: stat.mtimeMs };
  } catch (error) {
    return { kind: 'error', message: (error as Error).message };
  }
}

/** Shows a new snapshot: state, status line, toasts for newly ready items */
async function show($: EngineInterface, next: QueueSnapshot) {
  const previous = (await $.state.get(snapshotRef)).value ?? null;
  await $.state.set(snapshotRef, next);
  $.ui.status(
    next.kind === 'ok' ? statusText(groupItems(next.queue, today())) : undefined,
  );
  if (previous?.kind === 'ok' && next.kind === 'ok')
    for (const item of newlyReady(previous.queue, next.queue, today()))
      $.ui.toast(`Queue #${item.n} is ready: ${item.title}`);
  syncPrPoll($, next);
}

/** Re-reads the file when it changed since the last read */
function refresh($: EngineInterface, force = false): Promise<QueueSnapshot> {
  return serial(async () => {
    const current = (await $.state.get(snapshotRef)).value ?? null;
    if (!force && current?.kind === 'ok') {
      const stat = (await $.fs.exists(options.file)) ? await $.fs.stat(options.file) : undefined;
      if (stat?.mtimeMs === current.mtimeMs) return current;
    }
    const next = await readFile($);
    await show($, next);
    return next;
  });
}

/** Applies a change to the file as it is now, so others' edits survive */
function mutate($: EngineInterface, change: (queue: Queue) => Queue): Promise<Queue> {
  return serial(async () => {
    const read = await readFile($);
    if (read.kind === 'error') throw new QueueError(read.message);
    const queue: Queue =
      read.kind === 'ok' ? read.queue : { version: 1, items: [] };
    const next = change(queue);
    if (next === queue && read.kind === 'ok') return queue;
    await $.fs.write(options.file, serialize(next));
    if (options.markdown)
      await $.fs.write(options.markdown, toMarkdown(next, today()));
    const stat = await $.fs.stat(options.file);
    await show($, { kind: 'ok', queue: next, mtimeMs: stat.mtimeMs });
    return next;
  });
}

/** Clears waits on PRs gh reports merged */
async function checkPrs($: EngineInterface) {
  const snapshot = (await $.state.get(snapshotRef)).value;
  if (snapshot?.kind !== 'ok') return;
  const merged = new Set<string>();
  for (const pr of openPrs(snapshot.queue)) {
    const [repo = '', number = ''] = pr.split('#');
    const ran = await $.process.run([
      'gh', 'pr', 'view', number, '-R', repo, '--json', 'state', '-q', '.state',
    ]);
    if (ran.exitCode === 0 && ran.stdout.trim() === 'MERGED') merged.add(pr);
  }
  if (merged.size) await mutate($, queue => markMerged(queue, merged));
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

async function startItem($: EngineInterface, n: number): Promise<string> {
  const snapshot = await refresh($);
  if (snapshot.kind !== 'ok') return 'The queue file could not be read.';
  const item = snapshot.queue.items.find(one => one.n === n);
  if (!item) return `No item #${n}.`;
  // a command.run hook holds the turn a submit would wait on, so submit after it
  $.clock.after(0, () => void $.prompt.submit({
    text: `Start work-queue item #${n}. When the work begins, mark it running with the queue tool (set thread to where it runs); when it ends, mark it done with an outcome, adding any follow-ups as new items.\n\n${itemText(snapshot.queue, n, today())}`,
  }));
  return `Starting #${n}.`;
}

async function command($: EngineInterface, args: string): Promise<string> {
  const [verb = '', ...rest] = args.trim().split(/\s+/).filter(Boolean);
  const n = Number(rest[0] ?? verb);
  const text = rest.slice(1).join(' ');
  if (verb === '' || verb === 'all') {
    await $.ui.open({ id: PANE, title: TITLE });
    const snapshot = await refresh($, true);
    return snapshot.kind === 'ok' ?
        summaryText(snapshot.queue, today(), { withDone: verb === 'all' })
      : describe(snapshot);
  }
  if (/^\d+$/.test(verb)) {
    const snapshot = await refresh($);
    return snapshot.kind === 'ok' ? itemText(snapshot.queue, n, today()) : describe(snapshot);
  }
  if (!Number.isInteger(n)) return USAGE;
  if (verb === 'start') return startItem($, n);
  if (verb === 'done' || verb === 'drop') {
    const state = verb === 'done' ? 'done' : 'dropped';
    const input: ToolInput = { action: 'update', n, state, ...(text && { outcome: text }) };
    const queue = await mutate($, queue => runTool(queue, input, today()).queue ?? queue);
    return itemText(queue, n, today());
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
    const snapshot = await refresh($, true);
    if (snapshot.kind !== 'missing') poll ??= $.clock.every(POLL_MS, () => void refresh($));
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
      poll ??= $.clock.every(POLL_MS, () => void refresh($));
      if (input.action === 'list' || input.action === 'get') {
        const snapshot = await refresh($);
        if (snapshot.kind !== 'ok') return { result: describe(snapshot) };
        return { result: runTool(snapshot.queue, input, today()).text };
      }
      let text = '';
      await mutate($, queue => {
        const ran = runTool(queue, input, today());
        text = ran.text;
        return ran.queue ?? queue;
      });
      return { result: text };
    } catch (error) {
      if (error instanceof QueueError) return { result: `Error: ${error.message}` };
      throw error;
    }
  });

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e);
    const snapshot = (await $.state.get(snapshotRef)).value ?? null;
    const tab: Tab = (await $.state.get(tabRef)).value ?? 'open';
    const selected = (await $.state.get(selectedRef)).value ?? null;

    if (snapshot?.kind !== 'ok')
      return (
        <Box flexDirection="column" gap={1}>
          <Text dimColor>{snapshot ? describe(snapshot) : 'Reading the queue…'}</Text>
          <Button key="refresh" label="Refresh" hotkey="r" onPress={() => refresh($, true)} />
        </Box>
      );

    const { queue } = snapshot;
    const day = today();
    const byN = new Map(queue.items.map(item => [item.n, item]));
    const grouped = groupItems(queue, day);
    const select = (n: number | null) => $.state.set(selectedRef, n);
    const item = selected === null ? undefined : byN.get(selected);

    if (item) {
      const isOpen = item.state === 'queued';
      return (
        <Box flexDirection="column" gap={1}>
          <Box gap={1}>
            <Button key="back" label="Back" hotkey="b" onPress={() => select(null)} />
            {isOpen && (
              <Button key="start" label="Start" variant="primary" hotkey="s" onPress={() => startItem($, item.n)} />
            )}
          </Box>
          <Text wrap="wrap">{itemText(queue, item.n, day)}</Text>
        </Box>
      );
    }

    const open = OPEN_GROUPS.reduce((sum, group) => sum + grouped[group].length, 0);
    const tabs: [Tab, string][] = [
      ['open', `Open ${open}`],
      ['running', `Running ${grouped.running.length}`],
      ['done', `Done ${grouped.done.length}`],
    ];
    const groups: readonly Group[] =
      tab === 'open' ? OPEN_GROUPS : [tab === 'running' ? 'running' : 'done'];
    const row = (one: Item) => {
      const label = rowLabel(one, byN, day);
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
              onPress={() => $.state.set(tabRef, id)}
            />
          ))}
          <Button key="refresh" label="Refresh" hotkey="r" dimColor onPress={() => refresh($, true)} />
        </Box>
        {groups
          .filter(group => grouped[group].length > 0)
          .map(group => (
            <Box key={`group-${group}`} flexDirection="column">
              <Text bold color={GROUP_COLOR[group]}>
                {GROUP_TITLE[group]} <Text dimColor>{grouped[group].length}</Text>
              </Text>
              {grouped[group].map(row)}
            </Box>
          ))}
        {groups.every(group => grouped[group].length === 0) && (
          <Text dimColor>Nothing here.</Text>
        )}
      </Box>
    );
  });
};

const USAGE =
  'Usage: /queue [all | <n> | start <n> | done <n> [outcome] | drop <n> [reason]]';

function describe(snapshot: QueueSnapshot): string {
  if (snapshot.kind === 'missing')
    return 'No queue file yet. Ask Claude to add an item with the queue tool, or set the file in /config.';
  if (snapshot.kind === 'error') return `The queue file is invalid: ${snapshot.message}`;
  return '';
}
