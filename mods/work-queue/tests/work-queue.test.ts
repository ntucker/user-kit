import type { On } from 'claude-code';
import { describe, expect, mock, test } from 'claude-code/testing';

import type { Item, Queue } from '../types';
import {
  QueueError,
  groupItems,
  parseQueue,
  runTool,
  statusText,
  summaryText,
  toMarkdown,
} from '../hooks/queue';

const TODAY = '2026-11-02';
const FILE = 'work-queue.json';
const TOOL = 'mcp__work-queue__queue';

const item = (n: number, rest: Partial<Item> = {}): Item => ({
  n,
  title: `Item ${n}`,
  brief: `Do thing ${n}`,
  state: 'queued',
  waits: [],
  ...rest,
});

const QUEUE: Queue = {
  version: 1,
  order: [3],
  items: [
    item(1, { title: 'Ready low', priority: 'low' }),
    item(2, { waits: [{ kind: 'decision', ask: 'Pick a or b?' }] }),
    item(3, { title: 'Ready ordered' }),
    item(4, { waits: [{ kind: 'pr', pr: 'reactive/data-client#4349' }] }),
    item(5, { waits: [{ kind: 'item', item: 6 }] }),
    item(6, { state: 'running', thread: { title: 'Six' } }),
    item(7, { waits: [{ kind: 'event', what: 'Sunday run', after: '2026-11-08' }] }),
    item(8, { waits: [{ kind: 'event', what: 'Past date', after: '2026-11-01' }] }),
    item(9, { state: 'done', ended: '2026-11-01', outcome: 'PR merged' }),
    item(10, {
      waits: [
        { kind: 'pr', pr: 'reactive/data-client#4359', isMerged: true },
        { kind: 'item', item: 9 },
      ],
    }),
    item(11, {
      waits: [
        { kind: 'pr', pr: 'reactive/data-client#4359' },
        { kind: 'decision', ask: 'Is it final?' },
      ],
    }),
  ],
};

const ns = (items: Item[]) => items.map(one => one.n);

describe('grouping', () => {
  test('sorts each item by what still holds it back', async () => {
    const grouped = groupItems(QUEUE, TODAY);
    // `order` first, then priority (low last), then number
    expect(ns(grouped.ready)).toEqual([3, 8, 10, 1]);
    // a decision outranks the PR it also waits on
    expect(ns(grouped.decision)).toEqual([2, 11]);
    expect(ns(grouped.pr)).toEqual([4]);
    expect(ns(grouped.item)).toEqual([5]);
    expect(ns(grouped.event)).toEqual([7]);
    expect(ns(grouped.running)).toEqual([6]);
    expect(ns(grouped.done)).toEqual([9]);
  });

  test('counts in the status line leave zeros out', async () => {
    expect(statusText(groupItems(QUEUE, TODAY))).toBe(
      'queue 4 ready · 2 need you · 1 wait on PRs · 1 running',
    );
    expect(statusText(groupItems({ version: 1, items: [] }, TODAY))).toBe(
      'queue empty',
    );
  });

  test('summary lists open items with their waits', async () => {
    const text = summaryText(QUEUE, TODAY);
    expect(text).toContain('Needs your call (2)\n  #2 Item 2 [Pick a or b?]');
    expect(text).toContain('#4 Item 4 [#4349]');
    expect(text).toContain('#7 Item 7 [Sunday run (2026-11-08)]');
    expect(text).not.toContain('#9');
    expect(summaryText(QUEUE, TODAY, { withDone: true })).toContain(
      '#9 Item 9 [2026-11-01]',
    );
  });

  test('markdown copy has every item under its group', async () => {
    const md = toMarkdown(QUEUE, TODAY);
    expect(md).toContain('## Needs your call\n\n### 2. Item 2');
    expect(md).toContain('### 9. Item 9');
    expect(md).toContain('Ended: 2026-11-01: PR merged');
  });
});

