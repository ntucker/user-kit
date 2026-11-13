---
name: agent-instructions
description: Write, audit, and improve text whose reader is an agent - briefs and prompts handed to another agent, subagent definitions, AGENTS.md or CLAUDE.md, rules, and system prompts - and the principles skills share with them. Use whenever the user asks for a brief or prompt to give a subagent or another agent, or asks where an instruction should live (skill, rule, AGENTS.md or CLAUDE.md, subagent, or hook), even as a quick question answerable in one reply. Also use when the user creates, edits, or reviews a subagent, writes, edits, or slims an instructions file or rule, asks whether a role should be a subagent or a skill, or says an agent keeps ignoring or misreading its instructions, even if the user never says "prompt" or "subagent". Not for prose a person reads, which "writer" covers, or for skill format, triggering, and evals, which skill "skills-best-practices" covers.
---

# Agent instructions

An agent acts on every sentence it reads, cannot ask what you meant, and reads your text beside the task, the conversation, and everything else loaded. Everything here follows from that: write only what changes what the agent does, in a form it cannot misread, from evidence, and judge it by what an agent does with it. This skill covers writing and editing such text, what differs by kind, and how to audit and verify it. For a skill, apply it together with skill "skills-best-practices", which covers skill format, triggering, and evals.

Each harness owns its file formats, frontmatter fields, and locations, and its built-in authoring tools are the reference for them: in Cursor, skill "create-subagent", skill "create-rule", and skill "create-hook"; in Claude Code, the `/agents` command for subagents, `/init` for a first CLAUDE.md, and skill "update-config" for hooks. How to write the text is this skill's to decide.

## Writing

1. **Gather before drafting.** Mine the conversation before asking: the purpose and scope, when the text applies, what the agent got wrong or the user corrected, input and output formats, project facts the agent lacked, and conventions to follow. Ask the user only about the gaps, such as edge cases and success criteria. Keep the user's wording where it is valid and unambiguous; otherwise keep its intent and say what you corrected. Write from real runs and artifacts (corrections, runbooks, schemas, review comments, fix history, transcripts, and the current documentation of a library or API), not from general knowledge, and add no step, command, or rule the sources did not give you, since an invented procedure is followed as if it were authoritative. When the text will be reused and no failures are recorded, run the task once with an agent that lacks it: those failures are what the text must fix.
2. **Choose the container** from "Where guidance belongs". For a skill, continue with "Creating" in skill "skills-best-practices"; for a hook, the harness reference is enough; otherwise read the section for that kind under "By kind".
3. **Draft** toward what the agent should do differently, structured by how the text will be used ([Body patterns](references/patterns.md): a decision table for routing, a template for output, examples for style, a checklist for gated steps), and following "What earns a place" and "Wording" below.
4. **Read it cold, then check it by execution**, as in "Auditing" and "Verify".

### What earns a place

Include only what the agent would get wrong without it: conventions the code does not show, non-obvious procedures, the exact tool to use, traps. Leave out what the code, configuration, or linters already enforce. Exhaustive detail makes the agent follow instructions that do not apply and hunt for the ones that do; when unsure about a sentence, run with and without it. The most valuable lines are usually gotchas, concrete corrections to mistakes the agent will otherwise make (soft-deleted rows that need a filter, one identifier with three names, a health endpoint that lies). State each once, not again beside a step that already encodes it, and whenever you correct the agent in real use, add the correction where the next run will load it.

Teach the class of task rather than the answer to one instance, since the text will meet cases you never see; specifics belong in templates, constraints, and gotchas. Explain why, because a reason covers cases you did not foresee and a bare directive does not. Keep exact commands, fixed output formats, and "do not modify" for places where variation breaks things, with a one-clause reason even there; ALL-CAPS MUST or NEVER marks a missing reason.

### Wording

Two instructions that conflict, or only seem to, make the agent pick one arbitrarily or oscillate, so every case should have exactly one reading.

- Resolve apparent conflicts while writing. Most are true statements about different regimes: name the variable that decides between them and write one conditioned rule instead of both. Check across files too, since an instructions file, a rule, and a skill that load together and disagree are one contradiction.
- Use one term per concept, and one default with each alternative gated on the case that selects it. State only the current method, never a time-relative instruction ("before August use the old API"); collapse the old method under a deprecated heading.
- When the action depends on several factors, write a table or tree of condition → action, with mutually exclusive branches, the default first, and each leaf pointing at the step or file that handles it.
- Address the agent in the imperative with the condition first ("If the migration fails, roll back first"), so it knows whether a line applies before it acts on it.
- Say what to do. When a "do not" is needed, give the alternative beside it.
- Write full sentences outside tables; fragments and arrow chains drop the "because", "unless", and "only when" that bound a rule.
- Name the exact tool, command, file, or field. Refer to a skill as skill "name", never by path, which differs per machine, or by slash command, which means "invoke", not "consult".
- When the target is easier to see than to describe, show two or three short real examples that differ in what should vary; the agent copies an example's specifics.
- Put what every run needs first and rare cases last, each behind the condition that calls for it.

## Editing

