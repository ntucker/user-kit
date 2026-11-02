import type {
  Group,
  Item,
  ItemState,
  Priority,
  Queue,
  ToolInput,
  Wait,
} from '../types';

/** Groups in the order the pane and summaries list them */
export const OPEN_GROUPS: readonly Group[] = [
  'decision',
  'ready',
  'pr',
  'item',
  'event',
];

export const GROUP_TITLE: Record<Group, string> = {
  decision: 'Needs your call',
  ready: 'Ready',
  pr: 'Waiting on PRs',
  item: 'Waiting on other items',
  event: 'Waiting on events',
  running: 'Running',
  done: 'Done',
};

const STATES: readonly ItemState[] = ['queued', 'running', 'done', 'dropped'];
const PRIORITIES: readonly Priority[] = ['high', 'normal', 'low'];
const PR_REF = /^[\w.-]+\/[\w.-]+#\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const isClosed = (item: Item | undefined) =>
  item?.state === 'done' || item?.state === 'dropped';

/** The item's waits that still hold it back */
export function openWaits(
  item: Item,
  byN: ReadonlyMap<number, Item>,
  today: string,
): Wait[] {
  return item.waits.filter(wait => {
    switch (wait.kind) {
      case 'pr':
        return !wait.isMerged;
      case 'item':
        return !isClosed(byN.get(wait.item));
      case 'event':
        return wait.after === undefined || wait.after > today;
      case 'decision':
        return true;
    }
  });
}

/** Precedence: anything waiting on the person shows there first */
const WAIT_GROUP: Record<Wait['kind'], Group> = {
  decision: 'decision',
  pr: 'pr',
  item: 'item',
  event: 'event',
};

export function groupOf(
  item: Item,
  byN: ReadonlyMap<number, Item>,
  today: string,
): Group {
  if (item.state === 'running') return 'running';
  if (isClosed(item)) return 'done';
  const kinds = new Set(openWaits(item, byN, today).map(wait => wait.kind));
  for (const group of OPEN_GROUPS)
    if (group !== 'ready' && kinds.has(group as Wait['kind']))
      return WAIT_GROUP[group as Wait['kind']];
  return 'ready';
}

const RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/** `order` first, then priority, then oldest first */
function compare(order: readonly number[]) {
  const at = (n: number) => {
    const i = order.indexOf(n);
    return i === -1 ? Infinity : i;
  };
  return (a: Item, b: Item) =>
    at(a.n) - at(b.n) ||
    RANK[a.priority ?? 'normal'] - RANK[b.priority ?? 'normal'] ||
    a.n - b.n;
}

export type Grouped = Record<Group, Item[]>;

export function groupItems(queue: Queue, today: string): Grouped {
  const byN = new Map(queue.items.map(item => [item.n, item]));
  const grouped: Grouped = {
    decision: [],
    ready: [],
    pr: [],
    item: [],
    event: [],
    running: [],
    done: [],
  };
  for (const item of queue.items)
    grouped[groupOf(item, byN, today)].push(item);
  const sort = compare(queue.order ?? []);
  for (const list of Object.values(grouped)) list.sort(sort);
  // newest first
  grouped.done.sort((a, b) =>
    (b.ended ?? '').localeCompare(a.ended ?? '') || b.n - a.n,
  );
  return grouped;
}

const short = (pr: string) => pr.slice(pr.indexOf('#'));

/** A wait as a short chip */
export function waitLabel(wait: Wait): string {
  switch (wait.kind) {
    case 'pr':
      return short(wait.pr);
    case 'item':
      return `after #${wait.item}`;
    case 'event':
      return wait.after ? `${wait.what} (${wait.after})` : wait.what;
    case 'decision':
      return wait.ask;
  }
}

/** The chip a row shows: its open waits, or its priority when ready */
export function rowLabel(item: Item, byN: ReadonlyMap<number, Item>, today: string) {
  const open = openWaits(item, byN, today);
  if (item.state === 'running') return item.prs?.map(short).join(' ') ?? '';
  if (isClosed(item)) return item.ended ?? item.state;
  if (open.length === 0) return item.priority === 'low' ? 'low' : '';
  const group = groupOf(item, byN, today);
  return open
    .filter(wait => WAIT_GROUP[wait.kind] === group)
    .map(waitLabel)
    .join(' · ');
}

