---
name: skills-best-practices
description: Write, audit, and improve Agent Skills (SKILL.md folders) in any agent harness, including format and frontmatter. Use whenever the user wants to create a skill, edit or refactor one, review or audit skill quality, fix a skill that is not being picked up or triggers too often, improve a skill's description, run evals or benchmark a skill to test whether it actually helps, split or consolidate skills, convert a rule or command into a skill, turn a conversation or repeated workflow into one, or wants the agent to reliably follow some procedure, convention, or check across sessions without being reminded - even when they never say "skill", or only point at a .cursor/skills, .claude/skills, .agents/skills, or ~/.cursor/skills path. Also use when explaining how skills work or should be written, or turning existing guidance into a skill. Not for subagents, rules, or instructions files, which skill "agent-instructions" covers.
license: Apache-2.0
metadata:
  sources: agentskills.io spec and guides; anthropics/skills skill-creator
---

# Skills best practices

This skill covers what is specific to skills: how they load, how they trigger, and how to test them. Read skill "agent-instructions" with it; its principles, Writing and Editing workflows, wording rules, and body patterns apply to skills as to any text an agent reads, and are not repeated here. The harness's built-in skill-authoring skill (skill "create-skill" in Cursor, skill "skill-creator" in Claude Code) decides frontmatter fields and file layout; how to write and test a skill follows this skill and skill "agent-instructions", and the gotchas at the end settle the specific disagreements found so far.

## Principles

A skill transfers expertise the agent lacks. It competes for attention with the task, the conversation, and other skills, and it is read in layers: the description at startup, the body on activation, references only when the body sends the agent there. Each layer should hold what every reader of that layer needs and point at the next one unambiguously.

### Layer by when it is needed

- Once a skill is presented (after `paths` or directory scoping), its name and description alone decide auto-triggering, and the body is read only afterward, so trigger conditions go in the description.
- The body holds what every activation needs, including every gotcha however long the list, because the agent cannot know to load a file for a trap it does not know exists. A reference holds what only some activations need, introduced by the condition that calls for it ("Read [API errors](references/<topic>.md) if the response is non-200"); a bare "see references/ for details" loads never or always.
- References are one level deep and never link onward. Split a large set by variant (one file per framework or platform) so a run reads one, and give a long reference a table of contents.
- Link a bundled document as `[Concept Name](references/<file>.md)` from the skill root, for a readable name and a resolvable path. Invoke a script as `python3 <skill-dir>/scripts/x.py`, where the consuming agent substitutes the folder containing the `SKILL.md` it is following, because the shell runs from the workspace. Name other skills as skill "agent-instructions" says.

### Choose the trigger lever

| Relevance is determined by | Use |
|---|---|
| User intent | `description` alone; invest in its precision |
| File type being edited | `paths` globs; description can be terse |
| Location in a monorepo | Place the skill in that subdirectory's skills root |
| Explicit user request only (slash-command workflows, costly or destructive procedures) | `disable-model-invocation: true`; trigger tuning is moot |

Auto-invocation is the default, because a skill's main value is help on tasks the user would not think to ask for; explicit-only is right only for procedures the user always initiates. A matching description may still not fire on a one-step request the model can do trivially; that is expected.

### Scope as one coherent unit

Like a function: one job that composes with other skills. Too narrow makes several skills load and conflict; too broad triggers imprecisely and buries the relevant part. Before writing a skill, list what is already discoverable and prefer extending it. When two skills overlap, identify each one's unique value, merge shared content into the more general one, and sharpen both descriptions so their scopes do not overlap.

## Workflows

### Creating

1. Gather as in "Writing" in skill "agent-instructions", and also settle the skill's dependencies and whether it is personal or project-scoped.
2. Confirm a skill is the right container ("Where guidance belongs" in skill "agent-instructions"), then choose the lever, which sets how much the description must do. A converted rule or command keeps its trigger semantics: intelligently-applied rule → auto-invoked skill; path-scoped rule → skill with `paths`, unless a few lines that stay a rule do the job; slash command → explicit-only; an always-applied rule stays a rule unless only some tasks need it. The contents must match what the description leads the user to expect; decline skills whose purpose is deception or unauthorized access.
3. Draft the body as in "Writing" in skill "agent-instructions" and the frontmatter with [Skill format](references/format.md), layered as above. Read it cold as in Auditing and run `python3 <skill-dir>/scripts/validate_skill.py <target>`.
4. Offer measured testing per Verify with execution and let the user decide: no eval artifacts until they opt in, and cases shown to them before any run. Explain jargon such as "eval" or "assertion" unless the user shows familiarity.

