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

/** The local calendar day, YYYY-MM-DD, as people type dates */
export const isoDay = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(part => String(part).padStart(2, '0'))
    .join('-');

/** The local day `days` before `day` (both YYYY-MM-DD) */
export function daysBefore(day: string, days: number): string {
  const [y = 0, m = 1, d = 1] = day.split('-').map(Number);
  return isoDay(new Date(y, m - 1, d - days));
}

/** A wait's identity: its kind and what it names, so edits never go by position */
const waitKey = (wait: Wait) => {
  switch (wait.kind) {
    case 'pr':
      return `pr:${wait.pr}`;
    case 'item':
      return `item:${wait.item}`;
    case 'event':
      return `event:${wait.what}`;
    case 'decision':
      return `decision:${wait.ask}`;
  }
};

const isClosed = (item: Item | undefined) =>
  item?.state === 'done' || item?.state === 'dropped';

/** The item's waits that still hold it back */
function openWaits(
  item: Item,
  byN: ReadonlyMap<number, Item>,
  today: string,
): Wait[] {
  return item.waits.filter(wait => {
    switch (wait.kind) {
      case 'pr':
        return !wait.isMerged;
      case 'item': {
        // an item no longer in the queue was archived, so it ended
        const target = byN.get(wait.item);
        return target !== undefined && !isClosed(target);
      }
      case 'event':
        return wait.after === undefined || wait.after > today;
      case 'decision':
        return true;
    }
  });
}

/** Which wait an item shows under: anything waiting on the person first */
const WAIT_PRECEDENCE: readonly Wait['kind'][] = ['decision', 'pr', 'item', 'event'];

/** Every group, in the order lists show them */
export const ALL_GROUPS: readonly Group[] = [...OPEN_GROUPS, 'running', 'done'];

export const byNumber = (queue: Queue): ReadonlyMap<number, Item> =>
  new Map(queue.items.map(item => [item.n, item]));

function groupOf(
  item: Item,
  byN: ReadonlyMap<number, Item>,
  today: string,
): Group {
  if (item.state === 'running') return 'running';
  if (isClosed(item)) return 'done';
  const kinds = new Set(openWaits(item, byN, today).map(wait => wait.kind));
  return WAIT_PRECEDENCE.find(kind => kinds.has(kind)) ?? 'ready';
}

const RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 };

/** `order` first, then priority, then oldest first */
function compare(order: readonly number[]) {
  const index = new Map(order.map((n, i) => [n, i]));
  const at = (n: number) => index.get(n) ?? Infinity;
  return (a: Item, b: Item) =>
    at(a.n) - at(b.n) ||
    RANK[a.priority ?? 'normal'] - RANK[b.priority ?? 'normal'] ||
    a.n - b.n;
}

/** Ended items, the most recent end first */
const newestEnded = (a: Item, b: Item) =>
  (b.ended ?? '').localeCompare(a.ended ?? '') || b.n - a.n;

export type Grouped = Record<Group, Item[]>;

export function groupItems(
  queue: Queue,
  today: string,
  byN = byNumber(queue),
): Grouped {
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
  for (const group of ALL_GROUPS) if (group !== 'done') grouped[group].sort(sort);
  grouped.done.sort(newestEnded);
  return grouped;
}

const short = (pr: string) => pr.slice(pr.indexOf('#'));

