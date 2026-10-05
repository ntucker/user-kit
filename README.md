# user-kit

Personal skills and subagents for Cursor and Claude Code. This repository is the **origin source of truth**. Desktop authoring is the clone at `~/.cursor/plugins/local/user-kit`. `cursor-skills-sync` commits and pushes that checkout here.

This repository is public. Do not put secrets in it.

**Do not install this repo from the Cursor marketplace.** Why that freezes this desktop, and how cloud copies stay fresh, is in [`GOALS.md`](GOALS.md).

Hooks and `/cut-cloud` stay in the separate `cursor-skills-sync` engine.

## Install in Claude Code

The repo is a Claude Code plugin marketplace with one plugin, `user-kit`. Skills show up as `/user-kit:<skill>` and subagents as `user-kit:<agent>`.

### For everyone

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

A marketplace added from a local path loads in place, so edits apply on the next session or `/reload-plugins` with no update step. Point it at the Cursor clone so both tools read the same files:

```sh
claude plugin marketplace add ~/.cursor/plugins/local/user-kit
claude plugin install user-kit@user-kit --scope user
```

Use this instead of the GitHub marketplace on the authoring machine, not alongside it, since both are named `user-kit`. For a one-off session, `claude --plugin-dir ~/.cursor/plugins/local/user-kit` also works.

## Layout

- `skills/<name>/SKILL.md` — personal skills, shared by Cursor and Claude Code
- `agents/<name>.md` — subagents, in Cursor frontmatter
- `claude/agents/<name>.md` — generated Claude Code copies of `agents/`
- `.cursor-plugin/` — Cursor manifest and marketplace
- `.claude-plugin/` — Claude Code manifest and marketplace

### Editing subagents

Edit `agents/<name>.md`, then run:

```sh
python3 scripts/build_claude_agents.py
```

It writes the Claude Code copies and their list in `.claude-plugin/plugin.json`. The script's docstring explains why the copies exist. On pull requests CI fails when they are stale. On `main`, where `cursor-skills-sync` pushes without running the script, CI regenerates and commits them.

## License

MIT
