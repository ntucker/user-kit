---
name: agent-instructions
description: Write, audit, and improve text whose reader is an agent - briefs and prompts handed to another agent, subagent definitions, AGENTS.md or CLAUDE.md, rules, and system prompts - and the principles skills share with them. Use whenever the user asks for a brief or prompt to give a subagent or another agent, or asks where an instruction should live (skill, rule, AGENTS.md or CLAUDE.md, subagent, or hook), even as a quick question answerable in one reply. Also use when the user creates, edits, or reviews a subagent, writes, edits, or slims an instructions file or rule, asks whether a role should be a subagent or a skill, or says an agent keeps ignoring or misreading its instructions, even if the user never says "prompt" or "subagent". Not for prose a person reads, which "writer" covers, or for skill format, triggering, and evals, which skill "skills-best-practices" covers.
---

# Agent instructions

An agent acts on every sentence it reads, cannot ask what you meant, and reads your text beside the task, the conversation, and everything else loaded. This skill covers writing such text and editing what exists, the principles behind both, what differs by kind, and how to audit and verify it. For a skill, apply them together with skill "skills-best-practices", which covers skill format, triggering, and evals.

File formats, frontmatter fields, and locations belong to each harness, and its built-in authoring skills are the reference for them: in Cursor, skill "create-subagent", skill "create-rule", and skill "create-hook"; in Claude Code, the `/agents` command for subagents, `/init` for a first CLAUDE.md, and skill "update-config" for hooks. They decide fields and locations; on how to write the text, follow this skill.

## Writing

1. **Gather before drafting.** Mine the conversation first: the purpose and scope, when the text should apply, what the agent got wrong or the user corrected, input and output formats, project facts the agent lacked, and conventions to follow. Ask the user only about gaps such as edge cases and success criteria. Keep the user's own wording where it is valid and unambiguous; otherwise keep its intent and say what you corrected. When the text will be reused and there is no record of failures, run the task once with an agent that lacks the text and note where it goes wrong: those failures are what the text must fix.
2. **Choose the container** from "Where guidance belongs" below. For a skill, continue with "Creating" in skill "skills-best-practices", which builds on this workflow; for a hook, the harness reference above is enough; otherwise read the section below for that kind.
3. **Draft for the reader.** Decide what the agent should do differently after reading, and write only toward that. Structure the text by how it will be used, with the shapes in [Body patterns](references/patterns.md): a decision table for routing, a template for output format, examples for style, a checklist for gated steps. Then apply the principles below and the wording rules after this list.
4. **Read it cold, then check it by execution.** Audit the draft as in "Auditing", then check it as in "Verify".

Wording that agents follow reliably:

- Address the agent in the imperative, and put the condition before the action ("If the migration fails, roll back first") so the agent knows whether a line applies before it acts on it.
- Say what to do. A bare prohibition names the wrong action and leaves the right one to guess; when a "do not" is needed, give the alternative beside it.
- Write full sentences outside tables. Fragments and arrow chains drop the "because", "unless", and "only when" that tell the agent how far a rule reaches.
- Name the exact tool, command, file, or field rather than a category of them. Refer to a skill as skill "name" (the word skill, then the name in quotes), never by path or slash command: paths differ per machine, and slash syntax means "invoke", not "consult".
- Show a short real example when the target is easier to see than to describe. The agent copies an example's specifics, so use two or three that differ in what should vary.
- Put what every run needs first and the rare cases last, each behind the condition that calls for it.

## Editing

Most of the work is on text that already exists, and an edit aimed at one case can break the cases that already worked.

1. **Find what is wrong before changing anything.** Match the symptom to its usual cause: the text loads, or work is delegated, for the wrong tasks → the description or other routing text; the agent does the wrong thing → an instruction that is ambiguous, missing, misleading, or contradicted by another loaded file; runs are slow or wasteful → bloat or instructions that do not apply; advice is out of date → conventions the code has moved past. When the user asks only to make the text better, audit it as in "Auditing" and work from the findings.
2. **Keep the old version as the baseline**, in git or as a copy, so the result can be compared with it.
3. **Fix the class, with the smallest change that does it.** Encode the general rule that would have prevented the failure rather than a patch for this case. Remove or rewrite before adding, and resolve any contradiction the change creates. Keep the user's wording and the structure where they already work; when the text has grown by patches, restructure it rather than adding another.
4. **Re-check what failed and what worked.** Run the failing case and a few that passed before, against the baseline, as in "Verify".

