# Body patterns

Reusable shapes for skill content. Pick the one that matches how the task fails without guidance; most skills use two or three.

## Decision table (routing)

Condition → action, branches mutually exclusive, default first, each leaf pointing at the step or reference that handles it:

```markdown
| Situation | Do |
|---|---|
| Creating new content | Follow "Creation" below |
| Editing existing content | Follow "Editing" below; read [Edit rules](references/editing.md) first |
```

## Template (output format)

Agents pattern-match structures better than they follow prose descriptions of format. Inline when short; in `assets/` when long or only sometimes needed.

```markdown
Use this structure, adapting sections to the analysis:
# [Title]
## Summary        — one paragraph
## Findings       — bullets with supporting data
## Recommendations — numbered, actionable
```

## Examples (input → output)

When quality depends on seeing the target, show two or three short pairs rather than describing the style.

```markdown
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

## Checklist (gated sequence)

When steps have dependencies or validation gates, an explicit list keeps the agent from skipping.

```markdown
- [ ] Analyze the form: `python3 <skill-dir>/scripts/analyze.py in.pdf > fields.json`
- [ ] Map fields in `values.json`
- [ ] Validate: `python3 <skill-dir>/scripts/validate.py fields.json values.json`
- [ ] Fill and verify output
```

## Validation loop

Do the work, run a validator (script or reference checklist), fix, repeat until it passes. For batch or destructive operations, validate a structured plan against a source of truth before executing it.

## Deprecated information

Current method first; legacy collapsed so it costs nothing unless needed:

```markdown
## Old patterns
<details><summary>Legacy v1 API</summary>…</details>
```
