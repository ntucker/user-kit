---
name: skills-best-practices
description: Write, audit, and improve Agent Skills (SKILL.md folders) for Cursor, including format, frontmatter, and where skills live. Use whenever the user wants to create a skill, edit or refactor one, review or audit skill quality, fix a skill that is not being picked up or triggers too often, improve a skill's description, run evals or benchmark a skill to test whether it actually helps, split or consolidate skills, convert a rule or command into a skill, turn a conversation or repeated workflow into one, or wants the agent to reliably follow some procedure, convention, or check across sessions without being reminded - even when they never say "skill", or only point at a .cursor/skills, .agents/skills, or ~/.cursor/skills path. Also use when explaining how skills work or should be written. Not for writing rules, hooks, or subagents, except to decide whether persistent behavior belongs in a skill or a rule.
license: Apache-2.0
metadata:
  sources: agentskills.io spec and guides; anthropics/skills skill-creator; cursor.com/docs/context/skills
---

# Skills best practices

This skill is about judgment: deciding what a skill should say, arranging it so an agent acts on it correctly, and knowing whether it works. Mechanics live in references, each linked where it applies: read [Skill format and locations](references/format.md) when creating a skill or checking frontmatter, naming, or where a skill should live; read [Body patterns](references/patterns.md) when choosing how to structure body content.

## Why the rules exist

A skill transfers expertise the agent lacks. Its content competes for attention with the task, the conversation, and other skills, and it is read in layers: description at startup, body on activation, references only when the body sends the agent there. Every principle below follows from that.

## Principles

### Earn every token

Include only what the agent would get wrong without it: project conventions, non-obvious procedures, the specific tool to use, traps. Moderate detail beats exhaustive detail: an over-comprehensive skill makes the agent follow inapplicable instructions and hunt for the relevant ones. When unsure whether a sentence—or the whole skill—earns its place, run with and without it.

### Generalize, do not overfit

A skill runs against prompts you will never see. Teach how to approach the class of task rather than the answer to one instance; keep specifics in templates, constraints, and gotchas. When fixing a failure, ask what general principle would have prevented it, and encode that; a patch for one prompt costs every other prompt. When incremental edits stall, change the framing or structure rather than adding words. Hold back some test cases so you can tell generalization from memorization.

### Layer by when it is needed

- Once a skill is presented (after `paths` or directory scoping), name and description are the whole input to the auto-trigger decision; the body is read only afterward. Trigger conditions go in the description.
- The body holds what every activation needs. References hold what only some activations need, each introduced by the condition that calls for it: "Read [API errors](references/<topic>.md) if the response is non-200." A bare "see references/ for details" loads never or always.
- Gotchas stay in the body even when long, because the agent cannot know to load a file for a trap it does not know exists.
- One level deep: `SKILL.md` links to references; references do not chain onward. Split large reference sets by variant (one file per framework or platform) so a run reads one; give long references a table of contents.
- Point at the next layer unambiguously. Link bundled documents as `[Concept Name](references/<file>.md)` from the skill root, so the agent gets a readable name and a resolvable path. Invoke scripts as `python3 <skill-dir>/scripts/x.py`, where `<skill-dir>` is the folder containing the `SKILL.md` being followed and the consuming agent substitutes it; the shell runs from the workspace, so the base must be explicit. Name other skills as skill "skill-name" (the literal word skill, then the name in quotes), never by path or slash command; paths differ per machine and slash syntax means "invoke", not "consult".

### Remove contradictions and ambiguity

Two instructions that conflict, or merely look like they conflict, make the agent pick one arbitrarily or oscillate between them. Most apparent conflicts are two true statements about different regimes. Resolve them at authoring time: find the intent behind each, identify the variable that decides which applies, and write the resolved rule once as a condition rather than leaving both rules standing. Use one term per concept throughout, and pick one default and gate every alternative on the explicit case that selects it. Never write time-relative instructions ("before August use the old API"); state the current method and collapse the old one under a deprecated heading. The gotchas section below shows conflict resolution applied to the sources of this skill.

### Encode branching knowledge as decision trees

