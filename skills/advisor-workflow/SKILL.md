---
name: advisor-workflow
description: Cost-and-speed-optimized development workflow for an implementing model consulting advisor subagents (design-advisor, frontend-design-advisor, principal-advisor, quality-reviewer). Use for design-bearing or high-risk implementation - new/changed public contracts, schemas, state/lifecycle, concurrency, security, persistence, compatibility, anything the user will see (layout, styling, motion) - or after repeated failed attempts. Do not invoke for trivial edits or solely because a change touches multiple files.
---

# Advisor Workflow

You are the implementer. **Objective: maximize quality; at a given quality level, minimize time-to-completion and cost.** Buy independent judgment from advisor subagents (see What a consult buys) whenever expected avoided rework (step 2) or defect risk exceeds the consult's cost and latency. Advisors consume the evidence you supply and return concise decisions (`frontend-design-advisor` also code); you own exploration, runtime validation, and all repository edits except what it builds inside its SCOPE (step 3).

**Spend policy** (governs every consult decision): the first opinion on a question is worth far more than a second; new evidence (a test, a spike, a runtime probe) beats more opinions; resuming an existing consult with a delta packet costs a fraction of opening a new one.

## Advisors

| Subagent | Where this workflow calls it | Default per task |
|---|---|---|
| `design-advisor` | decision points not claimed by principal (step 3); escalation valve (step 5) | ~2 consults; bundle coupled decisions into one packet |
| `frontend-design-advisor` | the task's design-bearing visual work, in one packet (step 3); visual defects (step 5) | ~1 consult, resumed for follow-ups and defects |
| `principal-advisor` | the dominating decision (step 3); valve when in its domain (step 5); unresolved critical findings (step 6) | ~1 consult, resumed for follow-ups |
| `quality-reviewer` | end review of the diff (step 6) | 1, plus re-review after large fixes |

What each advisor is good at, its model, its write access, and its launch mode are owned by its definition in `~/.cursor/agents/<name>.md` (description shown in your subagent list); this table owns only where this workflow calls it. Defaults are calibration points; the spend policy decides when to exceed them.

## What a consult buys

Three separable sources of value:

1. **Clean context.** The advisor sees only your packet. Failed attempts in context bias later reasoning toward similar errors even when marked wrong (Cheng et al. 2026); in-context self-correction without new evidence does not improve answers and often degrades them (Huang et al. 2023); reliability falls with context length (Hong et al. 2025). Independent instances of one model disagree usefully (Du et al. 2023), so any advisor supplies this, same family included.
2. **Different training.** Different correlated errors; no self-preference for output it recognizes as its own (Panickssery et al. 2024); heterogeneous proposers of comparable quality beat same-model resampling (Wang et al. 2024). Cross-family only — a fresh context does not change the weights.
3. **More capability or effort** than you run at.

Family is the provider (`claude-*` Anthropic, `gpt-*` OpenAI, grok xAI, composer Cursor); versions, codenames, effort suffixes, and a "Cursor" host prefix (as in "Cursor Grok") do not change it. Your system prompt names your model; each advisor's subagent description states its model and effort. If a description omits it, read `model:` from the definition (`.cursor/agents/<name>.md`, else `~/.cursor/agents/`). Cursor substitutes a compatible model if your plan or admin blocks the configured one.

When an advisor shares your family, consult it only if clean context or its higher effort is worth the cost: your context is long (deep into a task, many tool outputs) or holds failed attempts on this question, or the role is `quality-reviewer` — a fresh reader of your diff pays, though its "no issues" is weaker evidence because self-preference survives a fresh context. Otherwise perform the role yourself with its definition file as the checklist, or send a `design-advisor`/`principal-advisor` question to the other one: step 3's exclusivity is then off, and because it answers outside its role, treat its answer as a second opinion to weigh, not the authority.

## Workflow

### 1. Triage (you, ~1 minute)

- **Mechanical** (rename, config change, straightforward bug fix, well-specified small feature, applying existing tokens or components to a known pattern): implement directly; skip to steps 5–6.
- **Design-bearing** (new/changed public signatures, schemas, store shapes, lifecycle, cross-module contracts; anything the user will see whose values or structure existing tokens and components do not fully dictate): steps 2–6.
- **High-uncertainty** (unknown library behavior, unclear data flow, "not sure this approach works"): first build and run a walking skeleton — the smallest end-to-end slice that produces runnable evidence — so wrong directions die small; use it and its evidence as the context packet. Then steps 2–6.

**Risk override**: anything touching security, privacy, money, data loss, concurrency, public compatibility, or irreversible migration is design-bearing regardless of diff size.

**Failed-attempts override**: if this skill was invoked after failed attempts, the task is high-uncertainty regardless of apparent size; the failure evidence, packaged as step 3 specifies, replaces the walking skeleton as your starting EVIDENCE. Consult before any re-attempt.