/** A wait as a short chip */
function waitLabel(wait: Wait): string {
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

/** The chip a row in `group` shows: the waits that put it there, its PRs, or its end */
export function rowLabel(
  item: Item,
  group: Group,
  byN: ReadonlyMap<number, Item>,
  today: string,
): string {
  switch (group) {
    case 'running':
      return item.prs?.map(short).join(' ') ?? '';
    case 'done':
      return item.ended ?? item.state;
    case 'ready':
      return item.priority === 'low' ? 'low' : '';
    default:
      return openWaits(item, byN, today)
        .filter(wait => wait.kind === group)
        .map(waitLabel)
        .join(' · ');
  }
}

/** `queue 3 ready · 6 need you · 4 wait on PRs · 5 running`, zeros left out */
export function statusText(grouped: Grouped): string {
  const { ready, decision, pr, running } = grouped;
  const parts = [
    ready.length && `${ready.length} ready`,
    decision.length && `${decision.length} need you`,
    pr.length && `${pr.length} wait on PRs`,
    running.length && `${running.length} running`,
  ].filter(Boolean);
  return `queue ${parts.length ? parts.join(' · ') : 'empty'}`;
}

/** Every open item by group, one line each: what /queue and the tool list */
export function summaryText(
  queue: Queue,
  today: string,
  { withDone = false } = {},
): string {
  const byN = byNumber(queue);
  const grouped = groupItems(queue, today, byN);
  const lines = [statusText(grouped)];
  for (const group of ALL_GROUPS) {
    const items = grouped[group];
    if (items.length === 0 || (group === 'done' && !withDone)) continue;
    lines.push('', `${GROUP_TITLE[group]} (${items.length})`);
    for (const item of items) {
      const label = rowLabel(item, group, byN, today);
      lines.push(`  #${item.n} ${item.title}${label ? ` [${label}]` : ''}`);
    }
  }
  return lines.join('\n');
}

/** One item in full */
export function itemText(queue: Queue, n: number, today: string): string {
  const byN = byNumber(queue);
  const item = byN.get(n);
  return item ? itemLines(item, byN, today).join('\n') : `No item #${n}.`;
}

function itemLines(
  item: Item,
  byN: ReadonlyMap<number, Item>,
  today: string,
): string[] {
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
    item.waits.forEach(wait =>
      lines.push(
        `  - ${wait.kind}: ${waitLabel(wait)}${open.includes(wait) ? '' : ' (cleared)'}`,
      ),
    );
  }
  if (item.notes?.length) {
    lines.push('', 'Notes:');
    for (const note of item.notes) lines.push(`  ${note.date}: ${note.text}`);
  }
  return lines;
}

