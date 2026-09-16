# Skill format and locations

## Layout

```
skill-name/
├── SKILL.md          # required: frontmatter + instructions
├── references/       # optional: docs loaded on demand
├── scripts/          # optional: executable code
├── assets/           # optional: templates, data files, images
└── evals/            # optional: evals.json + input files; not loaded by the agent
```

## Where skills live

| Scope | Path | Notes |
|---|---|---|
| Project | `.cursor/skills/` or `.agents/skills/` | Shared via the repository. Prefer `.agents/skills/` when the repo is also used with other agents. |
| Personal | `~/.cursor/skills/` or `~/.agents/skills/` | Local machine. Only `~/.cursor/skills/` can reach Cloud Agents, and only if the user enables Sync Skills; unsynced personal skills and `~/.agents/skills/` never reach Cloud Agents, remote SSH, or self-hosted workers. Synced skills stay private; to share with a team, commit a project skill or publish to the team marketplace. |
| Personal, account-synced | `skills/<name>/` under the user store path listed in the session's "Available persistent agent stores" | Cursor's built-in create-skill directs personal skills here and says the store follows the account across machines. Undocumented publicly, so confirm discovery in a fresh chat before relying on it; when no store is listed, use `~/.cursor/skills/`. |
| Managed | `~/.cursor/skills-cursor/`, plugin caches | Cursor's own; overwritten on update. Never author here—copy out instead. |

Cursor walks skill roots recursively, so category folders are fine; the skill's identity is the folder containing `SKILL.md`. A `.cursor/skills/` inside a project subdirectory is auto-scoped to files under it. Cursor also reads `.claude/skills/` and `.codex/skills/` (and `~/` forms); a skill present under two roots is discovered twice and competes with itself.

## Frontmatter

| Field | Rules |
|---|---|
| `name` | Required. 1–64 chars, `a-z`, `0-9`, single hyphens, no leading/trailing hyphen. Must equal the folder name. Specific, not `helper`/`utils`. |
| `description` | Required. ≤1024 chars. See examples below. |
| `paths` | Cursor. Globs (list or comma-separated string); skill surfaces only when the agent works on matching files. `globs` is the legacy alias. |
| `disable-model-invocation` | Cursor. `true` = only when the user types `/name`; never auto-applied. |
| `icon`, `color` | Cursor. Badge when the skill backs a Custom Mode. `color` is one of `default green cyan blue purple magenta orange yellow red brand`; unknown values silently fall back. |
| `metadata` | String→string map for anything else. |
| `license`, `compatibility`, `allowed-tools` | Open spec. `compatibility` (≤500 chars) only for real environment needs; `allowed-tools` is experimental and undocumented in Cursor; assume it is ignored. |

```yaml
# Poor: no trigger, no terms
description: Helps with PDFs.

# Good: capability, then trigger conditions as an instruction to the agent, in the user's terms, with indirect cases and a boundary
description: Extracts text and tables from PDFs, fills forms, merges files. Use when the user works with PDF documents or mentions forms or document extraction, even without saying "PDF". Not for generating new documents from scratch.
```

## Minimal complete skill

```markdown
---
name: changeset
description: Writes changeset files for @data-client package changes. Use when a change touches packages/* and needs a release note, even if the user only asks to "bump" or "release".
---

# Changeset

`yarn changeset` is interactive, so write `.changeset/<slug>.md` directly: the changed packages with bump type, then a one-line user-facing summary.

## Gotchas
- Core packages are version-linked; bump one and the others follow. Name only the ones actually changed.
- Internal-only changes get no changeset.

Read [Bump rules](references/bumps.md) when unsure whether a change is patch or minor.
```

Frontmatter, one-line purpose, the instructions every run needs, gotchas, and gated links. Nothing else is required.

## Budgets

Body under ~5000 tokens (~500 lines); references as needed. Content size has no hard limit; the frontmatter caps in the table above are the only enforced ones.

## Invocation

Auto-applied when the description matches (unless disabled). `/name` attaches the skill to one message; Option/Alt+Enter runs it as a Custom Mode for the session. To confirm discovery, the user checks Customize → Skills or types `/`; the agent checks that the skill appears in its available-skills list in a fresh chat. Absence means a frontmatter or location error, not a description problem.
