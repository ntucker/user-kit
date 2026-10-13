import type { On } from 'claude-code';
import { describe, expect, mock, test } from 'claude-code/testing';

import type { Run } from '../hooks/pr';
import { fetchSnapshot, headline, parseChecks, summary } from '../hooks/pr';

const ROLLUP = [
  {
    context: 'ci/circleci: lint',
    state: 'FAILURE',
    targetUrl: 'https://circleci.com/lint',
  },
  {
    name: 'Claude Approvals',
    status: 'IN_PROGRESS',
    detailsUrl: 'https://github.com/approvals',
  },
  {
    name: 'docs deploy',
    status: 'COMPLETED',
    conclusion: 'SUCCESS',
  },
  {
    name: 'benchmark',
    status: 'COMPLETED',
    conclusion: 'SKIPPED',
  },
];

const PR = {
  number: 4300,
  title: 'Faster docs search',
  url: 'https://github.com/reactive/data-client/pull/4300',
  isDraft: true,
  mergeStateStatus: 'DIRTY',
  reviewDecision: 'CHANGES_REQUESTED',
  reviewThreads: {
    nodes: [
      {
        isResolved: false,
        path: 'website/src/search.ts',
        comments: {
          nodes: [
            {
              author: { login: 'cursor[bot]' },
              body: '<!-- meta -->\n### **Stale index after navigation**\nMore detail',
              url: 'https://github.com/t/1',
            },
          ],
        },
      },
      {
        isResolved: true,
        path: 'x.ts',
        comments: {
          nodes: [{ author: { login: 'ntucker' }, body: 'done', url: 'u' }],
        },
      },
    ],
  },
  commits: {
    nodes: [
      {
        commit: {
          oid: 'aaa',
          statusCheckRollup: { state: 'PENDING', contexts: { nodes: ROLLUP } },
        },
      },
    ],
  },
};

/** PR with `oid` as its head; `contexts` null before GitHub reports any checks */
const onCommit = (
  oid: string,
  contexts: unknown[] | null,
  state = 'PENDING',
) => ({
  ...PR,
  commits: {
    nodes: [
      {
        commit: {
          oid,
          statusCheckRollup: contexts && {
            state,
            contexts: { nodes: contexts },
          },
        },
      },
    ],
  },
});

const CONFIG = {
  preview: {
    check: 'docs deploy',
    url: 'https://docs-site-pr-{number}-data-client.vercel.app',
  },
  land: ['Run /simplify on the change.'],
};

const exited = (exitCode: number, stdout: string, stderr = '') => ({
  exitCode,
  stdout,
  stderr,
});

/** git and gh as they answer on a branch whose open PR is `pr` (none when null; several when an array) */
const ghRun =
  (
    pr: unknown = PR,
    failure?: ReturnType<typeof exited>,
    branch = 'faster-search',
  ): Run =>
  async argv => {
    if (argv[0] === 'git')
      return exited(
        0,
        argv.includes('--show-toplevel') ? `/repo\n${branch}\n` : `${branch}\n`,
      );
    if (failure) return failure;
    const nodes =
      pr === null ? []
      : Array.isArray(pr) ? pr
      : [pr];
    const repository = {
      defaultBranchRef: { name: 'main' },
      pullRequests: { nodes },
    };
    return exited(0, JSON.stringify({ data: { repository } }));
  };

const readConfig = async (path: string) => {
  if (path === '/repo/.claude/pr-steward.json') return JSON.stringify(CONFIG);
  throw new Error('ENOENT');
};

/** The prompts the mod submits, in order */
function capturePrompts(on: On) {
  const prompts: string[] = [];
  on('prompt.submit', ($, e) => {
    prompts.push(e.text);
    return { text: e.text };
  });
  return prompts;
}