### 2. Extract decision points (you)

Explore the codebase yourself (reading is cheap). List the step-1 design-bearing items with high rework cost. Rework cost is measured over the project's lifetime, not this task: how much will come to depend on the decision, how costly it is to reverse once that dependence exists, and how wide a range of future demands it must hold under without change. A small diff can carry a large long-term cost. Everything else is implementation detail behind those decisions — do not consult on it. Design-bearing visual work bypasses this filter (neither types nor tests catch a visual defect); step 3 routes it.

### 3. Context packets + consults

First route the decisions: a single dominating decision in `principal-advisor`'s domain (per its subagent description) goes to it — never also to `design-advisor`, unless you share a family with one of them (see What a consult buys). Launch it blocking or with `run_in_background: true` as its description directs, and implement only work independent of the answer while it thinks. Design-bearing visual work goes to `frontend-design-advisor` (below; if it shares your family, What a consult buys applies); a design system's API — prop names, variant unions, token architecture — is a contract and goes to `design-advisor`. Every remaining decision point gets a `design-advisor` consult; batch independent ones in parallel. `design-advisor` and `principal-advisor` take the same packet format:

```
DECISION: <the specific question>
ALTERNATIVES: <each candidate with the strongest case for it, including your tentative pick>
CONSTRAINTS: <requirements, existing conventions, compat needs; NON-GOALS>
CURRENT STATE: <relevant signatures/types/rules - full and raw, not summarized>
CALLERS/CONSUMERS: <who uses this and how - raw excerpts>
ASSUMPTIONS: <what you believe but have not verified>
EVIDENCE: <anything already learned from running code>
PRIOR ADVICE: <earlier advisor opinions on this question, if any>
OMITTED: <areas considered but not included, so the advisor can call for them>
```

Include enough primary evidence to avoid omission bias, but no unrelated bulk — repeated context and advisor reasoning tokens are real costs. Report failed attempts as what was tried, the error output, and why it failed — not the draft code (see Clean context). Allow one "send me X" round-trip, then decide. When advisors disagree, run the smallest experiment that discriminates between the options; full parallel implementations (best-of-N) only when no cheaper discriminating evidence exists.

`frontend-design-advisor` packet (launch as its description directs):

```
GOAL: <what the user should see and feel; purpose and audience>
SCOPE: <every file it may create or edit; you do not touch these until it returns>
DESIGN CONTEXT: <styling mechanism, tokens/theme, component library; one sibling component raw, paths of others>
DATA INTERFACE: <props/state the visual receives - types, raw; mark what is not built yet>
CONSTRAINTS: <framework, accessibility, browser/device support, performance, brand rules; NON-GOALS>
IMPLEMENTER: <your model, and effort if known>
PREVIEW: <dev-server URL and route, or none>
EVIDENCE: <screenshots, measurements, user feedback on current visuals>
OMITTED: <as above>
```

Apply its Spec verbatim; do not re-choose values it fixed.

### 4. Implement (you)

Implement against the decided interfaces, wire `frontend-design-advisor`'s Handoff, and write the advisors' proving tests. If implementation surfaces evidence that invalidates an advisor assumption, send a short delta packet rather than silently diverging. When background advice arrives, check its assumptions against current code before applying — never apply stale advice mechanically.

### 5. Validate with runtime evidence (you)

Run the real thing: build, tests, dev server, browser where UI is involved — advisors cannot establish runtime behavior. Loop on real failures, and execute the `quality-reviewer`'s runtime-verification list when you get it. Run `frontend-design-advisor`'s Verify list by measurement, not by eye. Visual defects skip the valve below: resume it with the screenshot or measurements rather than adjusting values yourself.

**Escalation valve**: after two distinct failed hypotheses on the same problem — or when another attempt would cost more than a consult — stop; never repeat an approach without new evidence. Package the failure evidence as step 3 specifies and consult `design-advisor`, or `principal-advisor` if the problem is in its domain. For any failure not obviously in the code you are writing (environment, build, tooling), first run the cheapest experiment that discriminates "caused by my changes" from "pre-existing" (e.g. stash your diff and re-run); if pre-existing and outside the task's scope, document it and move on.

### 6. End review (skip only for Mechanical diffs under 3 files)

Send the diff to `quality-reviewer`, stating the review scope up front (base revision; committed, staged, unstaged, untracked, and generated files) so it need not reconstruct it. Apply findings yourself, recording rejections with evidence; audit equivalence proofs before applying merges. An unresolved **critical** finding blocks completion: after one evidence-based exchange, escalate to `principal-advisor`; surface the documented risk to the user only when further consultation stops adding information. Re-validate (step 5) anything behavior-touching.
