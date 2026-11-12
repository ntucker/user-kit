---
name: agent-instructions
description: Write, audit, and improve text whose reader is an agent - subagent definitions, AGENTS.md or CLAUDE.md, rules, system prompts, and briefs handed to another agent - and the principles skills share with them. Use whenever the user creates, edits, or reviews a subagent, writes or slims an instructions file or rule, asks for a prompt or brief to hand another agent, asks where an instruction should live (skill, rule, AGENTS.md, subagent, or hook) or whether a role should be a subagent or a skill, or says an agent keeps ignoring or misreading its instructions - even for a quick question, and even if the user never says "prompt" or "subagent". Not for prose a person reads, or for skill format, triggering, and evals, which skill "skills-best-practices" covers.
---

# Agent instructions

An agent acts on every sentence it reads, cannot ask what you meant, and reads your text beside the task, the conversation, and everything else loaded. The principles below hold for any text written for it; the sections after them cover what differs by kind. For a skill, apply them together with skill "skills-best-practices", which covers skill format, triggering, and evals.

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

Write from real runs and artifacts: corrections you made, runbooks, schemas, review comments, fix history, execution transcripts, and for library or API guidance the current documentation rather than memory. Instructions written from general knowledge produce "follow best practices" filler and stale flags. Do not add steps, commands, or rules the source material did not give you: an invented procedure reads as authoritative and is followed as one. Then test with the agent, not by rereading: run realistic tasks with and without the text in fresh contexts, read transcripts for wasted steps and ignored instructions, and remove before adding.

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

## Subagent definitions

- **The description is routing text.** The caller reads it when deciding whether to delegate, so it says what the subagent does, when to use it, and what the caller must do: that it cannot see the conversation and which brief to send, whether it edits files, and whether to wait for it or run it in the background, and when. State its model and effort when cost should shape that choice. The trigger guidance in skill "skills-best-practices" applies to it as to a skill's description.
- **The body is the system prompt of a fresh context.** In order: the role and what its product is; its inputs, naming the brief's fields, to be treated as evidence rather than ground truth, with named files read but no open-ended exploring; what it may change; its rules; and an output contract, a fixed structure the caller can act on, with a length cap and no preamble.
- **Set the model and write access explicitly.** Each harness names its own frontmatter fields for them, and an omitted field falls back to the default model or full write access.

## Instructions files and rules

- Every task reads them every turn, so the bar for earning a place is highest: the commands to build and test, conventions the code does not show, traps, and pointers to where details live.
- Leave out what the code, configuration, or linters already enforce.
- When a skill or another file owns a topic, point to it rather than restating it, so there is one version to keep true.

## Briefs and prompts for another agent

- The recipient knows only what you send. Give the goal, what you have already ruled out, the files or sources to read, the constraints, the scope it may change, and the output you want back.
- When you want an independent judgment, send the evidence and not your conclusion or the answer you expect; a brief that carries your view gets your view back.
- Report failed attempts as what was tried and the error it produced, not the draft that failed, so the recipient does not inherit its approach.

## Verify

Run the text on a realistic task in a fresh context and compare the result with what you meant. For a subagent, also check that its reply follows the output contract and that the brief its caller sent was enough. For measured comparisons, use the eval method in skill "skills-best-practices".
