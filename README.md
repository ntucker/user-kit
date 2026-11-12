# user-kit

Personal skills and subagents for Cursor and Claude Code. This repository is the **origin source of truth**. Desktop authoring is the clone at `~/.cursor/plugins/local/user-kit`. `cursor-skills-sync` commits and pushes that checkout here.

This repository is public. Do not put secrets in it.

Cursor hooks and `/cut-cloud` stay in the separate `cursor-skills-sync` engine.

## Install

| Where you run it | How to install |
| --- | --- |
| Cursor desktop | [Clone into Cursor's local plugin folder](#cursor-desktop) |
| Cursor cloud (Cloud Agents, Projects, Grok Bot) | [Import the newest dated snapshot](#cursor-cloud) |
| Claude Code (terminal, desktop app, or the extension in Cursor or VS Code) | [Add the marketplace and install the plugin](#install-in-claude-code) |
| Claude Code cloud sessions | [Run the same commands in the environment setup script](#claude-code-cloud-sessions) |

## Install in Cursor

> [!WARNING]
> Do not import `ntucker/user-kit` from the Cursor marketplace or as a GitHub plugin. Cursor pins the commit of the first import, and no update or reinstall moves that pin. The pinned copy then overrides the local clone, so edits stop showing up. [`GOALS.md`](GOALS.md) has the details.

### Cursor desktop

1. Clone the repo into Cursor's local plugin folder. Keep the directory name `user-kit`.

   ```sh
   git clone https://github.com/ntucker/user-kit.git ~/.cursor/plugins/local/user-kit
   ```

2. Restart Cursor, or run **Developer: Reload Window**.

Cursor reads the plugin from `.cursor-plugin/plugin.json` and loads skills from `skills/` and subagents from `agents/`. It loads them in place, so `git pull` in that folder is the update step.

### Cursor cloud

Cloud Agents, Projects, and Grok Bot cannot see `~/.cursor/plugins/local`. Install the newest dated snapshot repo instead, named `user-kit-YYYY-MM-DD` (or `user-kit-YYYY-MM-DD-HHMM`). `/cut-cloud` in `cursor-skills-sync` publishes a new snapshot. To pick up new commits, install the newer snapshot. Reinstalling an older one does not update it.

## Install in Claude Code

The repo is a Claude Code plugin marketplace named `user-kit`. Its main plugin is also `user-kit`, and each mod is a separate plugin. Skills show up as `/user-kit:<skill>` and subagents as `user-kit:<agent>`.

Install it once per machine. The Claude Code extension in Cursor or VS Code uses the same installation as the `claude` CLI.

### From GitHub

```sh
claude plugin marketplace add ntucker/user-kit
claude plugin install user-kit@user-kit --scope user
```

`--scope user` makes it available in every repo. Use `--scope project` to record it in the current repo's `.claude/settings.json` instead.

Inside Claude Code, `/plugin marketplace add ntucker/user-kit` and `/plugin install user-kit@user-kit` do the same.

The plugin has no `version`, so updates follow git commits. They are not automatic by default. Pull them with:

```sh
claude plugin marketplace update user-kit
claude plugin update user-kit@user-kit
```

or turn on **Enable auto-update** for `user-kit` in `/plugin` → **Marketplaces**.

### Mods

The marketplace also lists the mods in `mods/` (`pr-steward` and `work-queue`). Install one by name, for example:

```sh
claude plugin install work-queue@user-kit --scope user
```

### Claude Code cloud sessions

A cloud session starts from a fresh container and cannot see your local checkout. Add these lines to the environment's setup script:

```sh
claude plugin marketplace add ntucker/user-kit
claude plugin install user-kit@user-kit --scope user
```

### Suggest it to everyone working in a repo

Commit this to that repo's `.claude/settings.json`. Claude Code then offers to install it when someone trusts the folder.

```json
{
  "extraKnownMarketplaces": {
    "user-kit": {
      "source": { "source": "github", "repo": "ntucker/user-kit" }
    }
  },
  "enabledPlugins": {
    "user-kit@user-kit": true
  }
}
```

### Live from your own checkout (authoring)

A marketplace added from a local path loads the plugin in place, so edits apply on the next session or `/reload-plugins` with no update step. Point it at the Cursor clone so both tools read the same files:

```sh
claude plugin marketplace add ~/.cursor/plugins/local/user-kit
claude plugin install user-kit@user-kit --scope user
```

Use this instead of the GitHub marketplace on the authoring machine, not alongside it, since both are named `user-kit`. For a one-off session, `claude --plugin-dir ~/.cursor/plugins/local/user-kit/claude` also works. Either way, run the build script below after editing, since Claude Code reads the copies in `claude/`.

## Layout

- `skills/<name>/SKILL.md` — personal skills, shared by Cursor and Claude Code
- `agents/<name>.md` — subagents, in Cursor frontmatter
- `claude/` — the Claude Code plugin, generated except for its `.claude-plugin/plugin.json`:
  - `claude/agents/<name>.md` — Claude Code copies of `agents/` (minus Cursor-only agents on non-Claude models)
  - `claude/skills/` — a mirror of `skills/`, plus skills generated from agents that opt in, for instructions Claude should follow in its own context (Cursor ignores them)
  - `claude/workflows/` — a mirror of `workflows/`
- `workflows/<name>.js` — Claude Code Workflow scripts, run as `user-kit:<name>` (Cursor ignores them)
- `mods/<name>/` — Claude Code mods, each its own plugin in the Claude marketplace (install `<name>@user-kit`; Cursor ignores them)
  - Mods run only in Claude Code sessions: the terminal, the desktop app's Code tab, IDE extensions and Cowork. In a claude.ai project, threads load them once the plugin is enabled on the account, but the project chat (the coordinator) is not a Claude Code session and never loads them.
  - A cloud session reads mod options from `~/.claude/settings.json` (`pluginConfigs`), so set them in the environment's setup script.
- `.cursor-plugin/` — Cursor manifest and marketplace
- `.claude-plugin/` — Claude Code marketplace

### Editing skills, subagents, and workflows

Edit `skills/`, `agents/`, or `workflows/`, then run:

```sh
python3 scripts/build_claude_plugin.py
```

It rebuilds the Claude Code plugin in `claude/`. The script's docstring explains why the plugin lives there. On pull requests CI fails when they are stale. On `main`, where `cursor-skills-sync` pushes without running the script, CI regenerates and commits them.

## License

MIT