When the right action depends on several factors, a table or tree of condition → action routes the agent in one read; the same information as prose forces it to hold every branch in mind and infer the routing. Make branches mutually exclusive, put the default first, and point each leaf at the reference or step that handles it. Cursor's triggering levers, for example:

| Relevance is determined by | Use |
|---|---|
| User intent | `description` alone; invest in its precision |
| File type being edited | `paths` globs; description can be terse |
| Location in a monorepo | Place the skill in that subdirectory's `.cursor/skills/` or `.agents/skills/` |
| Explicit user request only (slash-command workflows, costly or destructive procedures) | `disable-model-invocation: true`; trigger tuning is moot |
| Whole-session behavior the user opts into (a working style, a playbook) | Design for Custom Mode: lean body, since it is present every turn |

Cursor's default is auto-invocation; reserve explicit-only for procedures the user initiates. Current models also skip skills for tasks they can do trivially, so a matching description may not fire on one-step requests; that is expected.

### Explain why; be rigid only where fragile

Reasoning lets the agent handle cases you did not foresee; a bare directive does not. Reserve exact commands, fixed output formats, and "do not modify" for places where variation breaks things, and give even those a one-clause reason. ALL-CAPS MUST or NEVER is a signal that a reason is missing.

### Prefer gotchas to advice

The highest-value content is usually concrete corrections to mistakes the agent will otherwise make: soft-deleted rows that need a filter, one identifier with three names, a health endpoint that lies. A gotcha covers what the procedure does not already say; if a table row or step encodes it, do not restate it as a bullet. Whenever you correct the agent during real use, add the correction as a gotcha.

### Scope as one coherent unit

Like a function: one job that composes with other skills. Too narrow forces several skills to load and conflict; too broad triggers imprecisely and buries the relevant part. When two skills overlap, identify each one's unique value, merge shared content into the more general one, and sharpen both descriptions so scopes do not overlap. Before writing a new skill, list what is already discoverable and prefer extending it.

### Ground in evidence; verify by execution

Write from real runs and artifacts: corrections you made, runbooks, schemas, review comments, fix history, execution transcripts, and for library or API skills the current documentation rather than memory. Skills written from general knowledge produce "follow best practices" filler and stale flags. Do not add steps, commands, or rules the source material did not give you: an invented procedure reads as authoritative and is followed as one. Then test with the agent, not by rereading: run test prompts with and without the skill in fresh contexts, read transcripts for wasted steps and ignored instructions, and remove before adding. Show outputs to the human before revising on your own judgment.

## Workflows

### Creating

1. Mine the conversation before asking: purpose and scope, when it should apply, what the agent got wrong or the user corrected, input and output formats, project facts the agent lacked, existing conventions to follow. Interview only for gaps (edge cases, success criteria, dependencies, personal vs. project scope). Preserve user-provided wording when it is valid and unambiguous; otherwise preserve its intent and explain the necessary correction.
2. Confirm the container, then the lever (which sets how much the description must do):

   | The guidance should apply… | Container |
   |---|---|
   | On demand, when a task matches | Skill (default) |
   | Every turn of every session | Always-applied rule |
   | Every turn, only when the user opts in | Skill used as a Custom Mode |
   | With matching files, a few lines | Glob rule |
   | With matching files, more than a few lines or needing references or scripts | Skill with `paths` |
   | As a delegated role with its own context | Subagent |
   | As a deterministic action on an agent event | Hook |

   Converting an existing rule or command keeps its trigger semantics: intelligently-applied rule → auto-invoked skill, slash command → explicit-only (skill "migrate-to-skills" automates these). A skill's contents must match what its description leads the user to expect; decline skills whose purpose is deception or unauthorized access.
3. Draft using [Skill format and locations](references/format.md) and [Body patterns](references/patterns.md), then read it cold as in Auditing and run `python3 <skill-dir>/scripts/validate_skill.py <target>`.
4. Offer testing per Verify with execution and let the user decide: no eval artifacts until they opt in, and cases shown to them before any run. Explain jargon such as "eval" or "assertion" unless the user shows familiarity.

