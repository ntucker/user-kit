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

| Scope | Cursor | Claude Code |
|---|---|---|
| Project | `.cursor/skills/`, `.agents/skills/`, or `.claude/skills/` | `.claude/skills/` in the start directory and each parent up to the repo root |
| Personal | `~/.cursor/skills/`, `~/.agents/skills/`, or `~/.claude/skills/` | `~/.claude/skills/` |
| Plugin | The plugin's `skills/` | The plugin's `skills/`, namespaced `<plugin>:<name>` |
| Cloud | Only `~/.cursor/skills/` with Sync Skills enabled, or the account store below | Skills enabled on the claude.ai account plus the repo's `.claude/skills/`; `~/.claude/skills/` is not read |
| Managed | `~/.cursor/skills-cursor/`, plugin caches | Bundled and plugin skills |

Default to `.claude/skills/` (or `~/.claude/skills/`) when a skill must work in both harnesses: Cursor reads it, while Claude Code does not read `.cursor/` or `.agents/` roots. Otherwise use the harness's own root. Never author under a managed location; it is overwritten on update, so copy out instead.

Cursor:

- Walks skill roots recursively, so category folders are fine; the skill's identity is the folder containing `SKILL.md`. A skill present under two roots is discovered twice and competes with itself.
- A `.cursor/skills/` inside a project subdirectory is auto-scoped to files under it.
- Unsynced personal skills and `~/.agents/skills/` never reach Cloud Agents, remote SSH, or self-hosted workers. Synced skills stay private; to share with a team, commit a project skill or publish to the team marketplace.
- Account-synced store: `skills/<name>/` under the user store path listed in the session's "Available persistent agent stores". Cursor's built-in create-skill directs personal skills here and says the store follows the account across machines. Undocumented publicly, so confirm discovery in a fresh chat before relying on it; when no store is listed, use `~/.cursor/skills/`.

Claude Code:

- Documents only `<root>/<name>/SKILL.md`; category folders are undocumented, so keep a skill that must work in both harnesses one level under its root.
- A `.claude/skills/` below the start directory loads the first time the agent reads or edits a file in that subdirectory, which scopes it like Cursor's subdirectory skills.
- Plugin skills are namespaced, so a plugin copy and a personal copy of one skill both load and compete on description.

## Frontmatter

| Field | Rules |
|---|---|
| `name` | Required. 1–64 chars, `a-z`, `0-9`, single hyphens, no leading/trailing hyphen. Must equal the folder name. Specific, not `helper`/`utils`. |
| `description` | Required. ≤1024 chars (open spec; Claude Code truncates `description` plus `when_to_use` at 1536 in its listing). See examples below. |
| `paths` | Both. Globs; the skill surfaces only when the agent works on matching files. In Cursor, a list or comma-separated string, with `globs` as the legacy alias. |
| `disable-model-invocation` | Both. `true` = only when the user types `/name`; never auto-applied. |
| `icon`, `color` | Cursor. Badge when the skill backs a Custom Mode. `color` is one of `default green cyan blue purple magenta orange yellow red brand`; unknown values silently fall back. |
| `allowed-tools` | Open spec, experimental. Claude Code pre-approves the listed tools while the skill runs; Cursor does not document it, so assume it is ignored there. |
| `when_to_use`, `user-invocable`, `argument-hint`, `model`, `effort`, `context`, `agent` | Claude Code. `user-invocable: false` hides it from `/`; `context: fork` runs it in a subagent (`agent` picks which). Cursor ignores these, so trigger text belongs in `description`, never only in `when_to_use`. |
| `metadata` | String→string map for anything else. |
| `license`, `compatibility` | Open spec. `compatibility` (≤500 chars) only for real environment needs. |

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

Auto-applied when the description matches (unless disabled). `/name` attaches the skill to one message (`/<plugin>:<name>` for a Claude Code plugin skill). In Cursor, Option/Alt+Enter runs it as a Custom Mode for the session. To confirm discovery, the agent checks that the skill appears in its available-skills list in a fresh session; the user checks Customize → Skills or types `/` in Cursor, or types `/` in Claude Code. Absence means a frontmatter or location error, not a description problem.