## Principles

### Earn every token

Include only what the agent would get wrong without it: project conventions, non-obvious procedures, the specific tool to use, traps. Moderate detail beats exhaustive detail: over-comprehensive instructions make the agent follow inapplicable ones and hunt for the relevant ones. When unsure whether a sentence earns its place, run with and without it.

### Generalize, do not overfit

Instructions run against cases you will never see. Teach how to approach the class of task rather than the answer to one instance; keep specifics in templates, constraints, and gotchas. When fixing a failure, ask what general principle would have prevented it, and encode that; a patch for one case costs every other case. When incremental edits stall, change the framing or structure rather than adding words. When a body has grown into a long list of rules, suggest the user run skill "conceptual-compression" on it (it is user-invoked): it rewrites rules as the fewer general statements they follow from and checks that every case is still decided the same way. Keep routing descriptions out of it, since triggering depends on the specific phrasings compression removes.

### Remove contradictions and ambiguity

Two instructions that conflict, or merely look like they conflict, make the agent pick one arbitrarily or oscillate between them. Most apparent conflicts are two true statements about different regimes. Resolve them at authoring time: find the intent behind each, identify the variable that decides which applies, and write the resolved rule once as a condition rather than leaving both rules standing. Use one term per concept throughout, and pick one default and gate every alternative on the explicit case that selects it. Check across files too: an instructions file, a rule, and a skill that disagree are one contradiction once they load together. Never write time-relative instructions ("before August use the old API"); state the current method and collapse the old one under a deprecated heading.

### Encode branching knowledge as decision tables

When the right action depends on several factors, a table or tree of condition → action routes the agent in one read; the same information as prose forces it to hold every branch in mind and infer the routing. Make branches mutually exclusive, put the default first, and point each leaf at the step or file that handles it.

### Explain why; be rigid only where fragile

Reasoning lets the agent handle cases you did not foresee; a bare directive does not. Reserve exact commands, fixed output formats, and "do not modify" for places where variation breaks things, and give even those a one-clause reason. ALL-CAPS MUST or NEVER is a signal that a reason is missing.

### Prefer gotchas to advice

The highest-value content is usually concrete corrections to mistakes the agent will otherwise make: soft-deleted rows that need a filter, one identifier with three names, a health endpoint that lies. A gotcha covers what the procedure does not already say; if a table row or step encodes it, do not restate it as a bullet. Whenever you correct the agent during real use, add the correction where the next run will load it.

### Ground in evidence; verify by execution

Write from real runs and artifacts: corrections you made, runbooks, schemas, review comments, fix history, execution transcripts, and for library or API guidance the current documentation rather than memory. Instructions written from general knowledge produce "follow best practices" filler and stale flags. Do not add steps, commands, or rules the source material did not give you: an invented procedure reads as authoritative and is followed as one. Then test with the agent as in "Verify" rather than by rereading, and when fixing what the runs show, remove before adding.

## Where guidance belongs

| The guidance should apply… | Container |
|---|---|
| On demand, when a task matches | Skill (default) |
| Every turn of every session | Always-applied rule or instructions file (AGENTS.md, CLAUDE.md) |
| With matching files, a few lines | Path-scoped rule |
| With matching files, more than a few lines or needing references or scripts | Skill scoped to those paths |
| As a delegated role with its own context | Subagent |
| As a deterministic action on an agent event | Hook |

A skill loads into the caller's context and shares everything it knows; a subagent starts fresh and returns only its report. Choose a subagent when a clean context, a different model, or restricted tools is the point, and a skill when the work needs the conversation. Moving content out of an always-applied file changes when it loads: keep in the file what every turn needs, and move the rest into skills or path-scoped rules that say when it applies.

