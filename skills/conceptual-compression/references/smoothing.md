# Smoothing a design

Faithful compression stops at whatever the source's principles cannot generate: the exception, the special case, the one member that behaves differently. In prose those are facts to keep. In a design (an architecture, an interface, a UX flow, a spec) each is an edge that every user and implementer must learn, and a small change to the design can often remove it.

Each smoothing is a deliberate divergence from the spec, stated as a behavior change and judged against the objective before it is adopted; the current spec is one way of meeting that objective.

## Procedure

1. **Fix the objective.** From the user's request, the task at hand, and any goals or requirements document, write the design's goals, constraints (compatibility, things other people or systems rely on), and non-goals as a short numbered list, noting beside each line whether the user stated it or you inferred or gathered it. If none is stated, look for one (the main procedure's explore step) before concluding there is none. Without an objective every proposal is a question for the user.
2. **Compress faithfully first.** Run the main procedure to its stop, or you will propose changes that a lossless collapse would have made unnecessary.
3. **List the edges:** everything the faithful result kept that no principle produces, such as an exception, a condition on one variable, a mode or flag, or a difference between things a user would expect to match.
4. **Look for why each edge exists**, in the source's own reasons, history, comments, or goals. An edge whose reason still holds stays; often that reason is a goal, and removing the edge would simplify the spec by failing the objective. An edge whose reason has expired is the best candidate. An edge with no findable reason may be protecting something unstated.
5. **Propose smoothings.** For each remaining edge, the smallest change in behavior that folds it into a principle already present: the general behavior reaches the odd case too, the odd case or the feature that forces it is removed or narrowed, or near-identical things become one and parallel things take one convention, the difference dropped or made a parameter. State each as today's behavior, proposed behavior, and the concrete cases that would behave differently. Keep only proposals that shorten the faithful statement of the design: one that leaves it as long is a different design, not a simpler one, and one that removes a rule by moving work onto every caller or user has moved the edge, not removed it. Prefer the proposal that removes the most ideas for the least changed behavior.
6. **Judge the proposals against the objective**, all in one call, with an independent validator-tier judge (prompt below). Give it each behavior change and not what the change buys, so it rules on the objective and is not sold on the simplification.
7. **Adopt and recompress.** Apply the accepted changes and run the main loop again, since an accepted change usually lets more collapse. The authority is now the source as amended: flip the expected answers of the probes each change touches, add a probe for each changed case, and append the objective and the accepted changes to the grader's ORIGINAL under the headings "Objective" and "Intended changes", so the grader does not report what follows from them as lost or overreach. The held-out set was written from the unamended source, so a held-out mismatch in a case an accepted change touches is that change, not a loss.
8. **Repeat from step 3** until a pass produces no accepted proposal, for at most 3 passes.

## Objective judge prompt

```
A design is being simplified. OBJECTIVE states what the design must achieve and its constraints. Each PROPOSAL changes the design's behavior. Judge each proposal against OBJECTIVE only. That the current design does something is not, alone, a reason to keep it.

- ACCEPT: every goal and constraint in OBJECTIVE still holds in the cases that change, and neither ASK condition applies.
- REJECT: a goal or constraint would be broken. Quote it.
- ASK: OBJECTIVE does not settle it, or the change takes away something a person or system may already rely on, or it could not be undone.

Reply with one line per proposal and nothing else:
<n>. ACCEPT|REJECT|ASK - <the words of OBJECTIVE you relied on, or what it does not say>

OBJECTIVE: <numbered goals, constraints, non-goals>
PROPOSALS:
<n>. Today: <behavior>. Proposed: <behavior>. Cases that change: <concrete cases>.
```

Check each ruling against the objective yourself, as with any judge, and adopt a change only on an ACCEPT that the objective's words bear out. A ruling you doubt, or one that rests on a line the user did not state, is an ASK, since an unneeded question costs the user a moment and a wrongly adopted change costs them a behavior they needed. When parallel things are unified and the objective does not say onto which value, that choice is an ASK too, so it is the user's to make; when a constraint pins one of them, unify onto that one. A general permission from the user ("change whatever the goals allow") is what starts smoothing and does not settle an ASK: only the objective's words, or the user's answer about that one change, do.

When the user is present and a single ASK blocks most of the remaining simplification, ask them then. Otherwise carry the open proposals to the report and continue with the accepted ones.

## Report

Use the main report, with the result being the simplified design, and add after "What changed":

```
## Behavior changes
- Adopted: <today> -> <proposed> - <the goal or constraint that allows it>
- Needs your call: <today> -> <proposed> - <what it would remove from the design, and what the objective leaves open>
- Rejected: <proposal> - <the goal it breaks>
```

Keep lossless generalizations under "What changed" and every change in behavior here, including one that fixes a spec that already violated the objective, so the user can see exactly where the result departs from the spec. The result contains the adopted changes only: a proposal that needs the user's call stays as today's behavior in the result, with what it would remove stated here.

Smoothing produces a proposed design. Do not edit the spec, code, or anything built from it unless asked.
