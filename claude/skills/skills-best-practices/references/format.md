# Skill format

## Layout

```
skill-name/
├── SKILL.md          # required: frontmatter + instructions
├── references/       # optional: docs loaded on demand
├── scripts/          # optional: executable code
├── assets/           # optional: templates, data files, images
└── evals/            # optional: evals.json + input files; not loaded by the agent
```

## Frontmatter

| Field | Rules |
|---|---|
| `name` | Required. 1–64 chars, `a-z`, `0-9`, single hyphens, no leading/trailing hyphen. Must equal the folder name. Specific, not `helper`/`utils`. |
| `description` | Required. ≤1024 chars. See examples below. |
| `paths` | Globs; the skill surfaces only when the agent works on matching files. |
| `disable-model-invocation` | `true` = only when the user types `/name`; never auto-applied. |
| `metadata` | String→string map for anything else. |
| `license`, `compatibility`, `allowed-tools` | Open spec. `compatibility` (≤500 chars) only for real environment needs; `allowed-tools` is experimental and not honored everywhere. |

Harnesses add fields of their own; the harness documents them. Trigger conditions belong in `description` regardless, since it is the one field every harness routes on.

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

Auto-applied when the description matches (unless disabled); `/name` attaches the skill to one message. To confirm discovery, check that the skill appears in the available-skills list of a fresh session. Absence means a frontmatter or location error, not a description problem.