## Subagent definitions and system prompts

- **The description is routing text.** The caller reads it when deciding whether to delegate, so it says what the subagent does, when to use it, and what the caller must do: that it cannot see the conversation and which brief to send, whether it edits files, and whether to wait for it or run it in the background, and when. State its model and effort when cost should shape that choice. Write it as a skill description is written: the capability, then when to use it in the user's terms, including indirect cases, and the boundary with competing agents in one clause.
- **The body, like any system prompt, is all a fresh context knows.** In order: the role and what its product is; its inputs, naming the brief's fields, to be treated as evidence rather than ground truth, with named files read but no open-ended exploring; what it may change; its rules; and an output contract, a fixed structure the caller can act on, with a length cap and no preamble.
- **Set the model and write access explicitly.** Each harness names its own frontmatter fields for them, and an omitted field falls back to the default model or full write access.

## Instructions files and rules

- An always-applied file or rule is read by every task every turn, so the bar for earning a place is highest: the commands to build and test, conventions the code does not show, traps, and pointers to where details live.
- Leave out what the code, configuration, or linters already enforce.
- When a skill or another file owns a topic, point to it rather than restating it, so there is one version to keep true.
- A path-scoped or description-routed rule loads only when its globs match or its description fits the task, so those are its routing text: write a description as for a subagent, and keep the body to what applies whenever it loads.

## Briefs and prompts for another agent

- The recipient of a brief (some agent definitions call it a context packet) knows only what you send. Give the goal, what you have already ruled out, the files or sources to read, the constraints, the scope it may change, and the output you want back.
- When you want an independent judgment, send the evidence and not your conclusion or the answer you expect; a brief that carries your view gets your view back. Include a tentative pick only when the recipient's definition asks for one and tells it to discount it.
- Report failed attempts as what was tried and the error it produced, not the draft that failed, so the recipient does not inherit its approach.

## Auditing

Read the text as its recipient would, cold: what loads first (a description or other routing text), then the body, then linked files only where the body sends you. Check the principles above and report findings with those most likely to make the agent act wrongly first:

- Would the routing text bring realistic, indirect requests here and keep away near-misses that share its keywords?
- Does any line contradict another, or a file that loads beside it (instructions file, rule, skill)?
- Where would the agent have to guess: an undefined term, an unstated condition, a prohibition with no alternative, a rule with no reason?
- What would the agent do correctly without the text, or what do the code, configuration, or linters already enforce? Cut it.
- Which lines patch a single case, and what general rule would replace them?
- Which mistakes from the text's history (git log, prior corrections) does it still leave uncovered?
- Do the fields and location match the harness's built-in reference, where it has one?

Then offer to verify the fixes by execution.

## Verify

Reading cannot show what an agent does with the text, so run it on realistic tasks in fresh contexts, with and without the text or against the previous version, and compare the results with what you meant. A single quick check, one fresh agent on one task, is the default and needs no permission. Measured comparisons (several cases, baselines, repeated runs, saved eval files) cost real time and tokens, so offer them and run them only when the user opts in.

| Kind | How to verify |
|---|---|
| Skill | Use the trigger and output evals in skill "skills-best-practices" |
| Subagent or system prompt | Give it a realistic brief and check that its reply follows the output contract. Then run tasks in a fresh session where it is available, and check that the caller delegates when it should and that the brief it sends is enough; skill trigger evals do not measure delegation |
| Instructions file or rule | Run a few ordinary tasks in fresh sessions and read the transcripts for instructions followed, ignored, or misapplied |
| Brief or prompt | Send it to a fresh agent; anything it asks about or guesses at is missing from the brief |

For measured comparisons, use the output-eval method in skill "skills-best-practices", with the text under test in place of the skill. Test on the model that will read the text: a subagent body or system prompt on the model its definition sets, delegation on the caller's model, and text read by whatever model the user runs (skills, instructions files, rules, briefs to an unpinned agent) per the eval-model rule in skill "skills-best-practices".