1. **Find what is wrong before changing anything.** The text loads, or work is delegated, for the wrong tasks → the description or other routing text; the agent does the wrong thing → an ambiguous, missing, misleading, or contradicted instruction; runs are slow or wasteful → bloat or instructions that do not apply; advice is out of date → conventions the code has moved past. When the user asks only to make the text better, audit it as in "Auditing" and work from the findings.
2. **Keep the old version as the baseline**, in git or as a copy.
3. **Fix the class with the smallest change that does it.** Encode the general rule that would have prevented the failure, since a patch for one case costs every other case. Remove or rewrite before adding, resolve any contradiction the change creates, and keep the wording and structure that already work. When the text has grown by patches, or edits stop helping, restructure or reframe it rather than adding more. For a body grown into a long list of rules, suggest the user run skill "conceptual-compression" (it is user-invoked); keep routing descriptions out of it, because triggering depends on the specific phrasings compression removes.
4. **Re-check what failed and what worked**: the failing case and a few that passed before, against the baseline, as in "Verify".

## Where guidance belongs

| The guidance should apply… | Container |
|---|---|
| On demand, when a task matches | Skill (default) |
| Every turn of every session | Always-applied rule or instructions file (AGENTS.md, CLAUDE.md) |
| With matching files, a few lines | Path-scoped rule |
| With matching files, more than a few lines or needing references or scripts | Skill scoped to those paths |
| As a delegated role with its own context | Subagent |
| As a deterministic action on an agent event | Hook |

A skill loads into the caller's context and shares everything it knows; a subagent starts fresh and returns only its report. Choose a subagent when a clean context, a different model, or restricted tools is the point, and a skill when the work needs the conversation. Moving content out of an always-applied file changes when it loads: keep what every turn needs, and move the rest into skills or path-scoped rules that say when they apply.

## By kind

Whatever decides when text is loaded or delegated to (a description, a rule's globs) is routing text. Write a description as a skill description is written: the capability, then when to use it in the user's terms, including indirect cases, and the boundary with competing agents or skills in one clause.

**Subagent definitions and system prompts.**
- The caller reads the description when deciding to delegate. Beyond what the subagent does and when, it tells the caller what to do: that the subagent cannot see the conversation and which brief to send, whether it edits files, and whether to wait for it or run it in the background, and when. State its model and effort when cost should shape that choice.
- The body, like any system prompt, is all a fresh context knows. In order: the role and what its product is; its inputs, naming the brief's fields, treated as evidence rather than ground truth, with named files read but no open-ended exploring; what it may change; its rules; and an output contract, a fixed structure the caller can act on, with a length cap and no preamble.
- Set the model and write access explicitly in the harness's fields; omitted, they fall back to the default model and full write access.

**Instructions files and rules.** An always-applied file or rule is read by every task every turn, so its bar is the highest: the commands to build and test, conventions the code does not show, traps, and pointers to where details live. Point to the owner of a topic rather than restating it, so one version stays true. A path-scoped or description-routed rule loads only when its globs or description match; keep its body to what applies whenever it loads.

**Briefs and prompts for another agent.** The recipient of a brief (some agent definitions call it a context packet) knows only what you send: the goal, what you have ruled out, the files or sources to read, the constraints, the scope it may change, and the output you want back. For an independent judgment, send the evidence and not your conclusion or the answer you expect, since a brief that carries your view gets your view back; include a tentative pick only when the recipient's definition asks for one and tells it to discount it. Report a failed attempt as what was tried and the error it produced, not the draft that failed, so the recipient does not inherit its approach.

## Auditing

Read the text as its recipient would, cold: the routing text first, then the body, then linked files only where the body sends you. Report as a finding anything the agent would have to guess at (an undefined term, an unstated condition, a prohibition with no alternative, a rule with no reason), a contradiction within the text or with a file that loads beside it, a line that patches a single case, a mistake its history (git log, prior corrections) records that it still leaves open, and anything that fails "What earns a place", whose fix is to cut it. Ask in particular whether the routing text brings realistic, indirect requests here and keeps away near-misses that share its keywords. Put the findings most likely to make the agent act wrongly first, then offer to verify the fixes by execution.

## Verify

Rereading cannot show what an agent does with the text, so run it on realistic tasks in fresh contexts, with and without the text or against the previous version, and compare the results with what you meant. One fresh agent on one task is the default check and needs no permission. Measured comparisons (several cases, baselines, repeated runs, saved eval files) cost real time and tokens, so offer them and run them only when the user opts in.

| Kind | How to verify |
|---|---|
| Skill | Use the trigger and output evals in skill "skills-best-practices" |
| Subagent or system prompt | Give it a realistic brief and check that its reply follows the output contract. Then run tasks in a fresh session where it is available, and check that the caller delegates when it should and that the brief it sends is enough; skill trigger evals do not measure delegation |
| Instructions file or rule | Run a few ordinary tasks in fresh sessions and read the transcripts for instructions followed, ignored, or misapplied |
| Brief or prompt | Send it to a fresh agent; anything it asks about or guesses at is missing from the brief |

For a measured comparison, use the output-eval method in skill "skills-best-practices" with the text under test in place of the skill, on the model that will read the text: a subagent body or system prompt on the model its definition sets, delegation on the caller's model, and text read by whatever model the user runs (skills, instructions files, rules, briefs to an unpinned agent) per the eval-model rule in skill "skills-best-practices".