export function counts(grouped: Grouped) {
  return Object.fromEntries(
    Object.entries(grouped).map(([group, items]) => [group, items.length]),
  ) as Record<Group, number>;
}

/** `queue 3 ready · 6 need you · 4 wait on PRs · 5 running`, zeros left out */
export function statusText(grouped: Grouped): string {
  const c = counts(grouped);
  const parts = [
    c.ready && `${c.ready} ready`,
    c.decision && `${c.decision} need you`,
    c.pr && `${c.pr} wait on PRs`,
    c.running && `${c.running} running`,
  ].filter(Boolean);
  return `queue ${parts.length ? parts.join(' · ') : 'empty'}`;
}

/** Every open item by group, one line each: what /queue and the tool list */
export function summaryText(
  queue: Queue,
  today: string,
  { withDone = false } = {},
): string {
  const grouped = groupItems(queue, today);
  const byN = new Map(queue.items.map(item => [item.n, item]));
  const groups: Group[] = [
    ...OPEN_GROUPS,
    'running',
    ...(withDone ? (['done'] as const) : []),
  ];
  const lines = [statusText(grouped)];
  for (const group of groups) {
    const items = grouped[group];
    if (items.length === 0) continue;
    lines.push('', `${GROUP_TITLE[group]} (${items.length})`);
    for (const item of items) {
      const label = rowLabel(item, byN, today);
      lines.push(`  #${item.n} ${item.title}${label ? ` [${label}]` : ''}`);
    }
  }
  return lines.join('\n');
}

/** One item in full */
export function itemText(queue: Queue, n: number, today: string): string {
  const item = queue.items.find(one => one.n === n);
  if (!item) return `No item #${n}.`;
  const byN = new Map(queue.items.map(one => [one.n, one]));
  const open = openWaits(item, byN, today);
  const lines = [
    `#${item.n} ${item.title}`,
    `State: ${item.state} (${GROUP_TITLE[groupOf(item, byN, today)]})`,
  ];
  if (item.priority && item.priority !== 'normal')
    lines.push(`Priority: ${item.priority}`);
  if (item.repo) lines.push(`Repo: ${item.repo}`);
  if (item.source) lines.push(`Source: ${item.source}`);
  if (item.thread)
    lines.push(
      `Thread: ${item.thread.title}${item.thread.url ? ` (${item.thread.url})` : ''}`,
    );
  if (item.prs?.length) lines.push(`PRs: ${item.prs.join(', ')}`);
  if (item.started) lines.push(`Started: ${item.started}`);
  if (item.ended)
    lines.push(`Ended: ${item.ended}${item.outcome ? `: ${item.outcome}` : ''}`);
  lines.push('', item.brief);
  if (item.waits.length) {
    lines.push('', 'Waits on:');
    item.waits.forEach((wait, i) =>
      lines.push(
        `  ${i}. ${wait.kind}: ${waitLabel(wait)}${open.includes(wait) ? '' : ' (cleared)'}`,
      ),
    );
  }
  if (item.notes?.length) {
    lines.push('', 'Notes:');
    for (const note of item.notes) lines.push(`  ${note.date}: ${note.text}`);
  }
  return lines.join('\n');
}

/** A readable copy of the whole queue, for anyone without the plugin */
export function toMarkdown(queue: Queue, today: string): string {
  const grouped = groupItems(queue, today);
  const lines = [
    '# Work queue',
    '',
    '<!-- Generated from the queue JSON by the work-queue plugin. Edit the JSON (or use the queue tool), not this file. -->',
    '',
    statusText(grouped),
  ];
  if (queue.rules) lines.push('', queue.rules);
  for (const group of [...OPEN_GROUPS, 'running', 'done'] as const) {
    const items = grouped[group];
    if (items.length === 0) continue;
    lines.push('', `## ${GROUP_TITLE[group]}`);
    for (const item of items) {
      const [, ...body] = itemText(queue, item.n, today).split('\n');
      lines.push('', `### ${item.n}. ${item.title}`, '', ...body);
    }
  }
  return `${lines.join('\n')}\n`;
}

export class QueueError extends Error {}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new QueueError(message);
}

