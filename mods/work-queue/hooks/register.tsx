import { atom, read, update } from 'claude-code';
import type { EngineInterface, Register, Timer } from 'claude-code';

import type { Group, Item, Queue, QueueSnapshot, Tab, ToolInput } from '../types';
import {
  ALL_GROUPS,
  GROUP_TITLE,
  OPEN_GROUPS,
  QueueError,
  archiveLines,
  byNumber,
  daysBefore,
  groupItems,
  highestN,
  needsArchive,
  parseArchive,
  prune,
  isoDay,
  itemText,
  settlePrs,
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

const ARGS = '[all | <n> | start <n> | done <n> [outcome] | drop <n> [reason] | history [words]]';
const USAGE = `Usage: /queue ${ARGS}`;
const FINISH = { done: 'done', drop: 'dropped' } as const;

const DEFAULT_ARCHIVE_DAYS = 14;
const UNREADABLE = 'could not be read: ';

type Options = {
  file: string;
  markdown: string;
  checkPrs: boolean;
  archive: string;
  archiveAfterDays: number;
};

let options: Options = {
  file: 'work-queue.json',
  markdown: '',
  checkPrs: true,
  archive: '',
  archiveAfterDays: DEFAULT_ARCHIVE_DAYS,
};

/** The archive file: the option, or the queue file's name with .archive.jsonl */
const archivePath = () => options.archive || options.file.replace(/(\.json)?$/, '.archive.jsonl');
let poll: Timer | undefined;
/** The day the status line was last worked out for: event waits clear by date */
let shownDay: string | undefined;
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
  const stat = await $.fs.stat(options.file).catch(async error => {
    // only a file that is not there counts as missing: any other error must not look like an empty queue
    if (await $.fs.exists(options.file)) throw error;
    return undefined;
  });
  return stat?.mtimeMs;
}

/** A file's text, or undefined while it does not exist */
const readIfExists = async ($: EngineInterface, path: string) =>
  (await $.fs.exists(path)) ? $.fs.read(path) : undefined;

/** The file as a snapshot, with the text it was read from; a failed read is an error snapshot */
async function load($: EngineInterface): Promise<{ snapshot: QueueSnapshot; text?: string }> {
  let mtimeMs: number | undefined;
  let text: string;
  try {
    mtimeMs = await mtimeOf($);
    if (mtimeMs === undefined) return { snapshot: { kind: 'missing' } };
    text = await $.fs.read(options.file);
  } catch (error) {
    return { snapshot: { kind: 'error', message: `${UNREADABLE}${(error as Error).message}` } };
  }
  try {
    return { snapshot: { kind: 'ok', queue: parseQueue(text), mtimeMs }, text };
  } catch (error) {
    return { snapshot: { kind: 'error', message: (error as Error).message }, text };
  }
}

async function readFile($: EngineInterface): Promise<QueueSnapshot> {
  return (await load($)).snapshot;
}

const readArchive = async ($: EngineInterface) =>
  parseArchive((await readIfExists($, archivePath())) ?? '');

const sameSnapshot = (a: QueueSnapshot | null, b: QueueSnapshot) =>
  a !== null &&
  (a.kind === 'ok' ? b.kind === 'ok' && a.mtimeMs === b.mtimeMs
  : a.kind === 'error' ? b.kind === 'error' && a.message === b.message
  : b.kind === 'missing');

/** Shows a new snapshot: state, status line, toasts for newly ready items */
async function show($: EngineInterface, next: QueueSnapshot) {
  const previous = await read($, snapshotAtom);
  await update($, snapshotAtom, () => next);
  if (next.kind !== 'ok') {
    $.ui.status(next.kind === 'error' ? 'queue file unreadable (/queue)' : undefined);
    syncPrPoll($, next);
    return;
  }
  const day = await today($);
  const dayBefore = shownDay ?? day;
  shownDay = day;
  const grouped = groupItems(next.queue, day);
  $.ui.status(statusText(grouped));
  if (previous?.kind === 'ok')
    for (const item of newlyReady(previous.queue, dayBefore, grouped.ready))
      $.ui.toast(`Queue #${item.n} is ready: ${item.title}`);
  syncPrPoll($, next);
}