### Editing

Follow "Editing" in skill "agent-instructions", adding at its steps:

- **Step 1:** mis-triggering points at the description or the lever; content the agent reads too late, or never, points at re-layering.
- **Step 2:** snapshot the skill before the first change, laid out as in [Output-quality evals](references/evals.md). A skill of your own keeps its `name` and folder. A managed one (built-ins, plugin caches) is overwritten on update, so copy it into your own skills directory under a distinct name with a sharpened description; two discovered skills with one name and description compete, and precedence is undocumented.
- **Step 4:** if the skill has evals or checkable outputs, offer to re-run them against the snapshot under Creating step 4's gate; otherwise cold-read as in Auditing and have the user retry the failing prompt.

### Auditing

Audit as in skill "agent-instructions", against the principles here as well, and add to the report whether frontmatter and naming meet [Skill format](references/format.md), whether bundled scripts meet [Scripts and commands](references/scripts.md) and whether `python3 <skill-dir>/scripts/validate_skill.py <target>` passes. Then offer one eval iteration under Creating step 4's gate: output evals when outputs are checkable, a trigger eval only when the audit raised trigger concerns.

## Verify with execution

- Read [Output-quality evals](references/evals.md) when outputs are objectively checkable (transforms, extraction, generated code, fixed procedures); subjective outputs (tone, design) need human review instead.
- Read [Trigger accuracy](references/triggering.md) for any auto-invoked skill before shipping a description, or when it under- or over-triggers. Tune the description after the body is stable, since body changes move the boundary it must express.
- Read [Scripts and commands](references/scripts.md) before writing or reviewing any bundled script or one-off command, or when transcripts show the agent rewriting the same helper.

Eval-model rule: a skill that only works when a frontier model fills in its gaps is under-specified, so run skill-under-test runs on a cheap model of the current generation at medium effort or above, and grade with a stronger one; passing there means the skill works across the models users actually run. Not a frontier model at low effort, and not an older generation, whose failures reflect outdated training and whose workarounds bloat the skill. Use the user's own model only when they ask for fidelity to their setup, or another model when they say so. In Cursor, pick from the list the run mechanism offers the Cursor-branded slug of the newest version at the lowest effort suffix still medium or above, or Composer (which has no effort tiers) if none is offered. In Claude Code, use Sonnet (`model: sonnet` on each subagent run, `--model sonnet --effort medium` on the CLI), not Haiku: it is tuned to follow one instruction, so it under-uses skills and its results do not reflect the models users run skills on.

Stop when feedback is empty, the user is satisfied, or gains stop justifying cost.

## Gotchas: source guidance that looks contradictory

- **"Write descriptions in third person" vs. "use imperative phrasing".** The first rejects sentences aimed at the user ("I can help you…", "You can use this to…"); the second wants an instruction aimed at the agent. A capability statement followed by "Use when…" satisfies both: "Extract tables from PDFs. Use when…".
- **The docs' `SKILL.md` template shows a "When to Use" body section.** Omit it from auto-invoked skills. Body conditionals route within the skill, including, for `/`-invoked skills, which parts of a conversation the skill applies to.
- **"Keep under 500 lines" vs. "go longer if needed".** The number is an attention heuristic, not a quota or a wall; when a skill is legitimately longer, split it by when content is needed.
- **Cursor's skill "create-skill" defaults to `disable-model-invocation: true`.** Choose the lever from the table instead.
- **Claude Code's skill "skill-creator" optimizes descriptions on "the model powering this session".** That tests one user's setup; pass its scripts the model the eval-model rule picks.
- **Cursor's skill "migrate-to-skills" copies a rule or command body verbatim.** Migrate verbatim first so the conversion is reviewable on its own, then improve the new skill as a second change.
- **The docs invoke scripts as `python scripts/<x>.py`.** Use the `<skill-dir>` form above.
