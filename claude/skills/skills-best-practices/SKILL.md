---
name: skills-best-practices
description: Write, audit, and improve Agent Skills (SKILL.md folders) in any agent harness, including format and frontmatter. Use whenever the user wants to create a skill, edit or refactor one, review or audit skill quality, fix a skill that is not being picked up or triggers too often, improve a skill's description, run evals or benchmark a skill to test whether it actually helps, split or consolidate skills, convert a rule or command into a skill, turn a conversation or repeated workflow into one, or wants the agent to reliably follow some procedure, convention, or check across sessions without being reminded - even when they never say "skill", or only point at a .cursor/skills, .claude/skills, .agents/skills, or ~/.cursor/skills path. Also use when explaining how skills work or should be written, or deciding whether guidance should become a skill. Not for subagents, rules, or instruction files, which skill "agent-instructions" covers.
license: Apache-2.0
metadata:
  sources: agentskills.io spec and guides; anthropics/skills skill-creator
---

# Skills best practices

This skill covers what is specific to skills: how they load, how they trigger, and how to test them. Read skill "agent-instructions" with it, since its principles (earn every token, generalize, remove contradictions, explain why, prefer gotchas, ground in evidence) apply to skills as to any text an agent reads, and this skill does not repeat them. For the harness's own frontmatter fields and file layout, its built-in skill-authoring skill is the reference (skill "create-skill" in Cursor, skill "skill-creator" in Claude Code); where one disagrees with this skill, the gotchas at the end decide. Read [Skill format](references/format.md) when creating a skill or checking frontmatter or naming against the open spec; read [Body patterns](references/patterns.md) when choosing how to structure body content.

## Why the rules exist

A skill transfers expertise the agent lacks. Its content competes for attention with the task, the conversation, and other skills, and it is read in layers: description at startup, body on activation, references only when the body sends the agent there. Every principle below follows from that.

## Principles

### Layer by when it is needed

- Once a skill is presented (after `paths` or directory scoping), name and description are the whole input to the auto-trigger decision; the body is read only afterward. Trigger conditions go in the description.
- The body holds what every activation needs. References hold what only some activations need, each introduced by the condition that calls for it: "Read [API errors](references/<topic>.md) if the response is non-200." A bare "see references/ for details" loads never or always.
- Gotchas stay in the body even when long, because the agent cannot know to load a file for a trap it does not know exists.
- One level deep: `SKILL.md` links to references; references do not chain onward. Split large reference sets by variant (one file per framework or platform) so a run reads one; give long references a table of contents.
- Point at the next layer unambiguously. Link bundled documents as `[Concept Name](references/<file>.md)` from the skill root, so the agent gets a readable name and a resolvable path. Invoke scripts as `python3 <skill-dir>/scripts/x.py`, where `<skill-dir>` is the folder containing the `SKILL.md` being followed and the consuming agent substitutes it; the shell runs from the workspace, so the base must be explicit. Name other skills as skill "skill-name" (the literal word skill, then the name in quotes), never by path or slash command; paths differ per machine and slash syntax means "invoke", not "consult".

### Choose the trigger lever

| Relevance is determined by | Use |
|---|---|
| User intent | `description` alone; invest in its precision |
| File type being edited | `paths` globs; description can be terse |
| Location in a monorepo | Place the skill in that subdirectory's skills root |
| Explicit user request only (slash-command workflows, costly or destructive procedures) | `disable-model-invocation: true`; trigger tuning is moot |

The default is auto-invocation; reserve explicit-only for procedures the user initiates. Current models also skip skills for tasks they can do trivially, so a matching description may not fire on one-step requests; that is expected.

### Scope as one coherent unit

Like a function: one job that composes with other skills. Too narrow forces several skills to load and conflict; too broad triggers imprecisely and buries the relevant part. When two skills overlap, identify each one's unique value, merge shared content into the more general one, and sharpen both descriptions so scopes do not overlap. Before writing a new skill, list what is already discoverable and prefer extending it.

## Workflows

### Creating

1. Mine the conversation before asking: purpose and scope, when it should apply, what the agent got wrong or the user corrected, input and output formats, project facts the agent lacked, existing conventions to follow. Interview only for gaps (edge cases, success criteria, dependencies, personal vs. project scope). Preserve user-provided wording when it is valid and unambiguous; otherwise preserve its intent and explain the necessary correction.
2. Confirm a skill is the right container ("Where guidance belongs" in skill "agent-instructions"), then choose the lever from the table above, which sets how much the description must do. Converting an existing rule or command keeps its trigger semantics: intelligently-applied rule → auto-invoked skill, slash command → explicit-only. A skill's contents must match what its description leads the user to expect; decline skills whose purpose is deception or unauthorized access.
3. Draft using [Skill format](references/format.md) and [Body patterns](references/patterns.md), then read it cold as in Auditing and run `python3 <skill-dir>/scripts/validate_skill.py <target>`.
4. Offer testing per Verify with execution and let the user decide: no eval artifacts until they opt in, and cases shown to them before any run. Explain jargon such as "eval" or "assertion" unless the user shows familiarity.

