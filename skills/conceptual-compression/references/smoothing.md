# Smoothing a design

Faithful compression stops at whatever the source's principles cannot generate: the exception, the special case, the one member that behaves differently. In prose those are facts to keep. In a design (an architecture, an interface, a UX flow, a spec) each is an edge that every user and implementer must learn, and a small change to the design can often remove it. Smoothing looks for those changes.

The authority changes. In faithful compression the source decides what is right. Here the objective the design serves decides, and the current spec is one way of meeting it. A smoothing is a deliberate divergence from the spec, so each one is stated as a behavior change and judged against the objective before it is adopted.

## Procedure

1. **Fix the objective.** Collect what the design is for, from the user's request, the task at hand, and any goals or requirements document: goals, constraints (compatibility, things other people or systems rely on), and non-goals. Write them as a short numbered list. If none is stated, look for one (the main procedure's explore step) before concluding there is none. Without an objective no change can be accepted on the user's behalf, so every proposal becomes a question for them.
2. **Compress faithfully first.** Run the main procedure to its stop. The result separates what the design's principles generate from what they do not, and smoothing a spec you have not compressed proposes changes that a lossless collapse would have made unnecessary.
3. **List the edges.** Everything the faithful result kept that no principle produces: exceptions, special cases, conditions on one variable, two near-identical concepts treated differently, a mode or flag, an asymmetry between things a user would expect to match.
4. **Look for why each edge exists**, in the source's own reasons, history, comments, or goals. An edge with a reason that still holds is essential and stays. An edge whose reason has expired is the best candidate. An edge with no findable reason may be protecting something unstated.
5. **Propose smoothings.** For each remaining edge, the smallest change in behavior that lets it fold into a principle already present:

   | Edge | Smoothing |
   |---|---|
   | A rule with an exception | The rule holds everywhere, or the excepted case is removed |
   | Two concepts that are nearly the same | One concept; the difference goes, or becomes a parameter |
   | Parallel things that differ (names, defaults, order, lifecycle) | One convention for all of them |
   | A special case for one caller, role, or size | Everyone gets the general behavior |
   | A feature whose presence forces rules elsewhere | The feature is cut or narrowed |

   State each as: today's behavior, proposed behavior, and the concrete cases that would behave differently. Keep only proposals that shorten the faithful statement of the design. A change that leaves it as long is a different design, not a simpler one. Prefer the proposal that removes the most ideas for the least changed behavior.
6. **Judge each proposal against the objective** with an independent validator-tier judge (prompt below), all proposals in one call. Give it the behavior change and not what the change buys, so it rules on the objective and is not sold on the simplification.
7. **Adopt and recompress.** Apply the accepted changes, then run the main loop again: an accepted change usually lets more collapse. From here the authority is the source as amended. Flip the expected answers of the probes each change touches, add a probe for each changed case, and append the objective and the accepted changes to the grader's ORIGINAL under the headings "Objective" and "Intended changes", so the grader does not report what follows from them as lost or overreach.
8. **Repeat from step 3** until a pass produces no accepted proposal, for at most 3 passes.

## Objective judge prompt

```
A design is being simplified. OBJECTIVE states what the design must achieve and its constraints. Each PROPOSAL changes the design's behavior. Judge each proposal against OBJECTIVE only. That the current design does something is not, alone, a reason to keep it.

- ACCEPT: every goal and constraint in OBJECTIVE still holds in the cases that change.
- REJECT: a goal or constraint would be broken. Quote it.
- ASK: OBJECTIVE does not settle it, or the change takes away something a person or system may already rely on, or it could not be undone.

Reply with one line per proposal and nothing else:
<n>. ACCEPT|REJECT|ASK - <the words of OBJECTIVE you relied on, or what it does not say>

OBJECTIVE: <numbered goals, constraints, non-goals>
PROPOSALS:
<n>. Today: <behavior>. Proposed: <behavior>. Cases that change: <concrete cases>.
```

Check each ruling against the objective yourself, as with any judge. Adopt a change only on ACCEPT that the objective's words bear out. Treat a ruling you doubt as ASK: an unneeded question costs the user a moment, and a wrongly adopted change costs them a behavior they needed. When parallel things are unified and the objective does not say onto which, the choice of value is itself an ASK.

When the user is present and a single ASK blocks most of the remaining simplification, ask them then. Otherwise carry the open proposals to the report and continue with the accepted ones.

## Report

Use the main report, with the result being the simplified design, and add after "What changed":

```
## Behavior changes
- Adopted: <today> -> <proposed> - <the goal or constraint that allows it>
- Needs your call: <today> -> <proposed> - <what it would remove from the design, and what the objective leaves open>
- Rejected: <proposal> - <the goal it breaks>
```

Keep lossless generalizations under "What changed" and every change in behavior here, so the user can see exactly where the result departs from the spec. The result contains the adopted changes only; a proposal that needs the user's call stays as today's behavior in the result, with what it would remove stated here.

Smoothing produces a proposed design. Do not edit the spec, code, or anything built from it unless asked.

## Gotchas

- An edge can be the objective showing through. An exception that exists because a goal requires it is the design working, and removing it simplifies the spec by failing the objective.
- A spec's own behavior can already violate the objective. Smoothing toward the objective then fixes a defect; report it as a behavior change like any other.
- When two parallel things differ and one of them is pinned by a constraint, unify onto the pinned one.
- Simpler to state is not simpler to live with. A change that removes a rule from the spec by moving work onto every caller or user has moved the edge, not removed it.