/** Answers the plugin's process and file reads as ghRun and readConfig do */
function fakeHost(on: On, run: Run = ghRun()) {
  const clock = mock.clock(on);
  on('process.run', async ($, e) => ({
    value: {
      ...(await run(e.argv)),
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }));
  on('fs.read', async ($, e) => ({ value: await readConfig(e.path) }));
  return clock;
}

const PANE = {
  plugin: 'pr-steward',
  component: 'Pane',
  requestId: 'pr-steward',
  props: {
    title: 'Pull request',
    isFocused: true,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const;

describe('checks', () => {
  test('maps CircleCI statuses and check runs to states', async () => {
    expect(parseChecks(ROLLUP).map(c => c.state)).toEqual([
      'fail',
      'pending',
      'pass',
      'skip',
    ]);
  });
});

describe('pr_status', () => {
  test('reports conflicts, failing checks, open threads and the preview', async ($, on) => {
    fakeHost(on);
    const ran = await $.tool.call({ tool: 'mcp__pr-steward__pr_status' });
    const text = String(ran.result);
    expect(text).toContain('DIRTY (conflicts with its base)');
    expect(text).toContain(
      'FAILING ci/circleci: lint https://circleci.com/lint',
    );
    expect(text).toContain('running Claude Approvals');
    expect(text).toContain('Unresolved review threads: 1');
    expect(text).toContain(
      'cursor on website/src/search.ts: Stale index after navigation',
    );
    expect(text).toContain('https://docs-site-pr-4300-data-client.vercel.app');
  });

  test('says when the branch has no PR', async ($, on) => {
    fakeHost(on, ghRun(null));
    const ran = await $.tool.call({ tool: 'mcp__pr-steward__pr_status' });
    expect(String(ran.result)).toBe(
      'No pull request is open for branch faster-search.',
    );
  });
});

describe('pane', () => {
  test('draws the PR on every surface', async ($, on) => {
    fakeHost(on);
    await $.tool.call({ tool: 'mcp__pr-steward__pr_status' });
    for (const surface of [
      'terminal',
      'desktop',
      'vscode',
      'mobile',
    ] as const) {
      const ui = await $.ui.mount({ ...PANE, surface });
      expect(
        await ui.find({ text: /Conflicts with its base branch/ }),
      ).toBeDefined();
      expect(
        await ui.find({ type: 'Link', text: 'Website preview' }),
      ).toBeDefined();
      expect(await ui.find({ key: 'ready' })).toBeDefined();
      await ui.unmount();
    }
  });

  test('Land asks the model to work every open item', async ($, on) => {
    fakeHost(on);
    const prompts = capturePrompts(on);
    await $.tool.call({ tool: 'mcp__pr-steward__pr_status' });
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
    await ui.press({ key: 'land' });
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('Land this pull request');
    expect(prompts[0]).toContain('FAILING ci/circleci: lint');
    expect(prompts[0]).toContain(
      '4. (from .claude/pr-steward.json) Run /simplify on the change.',
    );
    expect(prompts[0]).toContain('5. Mark the PR ready');
  });
});

describe('failures', () => {
  test('a failed GitHub read is an error, not an empty PR', async () => {
    const snapshot = await fetchSnapshot(
      ghRun(PR, exited(1, '', 'rate limited')),
      readConfig,
    );
    expect(summary(snapshot)).toBe('Could not read the PR: rate limited');
  });

  test('a commit with no checks is not reported green', async () => {
    const snapshot = await fetchSnapshot(
      ghRun(onCommit('aaa', null)),
      readConfig,
    );
    expect(snapshot.kind === 'pr' && snapshot.pr.checks).toEqual([]);
    expect(summary(snapshot)).toContain(
      'CI: no checks yet\nChecks: 0 failing, 0 running, 0 passing',
    );
  });

  test('a call that throws becomes an error snapshot', async () => {
    const snapshot = await fetchSnapshot(async () => {
      throw new Error('timed out');
    }, readConfig);
    expect(snapshot).toEqual({ kind: 'error', message: 'timed out' });
  });

  test('a repo without config gets no preview and the default steps', async () => {
    const snapshot = await fetchSnapshot(ghRun(), async () => {
      throw new Error('ENOENT');
    });
    expect(snapshot.kind === 'pr' && snapshot.pr.preview).toBeUndefined();
    expect(snapshot.kind === 'pr' && snapshot.land).toEqual([]);
  });

  test('malformed config costs only the parts it breaks', async () => {
    const read = (config: unknown) =>
      fetchSnapshot(ghRun(), async () =>
        typeof config === 'string' ? config : JSON.stringify(config),
      );
    const broken = await read('{ not json');
    expect(broken.kind).toBe('pr');
    const shapes = await read({
      preview: { check: 'docs deploy' },
      land: 'one step',
    });
    expect(shapes.kind === 'pr' && shapes.pr.preview).toBeUndefined();
    expect(shapes.kind === 'pr' && shapes.land).toEqual([]);
  });

  test('the default branch never matches a fork PR of the same name', async () => {
    const snapshot = await fetchSnapshot(
      ghRun(PR, undefined, 'main'),
      readConfig,
    );
    expect(snapshot).toEqual({ kind: 'none', branch: 'main' });
  });

  test("a fork's PR from a branch of the same name loses to this repo's", async () => {
    const fork = { ...PR, number: 9, isCrossRepository: true };
    const snapshot = await fetchSnapshot(ghRun([fork, PR]), readConfig);
    expect(snapshot.kind === 'pr' && snapshot.pr.number).toBe(4300);
  });

  test("CI reads as the worse of GitHub's state and the listed checks", async () => {
    const passing = ROLLUP.filter(c => c.conclusion === 'SUCCESS');
    const read = (state: string) =>
      fetchSnapshot(ghRun(onCommit('aaa', passing, state)), readConfig);
    const running = await read('PENDING');
    expect(running.kind === 'pr' && headline(running.pr)).toContain(
      'CI running',
    );
    const failed = await read('FAILURE');
    expect(failed.kind === 'pr' && headline(failed.pr)).toContain('CI failing');
    const listed = await fetchSnapshot(ghRun(), readConfig);
    expect(listed.kind === 'pr' && headline(listed.pr)).toContain('1 failing');
  });
});

test('/land without a PR says so and submits nothing', async ($, on) => {
  fakeHost(on, ghRun(null));
  const prompts = capturePrompts(on);
  const ran = await $.command.run({
    command: 'land',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  });
  expect(ran.text).toBe('No pull request is open for branch faster-search.');
  expect(prompts).toHaveLength(0);
});

describe('toasts', () => {
  const settled = (oid: string) =>
    onCommit(
      oid,
      ROLLUP.filter(c => c.status !== 'IN_PROGRESS'),
      'FAILURE',
    );

  /** Reads PR (checks running on aaa), then each of `reads`, collecting the toasts they raised */
  async function toastsAfter($: any, on: On, ...reads: unknown[]) {
    let pr: unknown = PR;
    fakeHost(on, async argv => ghRun(pr)(argv));
    const toasts: string[] = [];
    on('ui.toast', ($, e) => {
      toasts.push(e.text);
      return { value: undefined };
    });
    await $.tool.call({ tool: 'mcp__pr-steward__pr_status' });
    for (const read of reads) {
      pr = read;
      await $.tool.call({ tool: 'mcp__pr-steward__pr_status' });
    }
    return toasts;
  }

  test("says when the same commit's CI settles", async ($, on) => {
    expect(await toastsAfter($, on, settled('aaa'))).toEqual([
      'PR #4300: 1 failing (ci/circleci: lint)',
    ]);
  });

  const unreported = (oid: string) => onCommit(oid, null);

  test('waits out a read with no checks', async ($, on) => {
    expect(await toastsAfter($, on, unreported('aaa'), settled('aaa'))).toEqual(
      ['PR #4300: 1 failing (ci/circleci: lint)'],
    );
  });

  test('says when checks go from none to settled', async ($, on) => {
    expect(await toastsAfter($, on, unreported('bbb'), settled('bbb'))).toEqual(
      ['PR #4300: 1 failing (ci/circleci: lint)'],
    );
  });

  test('says when the PR starts conflicting', async ($, on) => {
    expect(
      await toastsAfter($, on, { ...PR, mergeStateStatus: 'CLEAN' }, PR),
    ).toEqual(['PR #4300 now conflicts with its base branch']);
  });

  test('says it again after a re-run', async ($, on) => {
    expect(
      await toastsAfter($, on, settled('aaa'), PR, settled('aaa')),
    ).toEqual([
      'PR #4300: 1 failing (ci/circleci: lint)',
      'PR #4300: 1 failing (ci/circleci: lint)',
    ]);
  });

  // the commit's state outlives a test, so this one is new to every test
  test('stays quiet for a commit first seen settled', async ($, on) => {
    expect(
      await toastsAfter(
        $,
        on,
        settled('ccc'),
        unreported('ccc'),
        settled('ccc'),
      ),
    ).toEqual([]);
  });

  test('waits for every check, not just the first failure', async ($, on) => {
    expect(
      await toastsAfter($, on, onCommit('aaa', ROLLUP, 'FAILURE')),
    ).toEqual([]);
  });

  test('says when CI goes green', async ($, on) => {
    const passing = ROLLUP.filter(c => c.conclusion === 'SUCCESS');
    expect(
      await toastsAfter(
        $,
        on,
        onCommit('ddd', null),
        onCommit('ddd', passing, 'SUCCESS'),
      ),
    ).toEqual(['PR #4300: CI green']);
  });

  test('says it once per commit', async ($, on) => {
    expect(
      await toastsAfter(
        $,
        on,
        settled('aaa'),
        unreported('aaa'),
        settled('aaa'),
      ),
    ).toEqual(['PR #4300: 1 failing (ci/circleci: lint)']);
  });

  test("stays quiet while a new push's checks arrive", async ($, on) => {
    expect(await toastsAfter($, on, settled('bbb'))).toEqual([]);
  });
});

describe('refreshes', () => {
  /** Runs one Bash command whose result reports `gitOperation`, on `branch` afterwards */
  async function bash($: any, on: On, gitOperation?: object, branch?: string) {
    const reads: string[] = [];
    let current = 'faster-search';
    const clock = fakeHost(on, async argv => {
      if (argv[0] === 'gh') reads.push('gh');
      return ghRun(PR, undefined, current)(argv);
    });
    let operation: object | undefined;
    on('tool.call', { tool: 'Bash' }, () => ({
      result: {
        stdout: '',
        stderr: '',
        interrupted: false,
        gitOperation: operation,
      },
    }));
    // the first command learns the branch
    await $.tool.call({ tool: 'Bash', command: 'true' });
    await clock.advance(1);
    reads.length = 0;
    operation = gitOperation;
    if (branch) current = branch;
    await $.tool.call({ tool: 'Bash', command: 'x' });
    await clock.advance(1);
    const atOnce = reads.length;
    // CI needs a moment to register a push's checks
    await clock.advance(15_000);
    return { atOnce, after15s: reads.length - atOnce };
  }

  test('15s after a push', async ($, on) => {
    expect(await bash($, on, { push: { branch: 'faster-search' } })).toEqual({
      atOnce: 0,
      after15s: 1,
    });
  });

  test('at once after a branch switch', async ($, on) => {
    expect(await bash($, on, undefined, 'other')).toEqual({
      atOnce: 1,
      after15s: 0,
    });
  });

  test('not after other commands', async ($, on) => {
    expect(await bash($, on)).toEqual({ atOnce: 0, after15s: 0 });
  });
});