/** Re-reads the file when it changed since the last read, and redraws on a new day */
function refresh($: EngineInterface, force = false): Promise<QueueSnapshot> {
  return serial(async () => {
    const current = await read($, snapshotAtom);
    if (!force && current?.kind === 'ok' && (await mtimeOf($)) === current.mtimeMs) {
      if ((await today($)) !== shownDay) await show($, current);
      return current;
    }
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

/** Tries before giving up when other sessions keep changing the file */
const WRITE_TRIES = 3;

/**
 * Runs a tool input against the file as it is now, so others' edits survive.
 * A read answers from it (redrawing the pane if it was behind); a change is
 * written back unless another session wrote in between, in which case it runs
 * again on theirs. Throws QueueError for a bad input, or when the file keeps
 * changing.
 */
function apply($: EngineInterface, input: ToolInput): Promise<string> {
  return serial(async () => {
    const day = await today($);
    for (let tries = 1; tries <= WRITE_TRIES; tries++) {
      const { snapshot: onDisk, text } = await load($);
      if (onDisk.kind === 'error') throw new QueueError(describe(onDisk));
      const isMissing = onDisk.kind === 'missing';
      const empty: Queue = { version: 1, items: [] };
      const archive =
        isMissing || needsArchive(onDisk.queue, input) ? await readArchive($) : parseArchive('');
      // a new file still numbers past the archive
      const queue: Queue =
        isMissing ? { ...empty, lastN: highestN({ ...empty, items: archive.items }) } : onDisk.queue;
      const ran = runTool(queue, input, day, archive.items);
      if (archive.skipped.length)
        ran.text += `\n(skipped unreadable archive lines: ${archive.skipped.join(', ')})`;
      // only a change can start a missing file
      if (isMissing && !ran.queue) throw new QueueError(describe(onDisk));
      if (!ran.queue) {
        if (!sameSnapshot(await read($, snapshotAtom), onDisk)) await show($, onDisk);
        return ran.text;
      }
      // by content: a synced folder's mtimes can be coarse or carried over
      if ((await readIfExists($, options.file)) === text) {
        await write($, ran.queue, day);
        return ran.text;
      }
    }
    throw new QueueError('the queue file kept changing while this ran; try again');
  });
}

/**
 * Writes the queue, first moving items that ended over archiveAfterDays ago
 * to the archive; an item in both (a write cut short) is shown from the queue
 */
async function write($: EngineInterface, full: Queue, day: string) {
  const { queue, archived } =
    options.archiveAfterDays > 0 ?
      prune(full, daysBefore(day, options.archiveAfterDays))
    : { queue: full, archived: [] };
  if (archived.length) await addToArchive($, archived);
  await $.fs.write(options.file, serialize(queue));
  if (options.markdown) await $.fs.write(options.markdown, toMarkdown(queue, day));
  await show($, { kind: 'ok', queue, mtimeMs: (await mtimeOf($)) ?? 0 });
}

/**
 * Adds items to the end of the archive, then reads it back: another session
 * writing it at the same moment could have replaced the file without them
 */
async function addToArchive($: EngineInterface, items: readonly Item[]) {
  const added = archiveLines(items);
  for (let tries = 1; tries <= WRITE_TRIES; tries++) {
    const before = (await readIfExists($, archivePath())) ?? '';
    // a last line cut short must not swallow the first new one
    const joined = before && !before.endsWith('\n') ? `${before}\n` : before;
    await $.fs.write(archivePath(), joined + added);
    if ((await $.fs.read(archivePath())).includes(added)) return;
  }
  throw new QueueError('the archive kept changing while items moved to it; try again');
}

/** Settles waits on PRs gh reports merged, or closed without merging */
async function checkPrs($: EngineInterface) {
  const snapshot = await read($, snapshotAtom);
  if (snapshot?.kind !== 'ok') return;
  const states = await Promise.all(
    openPrs(snapshot.queue).map(async pr => {
      const [repo = '', number = ''] = pr.split('#');
      const ran = await $.process.run([
        'gh', 'pr', 'view', number, '-R', repo, '--json', 'state', '-q', '.state',
      ]);
      return [pr, ran.exitCode === 0 ? ran.stdout.trim() : ''] as const;
    }),
  );
  const withState = (state: string) =>
    new Set(states.filter(([, s]) => s === state).map(([pr]) => pr));
  const merged = withState('MERGED');
  const closed = withState('CLOSED');
  if (merged.size + closed.size === 0) return;
  await serial(async () => {
    const onDisk = await readFile($);
    if (onDisk.kind !== 'ok') return;
    const next = settlePrs(onDisk.queue, merged, closed);
    if (next !== onDisk.queue) await write($, next, await today($));
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
  const queue = await currentQueue($);
  const item = byNumber(queue).get(n);
  if (!item) return `No item #${n}.`;
  if (item.state !== 'queued') return `#${n} is ${item.state}; only a queued item can start.`;
  const text = itemText(queue, n, await today($));
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
  if (/^\d+$/.test(verb)) return apply($, { action: 'get', n: Number(verb) });
  if (verb === 'history') return apply($, { action: 'history', query: [arg, ...rest].join(' ') });
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
  const raw = rawOptions as unknown as Options;
  const days = Math.floor(Number(raw.archiveAfterDays));
  options = { ...raw, archiveAfterDays: Number.isFinite(days) && days >= 0 ? days : DEFAULT_ARCHIVE_DAYS };

  on('session.start', async ($, e, next) => {
    await Promise.all([
      $.command.register({
        name: 'queue',
        description: 'Show the work queue, or start, finish or drop an item',
        argumentHint: ARGS,
      }),
      $.tool.register({
        name: 'queue',
        description: `The shared work queue (${options.file}): numbered items with a self-contained brief, a state (queued, running, done, dropped) and what each waits on (a PR, the person's decision, another item, an event). list shows open items grouped by what they wait on; get shows one; add and update change the file; history searches items archived after they ended. Use it instead of editing the queue file by hand. Mark an item running when work on it starts and done (with an outcome) when it ends; record new follow-ups with add.`,
        inputSchema: TOOL_SCHEMA as unknown as Record<string, unknown>,
        isDeferred: false,
      }),
    ]);
    // load turns a failed read into an error snapshot; what is left to drop is a stat failing between polls
    poll ??= $.clock.every(POLL_MS, () => void refresh($).catch(() => undefined));
    void refresh($, true).catch(() => undefined);
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
      return { result: await apply($, input) };
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
    : snapshot.message.startsWith(UNREADABLE) ? `The queue file ${snapshot.message}`
    : `The queue file is invalid: ${snapshot.message}`;
}