/** A readable copy of the whole queue, for anyone without the plugin */
export function toMarkdown(queue: Queue, today: string): string {
  const byN = byNumber(queue);
  const grouped = groupItems(queue, today, byN);
  const lines = [
    '# Work queue',
    '',
    '<!-- Generated from the queue JSON by the work-queue plugin. Edit the JSON (or use the queue tool), not this file. -->',
    '',
    statusText(grouped),
  ];
  if (queue.rules) lines.push('', queue.rules);
  for (const group of ALL_GROUPS) {
    const items = grouped[group];
    if (items.length === 0) continue;
    lines.push('', `## ${GROUP_TITLE[group]}`);
    for (const item of items) {
      const [, ...body] = itemLines(item, byN, today);
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
      assert(Number.isInteger(w.item) && (w.item as number) > 0, `${where}: item must be an item number`);
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
  for (const key of ['repo', 'source', 'outcome'] as const)
    assert(it[key] === undefined || typeof it[key] === 'string', `${where}: ${key} must be text`);
  for (const key of ['started', 'ended'] as const)
    assert(
      it[key] === undefined || (typeof it[key] === 'string' && DATE.test(it[key])),
      `${where}: ${key} must be YYYY-MM-DD`,
    );
  const thread = it.thread as Item['thread'];
  assert(
    thread === undefined ||
      (typeof thread?.title === 'string' && (thread.url === undefined || typeof thread.url === 'string')),
    `${where}: thread must be { title, url? }`,
  );
  assert(
    it.prs === undefined ||
      (Array.isArray(it.prs) && it.prs.every(pr => typeof pr === 'string' && PR_REF.test(pr))),
    `${where}: prs must look like owner/repo#123`,
  );
  assert(
    it.notes === undefined ||
      (Array.isArray(it.notes) &&
        it.notes.every(note => DATE.test(note?.date) && typeof note?.text === 'string')),
    `${where}: notes must be { date: YYYY-MM-DD, text }`,
  );
}

/** The highest item number ever used, archived items included */
export const highestN = (queue: Queue) =>
  Math.max(queue.lastN ?? 0, ...queue.items.map(item => item.n));

/** Checks the whole queue: each item, unique numbers, waits on numbers in use */
function checkQueue(queue: Queue) {
  assert(queue && queue.version === 1, 'version must be 1');
  assert(Array.isArray(queue.items), 'items must be an array');
  assert(
    queue.order === undefined ||
      (Array.isArray(queue.order) && queue.order.every(n => Number.isInteger(n))),
    'order must be a list of item numbers',
  );
  assert(queue.rules === undefined || typeof queue.rules === 'string', 'rules must be text');
  assert(
    queue.lastN === undefined || (Number.isInteger(queue.lastN) && queue.lastN >= 0),
    'lastN must be a whole number',
  );
  const seen = new Set<number>();
  queue.items.forEach((item, i) => {
    checkItem(item, `item ${i}`);
    assert(!seen.has(item.n), `item #${item.n} appears twice`);
    seen.add(item.n);
  });
  const last = highestN(queue);
  // a number in use but not in the file was archived (or removed by hand): that wait has cleared
  for (const item of queue.items)
    for (const wait of item.waits)
      if (wait.kind === 'item') {
        assert(wait.item !== item.n, `item #${item.n} waits on itself`);
        assert(wait.item <= last, `item #${item.n} waits on #${wait.item}, which does not exist`);
      }
}

/** Refuses waits that would leave `n` waiting on itself through other open items */
function checkNoCycle(queue: Queue, n: number) {
  const byN = byNumber(queue);
  const seen = new Set<number>();
  const visit = (at: number): void => {
    const item = byN.get(at);
    if (!item || isClosed(item) || seen.has(at)) return;
    seen.add(at);
    for (const wait of item.waits)
      if (wait.kind === 'item') {
        assert(wait.item !== n, `#${n} would wait on itself through #${at}`);
        visit(wait.item);
      }
  };
  for (const wait of byN.get(n)?.waits ?? []) if (wait.kind === 'item') visit(wait.item);
}

/** Parses and checks the queue file; throws QueueError saying what is wrong */
export function parseQueue(text: string): Queue {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new QueueError(`not JSON: ${(error as Error).message}`);
  }
  checkQueue(raw as Queue);
  return raw as Queue;
}

export const serialize = (queue: Queue) => `${JSON.stringify(queue, null, 2)}\n`;

/** Open PR waits across queued items */
export function openPrs(queue: Queue): string[] {
  const prs = new Set<string>();
  for (const item of queue.items)
    if (item.state === 'queued')
      for (const wait of item.waits)
        if (wait.kind === 'pr' && !wait.isMerged) prs.add(wait.pr);
  return [...prs];
}

/**
 * Marks waits on merged PRs merged, and turns a wait on a PR closed without
 * merging into a question for the person; unchanged when none match
 */
export function settlePrs(
  queue: Queue,
  merged: ReadonlySet<string>,
  closed: ReadonlySet<string>,
): Queue {
  const settle = (w: Wait): Wait =>
    w.kind !== 'pr' || w.isMerged ? w
    : merged.has(w.pr) ? { ...w, isMerged: true }
    : closed.has(w.pr) ?
      { kind: 'decision', ask: `${w.pr} closed without merging: drop this item, or wait on another PR?` }
    : w;
  let changed = false;
  const items = queue.items.map(item => {
    // only queued items: an ended item keeps its waits as they were
    if (item.state !== 'queued') return item;
    const waits = item.waits.map(settle);
    if (waits.every((w, i) => w === item.waits[i])) return item;
    changed = true;
    return { ...item, waits };
  });
  return changed ? { ...queue, items } : queue;
}

/** Items of `ready` (the new queue's) that were not ready in `before`, as of `beforeDay` */
export function newlyReady(before: Queue, beforeDay: string, ready: readonly Item[]): Item[] {
  const byN = byNumber(before);
  return ready.filter(item => {
    const was = byN.get(item.n);
    return !was || groupOf(was, byN, beforeDay) !== 'ready';
  });
}

export const TOOL_SCHEMA = {
  type: 'object',
  required: ['action'],
  properties: {
    action: {
      enum: ['list', 'get', 'add', 'update', 'history'],
      description:
        'list: open items by group. get: one item in full, archived ones too. add: a new item (title, brief, and waits if it cannot start yet). update: change item n. history: search archived items (ended long ago) by query.',
    },
    query: {
      type: 'string',
      description: 'history: words to find in the title, brief, outcome or notes; empty for the latest',
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
    addWaits: {
      type: 'array',
      items: { $ref: '#/$defs/wait' },
      description: 'What the item waits on before it can start',
    },
    clearWaits: {
      type: 'array',
      items: { $ref: '#/$defs/wait' },
      description:
        'Waits to remove, matched by kind and the pr, item, what or ask they name (after is ignored); one already gone is skipped',
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
  archived: readonly Item[],
): { text: string; queue?: Queue } {
  const unknown = Object.keys(input).filter(key => !(key in TOOL_SCHEMA.properties));
  assert(unknown.length === 0, `unknown field ${unknown.join(', ')}; waits go in addWaits`);
  input.clearWaits?.forEach((wait, i) => checkWait(wait, `clearWaits ${i}`));
  const ran = runAction(queue, input, today, archived);
  if (ran.queue) {
    checkQueue(ran.queue);
    for (const n of newItemWaits(queue, input))
      assert(archived.some(item => item.n === n), `no item #${n} in the queue or its archive`);
    if (input.addWaits?.length) checkNoCycle(ran.queue, input.n ?? highestN(ran.queue));
  }
  return ran;
}

/** Item numbers `input` adds waits on that are not in the queue: they must be archived */
const newItemWaits = (queue: Queue, input: ToolInput) =>
  (input.addWaits ?? []).flatMap(wait =>
    wait.kind === 'item' && !queue.items.some(item => item.n === wait.item) ? [wait.item] : [],
  );

/** Whether `input` reads the archive: a history search, getting or updating an item no longer in the queue, or waiting on one */
export const needsArchive = (queue: Queue, input: ToolInput) =>
  input.action === 'history' ||
  ((input.action === 'get' || input.action === 'update') &&
    !queue.items.some(item => item.n === input.n)) ||
  newItemWaits(queue, input).length > 0;

function runAction(
  queue: Queue,
  input: ToolInput,
  today: string,
  archived: readonly Item[],
): { text: string; queue?: Queue } {
  switch (input.action) {
    case 'list':
      return { text: summaryText(queue, today, { withDone: input.withDone }) };
    case 'get': {
      assert(input.n !== undefined, 'get needs n');
      const old = queue.items.some(item => item.n === input.n) ? undefined : archived.find(item => item.n === input.n);
      return { text: old ? [...itemLines(old, new Map(), today), '(archived)'].join('\n') : itemText(queue, input.n, today) };
    }
    case 'history':
      return { text: historyText(archived, input.query ?? '') };
    case 'add': {
      assert(input.title && input.brief !== undefined, 'add needs title and brief');
      const n = highestN(queue) + 1;
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
      const target = found ?? archived.find(item => item.n === input.n);
      assert(target, `no item #${input.n}`);
      const updated = patch(target, input, today);
      const items =
        found ? queue.items.map(item => (item === found ? updated : item)) : [...queue.items, updated];
      const next = { ...queue, items };
      // an archived item reopened comes back; still closed, the write archives it again, and its later line wins
      const verb =
        found ? 'Updated'
        : isClosed(updated) ? 'Updated in the archive'
        : 'Restored from the archive';
      return { text: `${verb}:\n${itemText(next, input.n, today)}`, queue: next };
    }
    default:
      throw new QueueError('action must be list, get, add, update or history');
  }
}

function patch(item: Item, input: ToolInput, today: string): Item {
  const next: Item = { ...item };
  for (const key of ['title', 'brief', 'priority', 'repo', 'source', 'thread', 'outcome'] as const)
    if (input[key] !== undefined) (next as Record<string, unknown>)[key] = input[key];
  if (input.state !== undefined && input.state !== item.state) {
    next.state = input.state;
    if (input.state === 'running') next.started ??= today;
    if (input.state === 'done' || input.state === 'dropped') next.ended = today;
    else {
      // reopened: its old end no longer applies
      delete next.ended;
      if (input.outcome === undefined) delete next.outcome;
    }
  }
  if (input.clearWaits?.length) {
    const drop = new Set(input.clearWaits.map(waitKey));
    next.waits = next.waits.filter(wait => !drop.has(waitKey(wait)));
  }
  if (input.addWaits) next.waits = [...next.waits, ...input.addWaits];
  if (input.prs?.length)
    next.prs = [...new Set([...(item.prs ?? []), ...input.prs])];
  if (input.note) next.notes = [...(item.notes ?? []), { date: today, text: input.note }];
  checkItem(next, `item #${next.n}`);
  return next;
}


/** How many archived items history lists */
const HISTORY_LIMIT = 30;

/** Archived items matching every word of `query`, newest end first */
export function historyText(archived: readonly Item[], query: string): string {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = (item: Item) =>
    [item.title, item.brief, item.outcome ?? '', ...(item.notes ?? []).map(note => note.text)]
      .join('\n')
      .toLowerCase();
  const found = archived
    .filter(item => {
      const text = haystack(item);
      return words.every(word => text.includes(word));
    })
    .sort(newestEnded);
  if (found.length === 0) return query ? `No archived item matches "${query}".` : 'The archive is empty.';
  const lines = found
    .slice(0, HISTORY_LIMIT)
    .map(item => `  #${item.n} ${item.title} [${[item.state, item.ended].filter(Boolean).join(' ')}${item.outcome ? `: ${item.outcome}` : ''}]`);
  const more = found.length - HISTORY_LIMIT;
  return [`Archived (${found.length})`, ...lines, ...(more > 0 ? [`  …and ${more} more; narrow the query`] : [])].join('\n');
}

/**
 * Moves done and dropped items that ended before `cutoff` (YYYY-MM-DD) out of
 * the queue; ones with no end date count as old. Records the highest number
 * so it is never reused.
 */
export function prune(queue: Queue, cutoff: string): { queue: Queue; archived: Item[] } {
  const isOld = (item: Item) => isClosed(item) && (item.ended ?? '') < cutoff;
  const archived = queue.items.filter(isOld);
  if (archived.length === 0) return { queue, archived };
  const keep = queue.items.filter(item => !isOld(item));
  const gone = new Set(archived.map(item => item.n));
  const order = queue.order?.filter(n => !gone.has(n));
  return {
    queue: { ...queue, lastN: highestN(queue), ...(order && { order }), items: keep },
    archived,
  };
}

/**
 * The archive file: one item per line, added as items leave the queue; a
 * later line for the same number wins. Unreadable lines (one cut short by an
 * interrupted write) are skipped and listed, so one bad line never hides the rest.
 */
export function parseArchive(text: string): { items: Item[]; skipped: number[] } {
  const byN = new Map<number, Item>();
  const skipped: number[] = [];
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try {
      const item: unknown = JSON.parse(line);
      checkItem(item, `archive line ${i + 1}`);
      byN.set(item.n, item);
    } catch {
      skipped.push(i + 1);
    }
  });
  return { items: [...byN.values()], skipped };
}

export const archiveLines = (items: readonly Item[]) =>
  items.map(item => `${JSON.stringify(item)}\n`).join('');