function checkWait(wait: unknown, where: string): asserts wait is Wait {
  const w = wait as Record<string, unknown>;
  assert(w && typeof w === 'object', `${where}: a wait must be an object`);
  switch (w.kind) {
    case 'pr':
      assert(
        typeof w.pr === 'string' && PR_REF.test(w.pr),
        `${where}: pr must look like owner/repo#123`,
      );
      return;
    case 'item':
      assert(Number.isInteger(w.item), `${where}: item must be a number`);
      return;
    case 'event':
      assert(typeof w.what === 'string' && w.what, `${where}: event needs what`);
      assert(
        w.after === undefined || (typeof w.after === 'string' && DATE.test(w.after)),
        `${where}: after must be YYYY-MM-DD`,
      );
      return;
    case 'decision':
      assert(typeof w.ask === 'string' && w.ask, `${where}: decision needs ask`);
      return;
    default:
      throw new QueueError(
        `${where}: kind must be pr, item, event or decision`,
      );
  }
}

function checkItem(item: unknown, where: string): asserts item is Item {
  const it = item as Record<string, unknown>;
  assert(it && typeof it === 'object', `${where}: must be an object`);
  assert(Number.isInteger(it.n) && (it.n as number) > 0, `${where}: n must be a positive integer`);
  assert(typeof it.title === 'string' && it.title, `${where}: title is required`);
  assert(typeof it.brief === 'string', `${where}: brief is required`);
  assert(STATES.includes(it.state as ItemState), `${where}: state must be ${STATES.join(', ')}`);
  assert(
    it.priority === undefined || PRIORITIES.includes(it.priority as Priority),
    `${where}: priority must be ${PRIORITIES.join(', ')}`,
  );
  assert(Array.isArray(it.waits), `${where}: waits must be an array`);
  it.waits.forEach((wait, i) => checkWait(wait, `${where} wait ${i}`));
}

/** Parses and checks the queue file; throws QueueError saying what is wrong */
export function parseQueue(text: string): Queue {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new QueueError(`not JSON: ${(error as Error).message}`);
  }
  const queue = raw as Queue;
  assert(queue && queue.version === 1, 'version must be 1');
  assert(Array.isArray(queue.items), 'items must be an array');
  const seen = new Set<number>();
  queue.items.forEach((item, i) => {
    checkItem(item, `item ${i}`);
    assert(!seen.has(item.n), `item #${item.n} appears twice`);
    seen.add(item.n);
  });
  return queue;
}

export const serialize = (queue: Queue) => `${JSON.stringify(queue, null, 2)}\n`;

/** Open PR waits across the queue */
export function openPrs(queue: Queue): string[] {
  const prs = new Set<string>();
  for (const item of queue.items)
    if (item.state === 'queued')
      for (const wait of item.waits)
        if (wait.kind === 'pr' && !wait.isMerged) prs.add(wait.pr);
  return [...prs];
}

/** Marks waits on these PRs merged; returns the queue unchanged when none match */
export function markMerged(queue: Queue, merged: ReadonlySet<string>): Queue {
  let changed = false;
  const items = queue.items.map(item => {
    if (!item.waits.some(w => w.kind === 'pr' && !w.isMerged && merged.has(w.pr)))
      return item;
    changed = true;
    return {
      ...item,
      waits: item.waits.map(w =>
        w.kind === 'pr' && merged.has(w.pr) ? { ...w, isMerged: true } : w,
      ),
    };
  });
  return changed ? { ...queue, items } : queue;
}

/** Items that were not ready before and are now: worth a toast */
export function newlyReady(before: Queue, after: Queue, today: string): Item[] {
  const was = new Set(groupItems(before, today).ready.map(item => item.n));
  return groupItems(after, today).ready.filter(item => !was.has(item.n));
}

