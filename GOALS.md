# Goals

This repo is the origin source of truth for personal Cursor skills and subagents. Desktop Cursor loads the clone at `~/.cursor/plugins/local/user-kit`. A separate engine, `cursor-skills-sync`, commits and pushes that clone and publishes cloud snapshots. Do not move that machinery into this repo, and do not add Cursor hooks here.

These constraints are the contract for anyone editing this tree. A change that violates one breaks this desktop, the cloud snapshots, or the sync engine, even if the files still parse.

## What this repo is

1. **Origin is `https://github.com/ntucker/user-kit`.** Default branch is `main`. The `origin` remote stays that GitHub URL. The repo name and the local directory name stay `user-kit`; the engine treats that name as this plugin. Cloud snapshots are other repos. They never rewrite this one, this repo is never deleted, and this checkout does not rewrite them.
2. **This desktop stays live from the local clone.** Edits here show up in Cursor without a marketplace update, unless a marketplace plugin named `user-kit` is also installed. That copy overrides this directory. Do not copy skills or agents into `~/.cursor/skills`, `~/.cursor/agents`, or the sync engine.
3. **This URL is never a Cursor marketplace install.** A personal GitHub import pins the first-import `gitRef`. Marketplace update, Update/Reinstall, version bumps, cache wipes, and remove-then-re-add of this same URL do not move the enabled pin. The plugin name `user-kit` then overrides `~/.cursor/plugins/local/user-kit` and freezes the desktop.
4. **Cloud freshness is a different git URL.** Grok, Projects, and Cloud Agents cannot see `plugins/local`. They load a dated public snapshot named `user-kit-YYYY-MM-DD`, or `user-kit-YYYY-MM-DD-HHMM` when that day's name is already taken. `/cut-cloud` publishes it and tags that repo `user-kit-snapshot` so the engine can tell snapshots from this repo. A cut with no new origin commit since the newest snapshot publishes nothing. Do not try to refresh cloud by reinstalling this repo.

## Shape the snapshot publisher depends on

5. **Cursor plugin name stays `user-kit`.** `.cursor-plugin/plugin.json` `name`, `.cursor-plugin/marketplace.json` `name`, and `plugins[0].name` are all `user-kit`. The marketplace has exactly one plugin, with `source` `"."`. Extra entries are not renamed, so they would still be named `user-kit` on the snapshot. `/cut-cloud` clones the local checkout at the commit that matches origin and, only on that copy, rewrites those names and the plugin description. An empty `plugins` array makes the cut fail. Both JSON files must stay valid.

## Shape Cursor depends on

6. **Content layout stays `skills/<name>/SKILL.md` and `agents/<name>.md`.** The manifest does not declare other component paths. Do not relocate them under `.claude/`, `.cursor/skills`, or the plugin manifest directory.
7. **Agent files keep Cursor frontmatter.** `name` and `description` identify and route the agent. Removing `model` runs it on the default model. Removing `readonly: true` lets it edit files. Do not strip either to suit another tool.
8. **This tree is public.** No secrets, tokens, or private data.

## Claude Code

9. **The same tree is a Claude Code plugin.** It loads `skills/` directly, so skills are shared as-is.
10. **`claude/agents/` is generated.** Edit `agents/`, then run `python3 scripts/build_claude_agents.py`. It also rewrites the `agents` list in `.claude-plugin/plugin.json`. Never hand-edit either. CI regenerates them on `main` when a sync pushes `agents/` changes without them.

Adding files for another tool is fine when it does not rename, move, or replace the Cursor manifest, `skills/`, or `agents/`.