### Improving

1. Classify the failure: mis-triggering → description or lever; wrong behavior → ambiguous, missing, or misleading instructions; slow or wasteful runs → bloat or instructions that do not apply; drift → stale conventions.
2. Snapshot before editing so the old version is the baseline (location and layout in [Output-quality evals](references/evals.md)). Preserve `name` and folder. Managed skills (Cursor built-ins, plugin caches) are overwritten on update, so copy into your own skills directory and give the copy a distinct name and sharpened description—two discovered skills with one name and description compete, and precedence is undocumented.
3. Apply the principles above: fix the class, remove before adding, resolve conflicts, re-layer. If the skill has evals or checkable outputs, re-run against the snapshot; otherwise cold-read as in Auditing and have the user retry the failing prompt.

### Auditing

Read as an agent would, cold: description only, then body, then references only where the body sends you. Check each principle above, then report in priority order:

- Would the description fire on realistic indirect prompts and stay quiet on near-misses that share its keywords?
- Are there gotchas the skill's history (git log, prior corrections) implies but the skill omits?
- Do bundled scripts meet [Scripts and commands](references/scripts.md)?
- Does `python3 <skill-dir>/scripts/validate_skill.py <target>` pass?

Then offer one eval iteration under the same gate as Creating step 4: output evals when outputs are checkable, a trigger eval only when the audit raised trigger concerns.

## Verify with execution

- Read [Output-quality evals](references/evals.md) when outputs are objectively checkable (transforms, extraction, generated code, fixed procedures); subjective outputs (tone, design) need human review instead.
- Read [Trigger accuracy](references/triggering.md) for any auto-invoked skill before shipping a description, or when it under- or over-triggers. Tune the description after the body is stable, since body changes move the boundary it must express.
- Read [Scripts and commands](references/scripts.md) before writing or reviewing any bundled script or one-off command, or when transcripts show the agent rewriting the same helper.

Eval-model rule: run skill-under-test runs on a cheap model of the current generation at medium effort or above, unless the user says otherwise; grade with a stronger one. A skill that only works when a frontier model fills in the gaps is under-specified, so a smaller current model exposes ambiguity, missing steps, and vague triggers, and passing there means the skill works across the models users actually run. Not a frontier model at low effort, and not an older generation (its failures reflect outdated training, and working around them bloats the skill). Use the user's own model only when they ask for fidelity to their setup. In Cursor, pick from the list the run mechanism offers: the Cursor-branded slug of the newest version at the lowest effort suffix that is still medium or above; if none is offered, Composer (which has no effort tiers).

Stop when feedback is empty, the user is satisfied, or gains stop justifying cost.

## Gotchas: source guidance that looks contradictory

- **"Write descriptions in third person" vs. "use imperative phrasing".** The first rejects sentences aimed at the user ("I can help you…", "You can use this to…"); the second wants an instruction aimed at the agent. Both are satisfied by a capability statement followed by "Use when…": "Extract tables from PDFs. Use when…".
- **The docs' `SKILL.md` template shows a "When to Use" body section vs. "all trigger info goes in the description".** Omit the section from auto-invoked skills. Body conditionals route within the skill—including, for `/`-invoked or Custom Mode skills, which parts of a conversation the skill applies to.
- **"Keep under 500 lines" vs. "go longer if needed".** The number is an attention heuristic, not a quota or a wall. Every line earns its place; when legitimately longer, split by when-needed.
- **Skill "create-skill" says "Default `disable-model-invocation: true` … omit it only when the agent should auto-invoke from ambient context" vs. the platform's auto-invoke default.** The built-in states a blanket policy; this skill instead chooses the lever from the table above, because explicit-only forfeits the main value of a skill—help on tasks the user would not think to ask for—and is the right choice only when the user always initiates the procedure.
- **The docs invoke scripts as `python scripts/<x>.py` vs. this skill's `python3 <skill-dir>/scripts/<x>.py`.** The docs' relative form assumes the running agent knows the skill folder; the placeholder makes that explicit for an agent whose shell runs from the workspace.