export const TOOL_SCHEMA = {
  type: 'object',
  required: ['action'],
  properties: {
    action: {
      enum: ['list', 'get', 'add', 'update'],
      description:
        'list: open items by group. get: one item in full. add: a new item (title, brief, and waits if it cannot start yet). update: change item n.',
    },
    n: { type: 'integer', description: 'The item, for get and update' },
    withDone: { type: 'boolean', description: 'list: include done items' },
    title: { type: 'string' },
    brief: {
      type: 'string',
      description: 'Self-contained: enough for someone with no context to start the work',
    },
    state: {
      enum: STATES,
      description:
        'running when work starts (set thread too), done or dropped when it ends (set outcome)',
    },
    priority: { enum: PRIORITIES },
    repo: { type: 'string' },
    source: { type: 'string', description: 'Where the item came from' },
    waits: {
      type: 'array',
      description: 'Replaces every wait. Prefer addWaits/clearWaits.',
      items: { $ref: '#/$defs/wait' },
    },
    addWaits: { type: 'array', items: { $ref: '#/$defs/wait' } },
    clearWaits: {
      type: 'array',
      items: { type: 'integer' },
      description: 'Indexes of waits to remove, as get numbers them',
    },
    thread: {
      type: 'object',
      required: ['title'],
      properties: { title: { type: 'string' }, url: { type: 'string' } },
    },
    prs: {
      type: 'array',
      items: { type: 'string' },
      description: 'PRs to add, owner/repo#123',
    },
    note: { type: 'string', description: 'A dated note to append' },
    outcome: { type: 'string', description: 'How a done or dropped item ended' },
  },
  $defs: {
    wait: {
      type: 'object',
      required: ['kind'],
      description:
        'pr {pr: "owner/repo#123"} clears when it merges; decision {ask} waits on the person; item {item: n} clears when that item ends; event {what, after?: "YYYY-MM-DD"} clears on that date, or when removed',
      properties: {
        kind: { enum: ['pr', 'decision', 'item', 'event'] },
        pr: { type: 'string' },
        ask: { type: 'string' },
        item: { type: 'integer' },
        what: { type: 'string' },
        after: { type: 'string' },
      },
    },
  },
} as const;

/**
 * Runs one tool call against the queue: the text to answer, and the new queue
 * when it changed. Throws QueueError for a bad call.
 */
export function runTool(
  queue: Queue,
  input: ToolInput,
  today: string,
): { text: string; queue?: Queue } {
  switch (input.action) {
    case 'list':
      return { text: summaryText(queue, today, { withDone: input.withDone }) };
    case 'get':
      assert(input.n !== undefined, 'get needs n');
      return { text: itemText(queue, input.n, today) };
    case 'add': {
      assert(input.title && input.brief !== undefined, 'add needs title and brief');
      const n = Math.max(0, ...queue.items.map(item => item.n)) + 1;
      const item = patch(
        { n, title: input.title, brief: input.brief, state: 'queued', waits: [] },
        input,
        today,
      );
      const next = { ...queue, items: [...queue.items, item] };
      return { text: `Added:\n${itemText(next, n, today)}`, queue: next };
    }
    case 'update': {
      assert(input.n !== undefined, 'update needs n');
      const found = queue.items.find(item => item.n === input.n);
      assert(found, `no item #${input.n}`);
      const updated = patch(found, input, today);
      const next = {
        ...queue,
        items: queue.items.map(item => (item === found ? updated : item)),
      };
      return { text: `Updated:\n${itemText(next, input.n, today)}`, queue: next };
    }
    default:
      throw new QueueError('action must be list, get, add or update');
  }
}

function patch(item: Item, input: ToolInput, today: string): Item {
  const next: Item = { ...item };
  for (const key of ['title', 'brief', 'priority', 'repo', 'source', 'thread', 'outcome'] as const)
    if (input[key] !== undefined) (next as Record<string, unknown>)[key] = input[key];
  if (input.state !== undefined && input.state !== item.state) {
    assert(STATES.includes(input.state), `state must be ${STATES.join(', ')}`);
    next.state = input.state;
    if (input.state === 'running') next.started ??= today;
    if (input.state === 'done' || input.state === 'dropped') next.ended = today;
    if (input.state === 'queued') delete next.ended;
  }
  if (input.waits) next.waits = [...input.waits];
  if (input.clearWaits?.length) {
    const drop = new Set(input.clearWaits);
    next.waits = next.waits.filter((_, i) => !drop.has(i));
  }
  if (input.addWaits) next.waits = [...next.waits, ...input.addWaits];
  if (input.prs?.length)
    next.prs = [...new Set([...(item.prs ?? []), ...input.prs])];
  if (input.note) next.notes = [...(item.notes ?? []), { date: today, text: input.note }];
  checkItem(next, `item #${next.n}`);
  return next;
}
