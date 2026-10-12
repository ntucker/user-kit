import type { On } from 'claude-code';
import { describe, expect, mock, test } from 'claude-code/testing';

import type { Run } from '../hooks/pr';
import { fetchSnapshot, parseChecks, summary } from '../hooks/pr';

const ROLLUP = [
  {
    __typename: 'StatusContext',
    context: 'ci/circleci: lint',
    state: 'FAILURE',
    targetUrl: 'https://circleci.com/lint',
  },
  {
    __typename: 'CheckRun',
    name: 'Claude Approvals',
    status: 'IN_PROGRESS',
    detailsUrl: 'https://github.com/approvals',
  },
  {
    __typename: 'CheckRun',
    name: 'docs deploy',
    status: 'COMPLETED',
    conclusion: 'SUCCESS',
  },
  {
    __typename: 'CheckRun',
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
    nodes: [{ commit: { statusCheckRollup: { contexts: { nodes: ROLLUP } } } }],
  },
};

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

/** git and gh as they answer on a branch whose open PR is `pr` (none when null) */
const ghRun =
  (pr: unknown = PR, failure?: ReturnType<typeof exited>): Run =>
  async argv => {
    if (argv[0] === 'git') return exited(0, '/repo\nfaster-search\n');
    if (failure) return failure;
    const nodes = pr === null ? [] : [pr];
    return exited(
      0,
      JSON.stringify({ data: { repository: { pullRequests: { nodes } } } }),
    );
  };

const readConfig = async (path: string) => {
  if (path === '/repo/.claude/pr-steward.json') return JSON.stringify(CONFIG);
  throw new Error('ENOENT');
};

/** Answers the plugin's process and file reads as ghRun and readConfig do */
function fakeHost(on: On, run: Run = ghRun()) {
  mock.clock(on);
  on('process.run', async ($, e) => ({
    value: {
      ...(await run(e.argv)),
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }));
  on('fs.read', async ($, e) => ({ value: await readConfig(e.path) }));
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
  test('sorts CircleCI statuses and check runs into states', async () => {
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
    const prompts: string[] = [];
    on('prompt.submit', ($, e) => {
      prompts.push(e.text);
      return { text: e.text };
    });
    await $.tool.call({ tool: 'mcp__pr-steward__pr_status' });
    const ui = await $.ui.mount({ ...PANE, surface: 'terminal' });
    await ui.press({ key: 'land' });
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toContain('Land this pull request');
    expect(prompts[0]).toContain('FAILING ci/circleci: lint');
    expect(prompts[0]).toContain('4. Run /simplify on the change.');
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
      ghRun({
        ...PR,
        commits: { nodes: [{ commit: { statusCheckRollup: null } }] },
      }),
      readConfig,
    );
    expect(snapshot.kind === 'pr' && snapshot.pr.checks).toEqual([]);
    expect(summary(snapshot)).toContain(
      'Checks: 0 failing, 0 running, 0 passing',
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
});
