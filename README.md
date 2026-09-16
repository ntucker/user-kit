# user-kit

Personal Cursor skills and subagents, packaged as a Cursor plugin so desktop, Cloud Agents, Grok-started workers, and Projects can load the same kit.

This repository is public. Do not put secrets in skills.

## Install

Customize → Plugins → Add → From GitHub Repository → `https://github.com/ntucker/user-kit`

Install **user-kit** at **user** scope, then reload the window.

Authoring checkout (this machine): `~/.cursor/plugins/local/user-kit`. Edits here are committed and pushed by `cursor-skills-sync`. Cloud and other clients follow the published git SHA; personal GitHub imports often stay pinned until you remove and re-add the marketplace.

## Layout

- `skills/<name>/SKILL.md` — personal skills
- `agents/<name>.md` — Cursor subagents

## License

MIT