### Improving

1. Classify the failure: mis-triggering → description or lever; wrong behavior → ambiguous, missing, or misleading instructions; slow or wasteful runs → bloat or instructions that do not apply; drift → stale conventions.
2. Snapshot before editing so the old version is the baseline (location and layout in [Output-quality evals](references/evals.md)). Preserve `name` and folder. Managed skills (built-ins, plugin caches) are overwritten on update, so copy into your own skills directory and give the copy a distinct name and sharpened description—two discovered skills with one name and description compete, and precedence is undocumented.
3. Apply the principles here and in skill "agent-instructions": fix the class, remove before adding, resolve conflicts, re-layer. If the skill has evals or checkable outputs, re-run against the snapshot; otherwise cold-read as in Auditing and have the user retry the failing prompt.

### Auditing

Read as an agent would, cold: description only, then body, then references only where the body sends you. Check each principle here and in skill "agent-instructions", then report in priority order:

- Would the description fire on realistic indirect prompts and stay quiet on near-misses that share its keywords?
- Are there gotchas the skill's history (git log, prior corrections) implies but the skill omits?
- Do bundled scripts meet [Scripts and commands](references/scripts.md)?
- Does `python3 <skill-dir>/scripts/validate_skill.py <target>` pass?

Then offer one eval iteration under the same gate as Creating step 4: output evals when outputs are checkable, a trigger eval only when the audit raised trigger concerns.

## Verify with execution

- Read [Output-quality evals](references/evals.md) when outputs are objectively checkable (transforms, extraction, generated code, fixed procedures); subjective outputs (tone, design) need human review instead.
- Read [Trigger accuracy](references/triggering.md) for any auto-invoked skill before shipping a description, or when it under- or over-triggers. Tune the description after the body is stable, since body changes move the boundary it must express.
- Read [Scripts and commands](references/scripts.md) before writing or reviewing any bundled script or one-off command, or when transcripts show the agent rewriting the same helper.

Eval-model rule: run skill-under-test runs on a cheap model of the current generation at medium effort or above, unless the user says otherwise; grade with a stronger one. A skill that only works when a frontier model fills in the gaps is under-specified, so a smaller current model exposes ambiguity, missing steps, and vague triggers, and passing there means the skill works across the models users actually run. Not a frontier model at low effort, and not an older generation (its failures reflect outdated training, and working around them bloats the skill). Use the user's own model only when they ask for fidelity to their setup. In Cursor, pick from the list the run mechanism offers: the Cursor-branded slug of the newest version at the lowest effort suffix that is still medium or above; if none is offered, Composer (which has no effort tiers). In Claude Code, use Sonnet: `model: sonnet` on each subagent run, `--model sonnet --effort medium` on the CLI. Not Haiku: it is tuned to follow one instruction, so it under-uses skills and its trigger and skill-following results do not reflect the models users run skills on.

Stop when feedback is empty, the user is satisfied, or gains stop justifying cost.

## Gotchas: source guidance that looks contradictory

- **"Write descriptions in third person" vs. "use imperative phrasing".** The first rejects sentences aimed at the user ("I can help you…", "You can use this to…"); the second wants an instruction aimed at the agent. Both are satisfied by a capability statement followed by "Use when…": "Extract tables from PDFs. Use when…".
- **The docs' `SKILL.md` template shows a "When to Use" body section vs. "all trigger info goes in the description".** Omit the section from auto-invoked skills. Body conditionals route within the skill—including, for `/`-invoked skills, which parts of a conversation the skill applies to.
- **"Keep under 500 lines" vs. "go longer if needed".** The number is an attention heuristic, not a quota or a wall. Every line earns its place; when legitimately longer, split by when-needed.
- **Cursor's built-in skill "create-skill" says "Default `disable-model-invocation: true` … omit it only when the agent should auto-invoke from ambient context" vs. the platform's auto-invoke default.** The built-in states a blanket policy; this skill instead chooses the lever from the table above, because explicit-only forfeits the main value of a skill—help on tasks the user would not think to ask for—and is the right choice only when the user always initiates the procedure.
- **Claude Code's skill "skill-creator" runs its description-optimization loop on "the model powering this session" vs. the eval-model rule above.** Its choice tests fidelity to one user's setup; the eval-model rule tests whether the skill works across the models users run. Use the eval-model rule unless the user asks for fidelity, and pass that model to skill-creator's scripts if you use them.
- **The docs invoke scripts as `python scripts/<x>.py` vs. this skill's `python3 <skill-dir>/scripts/<x>.py`.** The docs' relative form assumes the running agent knows the skill folder; the placeholder makes that explicit for an agent whose shell runs from the workspace.
