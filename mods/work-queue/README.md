# work-queue

A work queue shared by every session that can reach one JSON file: what is waiting to start, what each item waits on, and what is running. Built for a coordinator that hands work to other sessions, it works as well for one person's backlog.

- **Pane** (`/queue`): open items grouped by what holds them back (Needs your call, Ready, Waiting on PRs, Waiting on other items, Waiting on events), plus Running and Done tabs. Press an item for its brief, waits and notes, and **Start** to hand it to Claude.
- **Status line**: `queue 3 ready · 6 need you · 4 wait on PRs · 5 running`.
- **Toasts** when an item becomes ready, for example when the PR it waited on merges.
- **`/queue`** commands: `/queue` (summary and pane), `/queue all`, `/queue <n>`, `/queue start <n>`, `/queue done <n> [outcome]`, `/queue drop <n> [reason]`, `/queue history [words]`.
- **`queue` tool**: Claude lists, reads, adds and updates items instead of editing the file by hand, so every change is checked and lands on the file as it is now.
- **Archive**: items that ended two weeks ago move to a separate file, so the queue stays small; `get` and `history` still find them.

## The file

```json
{
  "version": 1,
  "rules": "Start the next item only when 5 or fewer sessions are working.",
  "order": [12],
  "items": [
    {
      "n": 12,
      "title": "Write the release notes",
      "brief": "Enough for someone with no context to start the work.",
      "state": "queued",
      "priority": "low",
      "waits": []
    },
    {
      "n": 14,
      "title": "Add a dark theme",
      "brief": "…",
      "state": "queued",
      "waits": [
        { "kind": "pr", "pr": "acme/web#101" },
        { "kind": "decision", "ask": "Follow the OS setting, or a toggle?" }
      ]
    }
  ]
}
```

`state` is `queued`, `running`, `done` or `dropped`. A queued item is ready once none of its waits is open:

| Wait | Open until |
| --- | --- |
| `{ "kind": "decision", "ask": "…" }` | removed |
| `{ "kind": "pr", "pr": "owner/repo#123" }` | `gh` reports the PR merged (checked every 5 minutes); a PR closed without merging becomes a decision |
| `{ "kind": "item", "item": 9 }` | item 9 is done, dropped or archived |
| `{ "kind": "event", "what": "…", "after": "2026-11-08" }` | that date, or removed when it has none |

Items also carry `repo`, `source`, `thread` (`{ title, url }`), `prs`, dated `notes`, `started`, `ended` and `outcome`. `order` lists items to start first; the rest follow by priority, then number.

## Settings

Set in `/config` or settings.json `pluginConfigs["work-queue"].options`:

| Option | Default | What |
| --- | --- | --- |
| `file` | `work-queue.json` | The queue file, absolute or relative to the working directory |
| `markdown` | none | Also write a readable Markdown copy here after each change, for readers without the plugin |
| `checkPrs` | `true` | Clear PR waits once `gh` reports them merged |
| `archiveAfterDays` | `14` | Move done and dropped items to the archive this many days after they end (items with no end date count as old); `0` keeps them |
| `archive` | next to the queue | The archive file; by default the queue file's name with `.archive.jsonl` |

## The archive

Each change to the queue first moves items that ended more than `archiveAfterDays` ago into the archive: one item per line, as JSON, added at the end. The plugin API has no append or rename, so the archive is rewritten with the new lines, then read back; lines another session's write replaced are added again. The queue keeps `lastN`, the highest number used, so new items never take an archived number. A wait on an archived item counts as cleared; adding a wait on a number in neither file is refused. The archive is read only to show an item no longer in the queue (`get`, `/queue <n>`), to search it (`history`, `/queue history [words]`), or to bring an item back: `update` on an archived number restores it to the queue. Nothing is ever removed from the archive. If a write is cut short between the two files, an item can be in both; the queue's copy wins.

## Sharing the file

The file is re-read when its modification time changes (checked every 20 seconds). Each change re-reads it first, and runs again on the newer file if its content changed while the change ran, so sessions sharing the file through a synced or network folder keep each other's edits; after three tries the change fails with an error rather than overwrite. Waits are removed by what they name, never by position. Two writes in the same instant can still race, and the last one wins. Dates (`started`, `ended`, notes, an event's `after`) are the local calendar day.

### Why not Claude Code's task list

Claude Code's built-in tasks (TaskCreate, TaskList) track steps within a session or team, with `blockedBy` between tasks. They are kept under `~/.claude/tasks` on the machine running the session, so sessions on other machines or in separate cloud containers do not see them. This queue holds work that has not started yet, across sessions and machines that only share a folder, and its items wait on things outside the list: a PR merging, a person's decision, a date. Use tasks for the steps of a running item, and this queue for what runs next.

## Install

```sh
claude plugin marketplace add ntucker/user-kit
claude plugin install work-queue@user-kit --scope user
```

## Develop

```sh
claude plugin validate mods/work-queue
claude plugin test mods/work-queue
```
