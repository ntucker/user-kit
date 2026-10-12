import type { EngineInterface, Register } from 'claude-code';

import type { PrSnapshot } from '../types';
import {
  byState,
  fetchSnapshot,
  headline,
  isConflicted,
  landPrompt,
  summary,
} from './pr';

const PANE = 'pr-steward';
const TITLE = 'Pull request';
const snapshotRef = { plugin: 'pr-steward', key: 'snapshot' } as const;
const POLL_MS = 60_000;
/** CI needs a moment to register a push's checks */
const AFTER_PUSH_MS = 15_000;
const PUSHES = /\bgit\b[^;&|]*\bpush\b|\bgh\s+pr\s+(create|ready)\b/;

let latest: Promise<PrSnapshot> | undefined;

/** Reads the PR through gh; reads run one after another, so each caller sees GitHub as of its call */
function refresh($: EngineInterface): Promise<PrSnapshot> {
  const after = latest?.catch(() => undefined);
  latest = (async () => {
    await after;
    const previous = (await $.state.get(snapshotRef)).value ?? null;
    const next = await fetchSnapshot(
      argv => $.process.run(argv, { timeoutMs: 30_000 }),
      path => $.fs.read(path),
    );
    await $.state.set(snapshotRef, next);
    $.ui.status(next.kind === 'pr' ? headline(next.pr) : undefined);
    announce($, previous, next);
    return next;
  })();
  return latest;
}

async function markReady($: EngineInterface) {
  const ran = await $.process.run(['gh', 'pr', 'ready'], { timeoutMs: 30_000 });
  if (ran.exitCode !== 0)
    $.ui.toast(`gh pr ready failed: ${ran.stderr.trim()}`);
  await refresh($);
}

/** Asks the model to land the PR; without one, says why not */
async function land($: EngineInterface): Promise<string> {
  const snapshot = await refresh($);
  if (snapshot.kind !== 'pr') return summary(snapshot);
  await $.prompt.submit({ text: landPrompt(snapshot) });
  return 'Landing this branch’s pull request.';
}

let ticks = 0;

/** Every minute while the branch has a PR; every fifth minute otherwise */
async function poll($: EngineInterface) {
  ticks += 1;
  const snapshot = (await $.state.get(snapshotRef)).value;
  if (snapshot?.kind === 'pr' || ticks % 5 === 0) await refresh($);
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await Promise.all([
      $.command.register({
        name: 'pr',
        description:
          "Show this branch's pull request: CI, review threads, preview",
      }),
      $.command.register({
        name: 'land',
        description: "Drive this branch's pull request to mergeable",
      }),
      $.tool.register({
        name: 'pr_status',
        description:
          "Current state of this branch's pull request, read fresh from GitHub: merge state, failing and running checks (CircleCI, GitHub Actions, Claude Approvals) with links, unresolved review threads with their first line and link, and the website preview link. Use it instead of re-querying GitHub when checking whether a PR is ready.",
        isDeferred: false,
      }),
    ]);
    $.clock.every(POLL_MS, () => void poll($));
    void refresh($);
    return next(e);
  });

  on('command.run', { command: 'pr' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE });
    void refresh($);
    return { text: 'Opened the pull request pane.' };
  });

  on('command.run', { command: 'land' }, async $ => {
    return { text: await land($) };
  });

  on('tool.call', { tool: 'mcp__pr-steward__pr_status' }, async $ => ({
    result: summary(await refresh($)),
  }));

  // A failure here must not block Bash; .catch's next(e) replays the settled call, never running it twice
  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e);
    if (PUSHES.test(e.command))
      $.clock.after(AFTER_PUSH_MS, () => void refresh($));
    return ran;
  }).catch(($, e, next) => next(e));

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button, Link } = $.ui.resolve(e);
    const snapshot = (await $.state.get(snapshotRef)).value ?? null;
    const actions = (
      <Box key="actions" gap={1}>
        <Button
          key="refresh"
          label="Refresh"
          hotkey="r"
          onPress={() => refresh($)}
        />
        {snapshot?.kind === 'pr' && (
          <Button
            key="land"
            label="Land"
            variant="primary"
            hotkey="l"
            onPress={() => land($)}
          />
        )}
        {snapshot?.kind === 'pr' && snapshot.pr.isDraft && (
          <Button key="ready" label="Mark ready" onPress={() => markReady($)} />
        )}
      </Box>
    );

    if (snapshot?.kind !== 'pr')
      return (
        <Box flexDirection="column">
          <Text dimColor>
            {snapshot === null ?
              'Reading the pull request…'
            : summary(snapshot)}
          </Text>
          {actions}
        </Box>
      );

    const { pr } = snapshot;
    const failing = byState(pr, 'fail');
    const pending = byState(pr, 'pending');
    const passing = byState(pr, 'pass');
    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          <Link href={pr.url}>
            #{pr.number} {pr.title}
          </Link>
          <Text dimColor>
            {pr.isDraft ? 'Draft' : 'Ready for review'} ·{' '}
            {pr.mergeState.toLowerCase()}
            {pr.reviewDecision ?
              ` · ${pr.reviewDecision.toLowerCase().replace('_', ' ')}`
            : ''}
          </Text>
          {isConflicted(pr) && (
            <Text color="error">Conflicts with its base branch</Text>
          )}
          {pr.preview && <Link href={pr.preview}>Website preview</Link>}
        </Box>

        <Box flexDirection="column">
          <Text bold>
            Checks{' '}
            <Text dimColor>
              {failing.length} failing · {pending.length} running ·{' '}
              {passing.length} passing
            </Text>
          </Text>
          {failing.map((check, i) =>
            check.url ?
              <Link key={`fail-${i}`} href={check.url}>
                ✗ {check.name}
              </Link>
            : <Text key={`fail-${i}`} color="error">
                ✗ {check.name}
              </Text>,
          )}
          {pending.map((check, i) => (
            <Text key={`run-${i}`} color="warning">
              ○ {check.name}
            </Text>
          ))}
          {failing.length + pending.length === 0 &&
            (pr.checks.length ?
              <Text color="success">✓ All checks pass</Text>
            : <Text dimColor>No checks yet</Text>)}
        </Box>

        <Box flexDirection="column">
          <Text bold>
            Open threads <Text dimColor>{pr.threads.length}</Text>
          </Text>
          {pr.threads.map((thread, i) => (
            <Link key={`thread-${i}`} href={thread.url}>
              {thread.author}: {thread.body}
            </Link>
          ))}
        </Box>

        {actions}
      </Box>
    );
  });
};

/** A toast when CI settles or the PR starts conflicting, so nobody has to poll */
function announce(
  $: EngineInterface,
  previous: PrSnapshot | null,
  next: PrSnapshot,
) {
  if (previous?.kind !== 'pr' || next.kind !== 'pr') return;
  if (previous.pr.number !== next.pr.number) return;
  const wasRunning = byState(previous.pr, 'pending').length > 0;
  const isRunning = byState(next.pr, 'pending').length > 0;
  const failing = byState(next.pr, 'fail');
  if (wasRunning && !isRunning && next.pr.checks.length)
    $.ui.toast(
      failing.length ?
        `PR #${next.pr.number}: ${failing.length} failing (${failing.map(c => c.name).join(', ')})`
      : `PR #${next.pr.number}: CI green`,
    );
  if (!isConflicted(previous.pr) && isConflicted(next.pr))
    $.ui.toast(`PR #${next.pr.number} now conflicts with its base branch`);
}