describe('queue tool logic', () => {
  test('add numbers past the highest item', async () => {
    const ran = runTool(QUEUE, { action: 'add', title: 'New', brief: 'B' }, TODAY);
    expect(ran.queue?.items.at(-1)).toEqual(item(12, { title: 'New', brief: 'B' }));
  });

  test('update stamps start and end dates and edits waits', async () => {
    const started = runTool(QUEUE, { action: 'update', n: 4, state: 'running', thread: { title: 'T' } }, TODAY);
    const four = started.queue?.items.find(one => one.n === 4);
    expect(four?.started).toBe(TODAY);
    expect(four?.thread).toEqual({ title: 'T' });

    const done = runTool(QUEUE, { action: 'update', n: 6, state: 'done', outcome: 'Merged #1' }, TODAY);
    // item 5 waited on item 6 and is now ready
    expect(ns(groupItems(done.queue!, TODAY).ready)).toContain(5);

    const edited = runTool(
      QUEUE,
      { action: 'update', n: 11, clearWaits: [1], addWaits: [{ kind: 'item', item: 2 }], note: 'asked' },
      TODAY,
    );
    const eleven = edited.queue?.items.find(one => one.n === 11);
    expect(eleven?.waits).toEqual([
      { kind: 'pr', pr: 'reactive/data-client#4359' },
      { kind: 'item', item: 2 },
    ]);
    expect(eleven?.notes).toEqual([{ date: TODAY, text: 'asked' }]);
  });

  test('refuses bad input with a reason', async () => {
    expect(() =>
      runTool(QUEUE, { action: 'update', n: 1, addWaits: [{ kind: 'pr', pr: '4349' }] }, TODAY),
    ).toThrow(QueueError);
    expect(() => runTool(QUEUE, { action: 'update', n: 99 }, TODAY)).toThrow('no item #99');
    expect(() => parseQueue('{"version":1,"items":[{"n":1,"title":"a","brief":"","state":"open","waits":[]}]}')).toThrow(
      'state must be',
    );
    expect(() => parseQueue(JSON.stringify({ version: 1, items: [item(1), item(1)] }))).toThrow('appears twice');
  });
});

/** An in-memory file system; `files` and `mtime` are the host's */
async function fakeFs(on: On, initial?: Queue) {
  const clock = mock.clock(on);
  // midday on TODAY
  await clock.set(Date.parse(`${TODAY}T12:00:00Z`));
  const name = (path: string) => path.split('/').pop()!;
  const files = new Map<string, string>();
  const mtime = new Map<string, number>();
  let tick = 1;
  const put = (path: string, text: string) => {
    files.set(path, text);
    mtime.set(path, tick++);
  };
  if (initial) put(FILE, JSON.stringify(initial));
  on('fs.exists', async ($, e) => ({ value: files.has(name(e.path)) }));
  on('fs.read', async ($, e) => {
    const text = files.get(name(e.path));
    if (text === undefined) throw new Error('ENOENT');
    return { value: text };
  });
  on('fs.write', async ($, e) => {
    put(name(e.path), e.text);
    return { value: undefined };
  });
  on('fs.stat', async ($, e) => {
    const text = files.get(name(e.path));
    if (text === undefined) throw new Error('ENOENT');
    return { value: { kind: 'file', size: text.length, mtimeMs: mtime.get(name(e.path))!, isLink: false } };
  });
  return { clock, files, put, read: () => parseQueue(files.get(FILE)!) };
}

/** gh answers MERGED for the PRs in `merged` */
function fakeGh(on: On, merged: Set<string>) {
  const calls: string[][] = [];
  on('process.run', async ($, e) => {
    calls.push([...e.argv]);
    const pr = `${e.argv[5]}#${e.argv[3]}`;
    return {
      value: {
        exitCode: 0,
        stdout: merged.has(pr) ? 'MERGED\n' : 'OPEN\n',
        stderr: '',
        isStdoutTruncated: false,
        isStderrTruncated: false,
      },
    };
  });
  return calls;
}

function capture(on: On) {
  const toasts: string[] = [];
  const prompts: string[] = [];
  const status: (string | undefined)[] = [];
  on('ui.toast', ($, e) => {
    toasts.push(e.text);
    return { value: undefined };
  });
  on('ui.status', ($, e) => {
    status.push(e.text);
    return { value: undefined };
  });
  on('prompt.submit', ($, e) => {
    prompts.push(e.text);
    return { text: e.text };
  });
  on('ui.open', () => ({ value: { isPlaced: true } }));
  return { toasts, prompts, status };
}

const queueTool = ($: any, input: object) =>
  $.tool.call({ tool: TOOL, ...input }).then((ran: { result: unknown }) => String(ran.result));

const run = ($: any, args: string) =>
  $.command.run({
    command: 'queue',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  });

const PANE = {
  plugin: 'work-queue',
  component: 'Pane',
  requestId: 'work-queue',
  props: {
    title: 'Work queue',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 40 },
    view: {},
  },
} as const;

