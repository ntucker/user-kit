# user-kit

Personal Cursor skills and subagents. This repository is the **origin source of truth**. Desktop authoring is the clone at `~/.cursor/plugins/local/user-kit`. `cursor-skills-sync` commits and pushes that checkout here.

This repository is public. Do not put secrets in skills.

**Do not install this repo from the Cursor marketplace.** A personal GitHub import pins the first-import SHA and, with the same plugin name `user-kit`, overrides the local checkout and freezes that desktop. Cloud Agents, Grok, and Projects get a dated snapshot (`user-kit-YYYY-MM-DD`) via `/cut-cloud` in the sync engine.

Goals: [`GOALS.md`](GOALS.md). Engine (hooks, `/cut-cloud`): `~/.cursor/plugins/local/cursor-skills-sync/GOALS.md`.

## Layout

- `skills/<name>/SKILL.md` — personal skills
- `agents/<name>.md` — Cursor subagents

## License

MIT
