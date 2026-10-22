# pr-steward

Keeps the current branch's pull request in view while you work in Claude Code.

- **Pane** (`/pull-request`): merge state and conflicts, failing and running checks (CircleCI, GitHub Actions, Claude Approvals) with links, unresolved review threads, and the repository's preview link once its deploy check exists. Buttons: Refresh, Land, Mark ready (drafts).
- **Status line**: `PR #123 · 2 failing · 3 open threads`, refreshed every minute and shortly after each `git push` or `gh pr` change.
- **Toasts** once no check on the head commit is still pending or expected (green, or which checks failed), and when the PR starts conflicting. A required status GitHub still lists as expected holds the CI toast back; the pane and status line still show failures as they happen.
- **`/land`**: asks Claude to drive the PR to mergeable: conflicts, then failing checks, then review threads (verifying each claim against the code), then the repository's own steps and marking it ready.
- **`pr_status` tool**: Claude reads the same state instead of re-querying GitHub.

It stays idle until a session uses it: nothing runs until `/pull-request`, `/land`, `pr_status`, a `git push` or a `gh pr` command, so a session that never touches a PR runs no `gh` or `git` commands. From then on it reads the branch locally after each command, and polls GitHub only while the branch has a PR or the pane is open.

Needs the [`gh` CLI](https://cli.github.com/), signed in. Works in any GitHub repository.

## Repository config

An optional `.claude/pr-steward.json` at the repository root adds a preview link and extra `/land` steps:

```json
{
  "preview": {
    "check": "docs deploy",
    "url": "https://docs-site-pr-{number}-data-client.vercel.app"
  },
  "land": ["Once everything is verified, run /simplify on the change."]
}
```

The link shows once a check named `check` exists on the PR's head commit; `{number}` is the PR number.

## Install

```sh
claude plugin marketplace add ntucker/user-kit
claude plugin install pr-steward@user-kit --scope user
```

From a local checkout of user-kit, `claude plugin marketplace add <checkout>` instead loads it in place, so `/reload-plugins` picks up edits.

## Develop

```sh
claude plugin validate mods/pr-steward
claude plugin test mods/pr-steward
```
