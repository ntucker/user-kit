# work-queue

A work queue shared by every session that can reach one JSON file: what is waiting to start, what each item waits on, and what is running. Built for a coordinator that hands work to other sessions, it works as well for one person's backlog.

- **Pane** (`/queue`): open items grouped by what holds them back (Needs your call, Ready, Waiting on PRs, Waiting on other items, Waiting on events), plus Running and Done tabs. Press an item for its brief, waits and notes, and **Start** to hand it to Claude.
- **Status line**: `queue 3 ready · 6 need you · 4 wait on PRs · 5 running`.
- **Toasts** when an item becomes ready, for example when the PR it waited on merges.
- **`/queue`** commands: `/queue` (summary and pane), `/queue all`, `/queue <n>`, `/queue start <n>`, `/queue done <n> [outcome]`, `/queue drop <n> [reason]`.
- **`queue` tool**: Claude lists, reads, adds and updates items instead of editing the file by hand, so every change is checked and lands on the file as it is now.

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
| `{ "kind": "item", "item": 9 }` | item 9 is done or dropped (it must exist) |
| `{ "kind": "event", "what": "…", "after": "2026-11-08" }` | that date, or removed when it has none |

Items also carry `repo`, `source`, `thread` (`{ title, url }`), `prs`, dated `notes`, `started`, `ended` and `outcome`. `order` lists items to start first; the rest follow by priority, then number.

## Settings

Set in `/config` or settings.json `pluginConfigs["work-queue"].options`:

| Option | Default | What |
| --- | --- | --- |
| `file` | `work-queue.json` | The queue file, absolute or relative to the working directory |
| `markdown` | none | Also write a readable Markdown copy here after each change, for readers without the plugin |
| `checkPrs` | `true` | Clear PR waits once `gh` reports them merged |

The file is re-read when its modification time changes (checked every 20 seconds). Each change re-reads it first, and runs again on the newer file if another session wrote in between, so sessions sharing the file through a synced or network folder keep each other's edits; waits are removed by what they name, never by position. Two writes in the same instant can still race, and the last one wins. Dates (`started`, `ended`, notes, an event's `after`) are the local calendar day.

### Why not Claude Code's task list

Claude Code's built-in tasks track steps within a session or team, with `blockedBy` between tasks. This queue holds work that has not started yet, across sessions and machines that only share a folder, and its items wait on things outside the list: a PR merging, a person's decision, a date. Use tasks for the steps of a running item, and this queue for what runs next.

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