describe('the plugin', () => {
  test('the tool adds to a missing file and writes it', async ($, on) => {
    const fs = await fakeFs(on);
    capture(on);
    const text = await queueTool($, {
      action: 'add',
      title: 'First',
      brief: 'Start here',
      addWaits: [{ kind: 'decision', ask: 'Go?' }],
    });
    expect(text).toContain('#1 First');
    expect(fs.read().items).toEqual([
      item(1, { title: 'First', brief: 'Start here', waits: [{ kind: 'decision', ask: 'Go?' }] }),
    ]);
  });

  test('writes a markdown copy when configured', { options: { markdown: 'queue.md' } }, async ($, on) => {
    const fs = await fakeFs(on, QUEUE);
    capture(on);
    await queueTool($, { action: 'update', n: 2, clearWaits: [0] });
    expect(fs.files.get('queue.md')).toContain('# Work queue');
    expect(fs.files.get('queue.md')).toContain('### 2. Item 2');
  });

  test('keeps edits made by others since the last read', async ($, on) => {
    const fs = await fakeFs(on, QUEUE);
    capture(on);
    await queueTool($, { action: 'list' });
    // another session adds an item
    fs.put(FILE, JSON.stringify({ ...QUEUE, items: [...QUEUE.items, item(20)] }));
    await queueTool($, { action: 'update', n: 1, state: 'running' });
    const ns20 = fs.read().items.map(one => one.n);
    expect(ns20).toContain(20);
    expect(fs.read().items.find(one => one.n === 1)?.state).toBe('running');
  });

  test('a bad call answers with the reason and leaves the file alone', async ($, on) => {
    const fs = await fakeFs(on, QUEUE);
    capture(on);
    const before = fs.files.get(FILE);
    expect(await queueTool($, { action: 'update', n: 99 })).toBe('Error: no item #99');
    expect(fs.files.get(FILE)).toBe(before);
  });

  test('says when the file is invalid', async ($, on) => {
    const fs = await fakeFs(on);
    fs.put(FILE, '{ nope');
    capture(on);
    expect(await queueTool($, { action: 'list' })).toContain('The queue file is invalid: not JSON');
  });

  test('/queue shows the summary; done and drop finish items', async ($, on) => {
    const fs = await fakeFs(on, QUEUE);
    capture(on);
    expect((await run($, '')).text).toContain('Ready (4)');
    expect((await run($, '4')).text).toContain('#4 Item 4');
    expect((await run($, 'done 6 PR #4600 merged')).text).toContain(`Ended: ${TODAY}: PR #4600 merged`);
    await run($, 'drop 7');
    expect(fs.read().items.find(one => one.n === 7)?.state).toBe('dropped');
    expect((await run($, 'start')).text).toContain('Usage');
  });

  test('/queue start asks Claude to start the item', async ($, on) => {
    const { clock } = await fakeFs(on, QUEUE);
    const { prompts } = capture(on);
    expect((await run($, 'start 3')).text).toBe('Starting #3.');
    await clock.advance(1);
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('Start work-queue item #3');
    expect(prompts[0]).toContain('Do thing 3');
  });

  test('clears merged PR waits and toasts what became ready', async ($, on) => {
    const fs = await fakeFs(on, QUEUE);
    const { clock } = fs;
    const merged = new Set<string>();
    const gh = fakeGh(on, merged);
    const { toasts, status } = capture(on);
    await queueTool($, { action: 'list' });
    merged.add('reactive/data-client#4349');
    await clock.advance(5 * 60_000);
    expect(gh.length).toBeGreaterThan(0);
    expect(fs.read().items.find(one => one.n === 4)?.waits).toEqual([
      { kind: 'pr', pr: 'reactive/data-client#4349', isMerged: true },
    ]);
    expect(toasts).toEqual(['Queue #4 is ready: Item 4']);
    expect(status.at(-1)).toBe('queue 5 ready · 2 need you · 1 running');
  });

  test('the pane groups items and opens one', async ($, on) => {
    const { clock } = await fakeFs(on, QUEUE);
    const { prompts } = capture(on);
    await queueTool($, { action: 'list' });
    for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
      const ui = await $.ui.mount({ ...PANE, surface });
      expect(await ui.find({ text: /Needs your call/ })).toBeDefined();
      expect(await ui.find({ key: 'item-2' })).toBeDefined();
      expect(await ui.find({ key: 'item-9' })).toBeUndefined();
      await ui.press({ key: 'tab-done' });
      expect(await ui.find({ key: 'item-9' })).toBeDefined();
      await ui.press({ key: 'item-9' });
      expect(await ui.find({ text: /PR merged/ })).toBeDefined();
      await ui.press({ key: 'back' });
      await ui.press({ key: 'tab-open' });
      await ui.unmount();
    }
    const ui = await $.ui.mount({ ...PANE, surface: 'desktop' });
    await ui.press({ key: 'item-3' });
    await ui.press({ key: 'start' });
    await clock.advance(1);
    expect(prompts[0]).toContain('Start work-queue item #3');
    await ui.unmount();
  });
});
