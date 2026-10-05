# user-kit

Product constraints are in [`GOALS.md`](GOALS.md). Read that before editing. This file is how to apply them.

You are editing the Cursor kit source, not the sync engine. Hooks, `/cut-cloud`, and snapshot cleanup live in `cursor-skills-sync`. Do not add those scripts here. Do not add Cursor hooks to this repo.

## Do not change

- GitHub repo `ntucker/user-kit`, default branch `main`, or the `origin` URL.
- `.cursor-plugin/plugin.json` field `name` (`user-kit`).
- `.cursor-plugin/marketplace.json`: `name` is `user-kit`; `plugins` has one entry; that entry's `name` is `user-kit` and `source` is `"."`.
- Directory roles: personal skills in `skills/<name>/SKILL.md`, Cursor subagents in `agents/<name>.md`.
- Cursor agent frontmatter keys already on a file (`name`, `description`, `model`, `readonly`).

## Do not do

- Instruct anyone to install `https://github.com/ntucker/user-kit` from the Cursor marketplace, or "fix" a stale cloud kit by updating or reinstalling that same URL. That pin does not move. Cloud copies are dated snapshot repos.
- Copy this tree into `~/.cursor/skills` or into `cursor-skills-sync`.
- Put secrets in this public repo.
- Rewrite snapshot repos (`user-kit-YYYY-MM-DD`, topic `user-kit-snapshot`) from here. Edit this repo; the engine publishes snapshots.

## Safe edits

Add or edit skills and subagents in place. Extra files for other agents are fine if the Cursor manifest, `skills/`, and `agents/` stay where they are and keep the names above.
