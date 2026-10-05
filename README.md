# user-kit

Personal Cursor skills and subagents. This repository is the **origin source of truth**. Desktop authoring is the clone at `~/.cursor/plugins/local/user-kit`. `cursor-skills-sync` commits and pushes that checkout here.

This repository is public. Do not put secrets in it.

**Do not install this repo from the Cursor marketplace.** Why that freezes this desktop, and how cloud copies stay fresh, is in [`GOALS.md`](GOALS.md).

Hooks and `/cut-cloud` stay in the separate `cursor-skills-sync` engine.

## Layout

- `skills/<name>/SKILL.md` — personal skills
- `agents/<name>.md` — Cursor subagents

## License

MIT
