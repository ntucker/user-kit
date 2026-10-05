# Goals

This repo is the origin source of truth for personal Cursor skills and subagents. Desktop Cursor loads the clone at `~/.cursor/plugins/local/user-kit`. A separate engine, `cursor-skills-sync`, commits and pushes that clone and publishes cloud snapshots. Do not move that machinery into this repo, and do not add Cursor hooks here.

These constraints are the contract for anyone editing this tree. A change that violates one breaks Cursor even if the files still parse.

## What this repo is

1. **Origin is `https://github.com/ntucker/user-kit`.** Default branch is `main`. The `origin` remote stays that GitHub URL. Cloud snapshots are other repos. They never rewrite this one, this repo is never deleted, and this checkout does not rewrite them.
2. **This desktop stays live from the local clone.** Edits here show up in Cursor without a marketplace update. Do not copy skills or agents into `~/.cursor/skills`, `~/.cursor/agents`, or the sync engine.
3. **This URL is never a Cursor marketplace install.** A personal GitHub import pins the first-import `gitRef`. Marketplace update, Update/Reinstall, version bumps, cache wipes, and remove-then-re-add of this same URL do not move that pin. The plugin name `user-kit` then overrides `~/.cursor/plugins/local/user-kit` and freezes the desktop.
4. **Cloud freshness is a different git URL.** Grok, Projects, and Cloud Agents cannot see `plugins/local`. They load a dated public snapshot `user-kit-YYYY-MM-DD` (topic `user-kit-snapshot`), published by `/cut-cloud` in the sync engine. Do not try to refresh them by reinstalling this repo.

## Shape the snapshot publisher depends on

5. **Cursor plugin name stays `user-kit`.** `.cursor-plugin/plugin.json` `name`, `.cursor-plugin/marketplace.json` `name`, and `plugins[0].name` are all `user-kit`. The marketplace has exactly one plugin, with `source` `"."`. `/cut-cloud` clones this repo and rewrites those names only on the snapshot copy. An empty `plugins` array makes the cut fail.
6. **Content layout stays `skills/<name>/SKILL.md` and `agents/<name>.md`.** Do not relocate them under `.claude/`, `.cursor/skills`, or the plugin manifest directory.
7. **Agent files keep Cursor frontmatter.** `name`, `description`, and `model` are load-bearing. `readonly` is load-bearing where it is set. Do not strip `model` to suit another tool.
8. **This tree is public.** No secrets, tokens, or private data.

Adding files for another tool is fine when it does not rename, move, or replace the Cursor manifest, `skills/`, or `agents/`.
