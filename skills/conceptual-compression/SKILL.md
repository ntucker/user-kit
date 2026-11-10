---
name: conceptual-compression
description: Compresses verbose prose (rules, guidelines, notes, explanations) into the fewer, more general statements its specifics follow from, in a loop where an efficient-model grader and a blind edge-case validation judge each step until compressing further would lose meaning. Also simplifies a design (architecture, interface, UX, spec) by proposing small behavior changes that let it be stated more simply, each judged against the design's objective. Run on a file, a section, or pasted text.
disable-model-invocation: true
---

# Conceptual compression

Rewrite a source text as the fewer, more general ideas its specifics are instances of. The measure is decisions, not words: a reader holding only the result should settle every case the way the source would (for explanatory text: reach every conclusion it supports), including cases the source never listed but its reasons reach, and should receive no instruction the source would not give. Rewording the same ideas, or summarizing what the text is about, is a different job.

Compress too little and a list remains, silent on the unlisted case and free to contradict itself unnoticed. Compress too much and a statement fits any behavior (vacuous), a concept is gone (lost), or a rule governs cases the source never meant (overreach). Having read the source, you cannot see either from the inside, so independent readers judge every step.

The source decides what is right. When the user wants a simpler design and accepts that behavior may change, the objective the design serves decides instead: read [Smoothing a design](references/smoothing.md) first, which fixes the objective and then runs the procedure below as one of its steps.

## Roles

You are the compressor, ideally a strong model (Opus, Fable, GPT Sol). Two judges read each candidate:

| Judge | Model | Sees |
|---|---|---|
| Grader | An efficient model (Haiku, Grok, Terra): comparing two texts is cheap work | Source and candidate |
| Validator | A mid-tier model (Sonnet), the kind of reader that will act on the result | Candidate and probe statements only |

The model names are examples; pick the nearest tiers your harness offers. Finding the idea behind a set of specifics is the hard part, and with a mid-tier compressor the loop has not produced a shorter result than a plain rewrite, so tell the user when you are not a strong model. The validator cannot be the cheapest: a cheap model answers "open" on unlisted cases even from the full source, so it cannot tell a candidate that generalizes from one that only kept the list.

A judge's verdict counts only while it is independent of you and of earlier rounds. Run each as a subagent with a fresh context every round, and send it its prompt and its texts and nothing else: an earlier round's judge remembers what a shorter candidate dropped, and an explorer has read the source and everything around it, so neither serves as a judge. Your reading of the intent, your collapse notes, what changed since the last candidate, or the answers you expect would turn an independent check into a confirmation of your own view, so no judge is told any of them. Pass file paths where judges can read files, so the source reaches the grader verbatim. If the harness cannot give you another model or a fresh context, run the checks yourself and say in the report that they were not independent.

## Procedure

1. **Fix the source.** Keep a verbatim copy. Every round is judged against it and never against the previous candidate, or each round's small loss compounds. Write down, in a sentence or two, who acts on this text and what it is trying to get them to do. Collapses move toward that intent; a generalization that fits the examples but not the intent is where overreach comes from.
2. **Explore, if the source is not the whole idea.** Read [Exploring before compressing](references/exploring.md) when the user asks for it, the source points outside itself, the user gave a subject and no text, or you could not write the intent sentence without guessing.
3. **Write the probes** (see Probes) from the fixed source alone, before any compressing, so they test the source's meaning and not your candidate.
4. **Baseline the probes.** Run the validator on the source itself. A probe the source fails is a wrong probe or a real ambiguity in the source: fix or drop the probe, and keep the ambiguity for the report. Unlisted-case probes are the exception: they may come back open here, and they stay.
5. **Loop**, at most 6 rounds: compress, run both judges on the candidate in parallel, then decide (see Deciding).
6. **Report** (see Report). Do not overwrite the source unless asked.

## Compressing

Replace each group of specifics with what generates them: examples with the rule they show, rules that share a reason with that reason, a list with what qualifies a case for it, a prescription with the goal it serves, a rule and its exceptions with the narrower rule the exceptions reveal, an anecdote with what it is evidence for. Keep a specific only where nothing generates it, and state it exactly beside the principle it belongs to: a member its criterion would not predict, a means that cannot be derived from its goal, an example its rule is ambiguous without, and any name, number, command, threshold, arbitrary convention, or fact that contradicts what its principle predicts.

A statement that replaces others keeps their force and each one's own scope. Left alone, a merge takes the widest scope and the weakest force of its parts, so one rule's "in integration tests" or "never" disappears, and a reason standing in for rules ("a retry hides the cause") forbids nothing until it is stated as a rule. Where two rules conflict in some case, state one rule conditioned on what decides between them; if the source does not say what decides, flag it and do not choose.

The altitude to aim for, on a small source:

```
Source
- Don't say "per our policy". Don't say "as previously stated". Never tell a customer to check the FAQ.
- If an order is late, give the new delivery date.
- If a refund was issued, say it takes 3 to 5 business days to appear.
- If we don't know yet, say when we will write again.
- Refunds over $50 need a lead's approval before you mention them.
- Legal threats go to the escalations queue. Don't reply.

Result
Every reply tells the customer what happens next and when; if that is not known yet, it says when the next update will come. Nothing in a reply hands the problem back to them, as citing policy, an earlier message, or the FAQ does. Two things are not yours to say: a refund over $50 before a lead approves it, and anything in answer to a legal threat, which goes to the escalations queue. Refunds take 3 to 5 business days to appear.
```

A result that still has one line per source line has been reworded, not compressed.

In the first round go straight to the level of ideas and be bold: restoring a loss the judges name is cheap, and a cautious first candidate gives them nothing to find, so the loop ends where it began. In later rounds fix everything the judges found and make every collapse still open, since each round costs two judge runs. Note each collapse in one line so a finding can be traced to the collapse that caused it.

Write the result in the source's own form and register, in full sentences. Telegraphic wording saves words and costs the reader the meaning.

## Probes

A probe is a statement about one concrete case that the source makes true, makes false, or leaves open. It passes only if the candidate carries the idea by itself. A probe asks about a decision some reader will face, never about recalling the source, and writing one is a commitment to keep what it tests.

Write each probe so that one kind of failure would change its answer:

- **A lost idea.** One or two probes for every idea you expect in the result (count ideas, not source lines), aimed at its least obvious case, and one on each side of every exception, condition, and scope limit.
- **Overreach.** Cases just outside the source's scope, whose expected answer is "open".
- **A memorized list.** A few unlisted cases the source's reasons plainly reach. Name them in the report, because their expected answer is your inference.
- **A validator that is not reading.** Prefer statements nobody could answer without the text, and mix the expected answers so that agreeing with everything fails.

10 to 20 probes suit a page of source.

Your own probes cover what you thought mattered, and you repair until they pass, so a candidate can pass all of them and still have lost what you did not think to ask about. Before compressing, have a fresh validator-tier subagent write a held-out set from the fixed source alone: give it the guidance above and two scratch paths, one for its statements and one for their expected answers. Do not open either file, and use the set in no round.

Validator prompt:

```
Below are a TEXT and a list of numbered statements. Judge each statement using only what TEXT says. Do not fill gaps with what is usually considered good practice: if TEXT does not settle a statement, or does not apply to the case, the answer is OPEN.

- TRUE: TEXT requires or supports it
- FALSE: TEXT forbids or contradicts it
- OPEN: TEXT does not settle it

Reply with one line per statement and nothing else:
<n>. TRUE|FALSE|OPEN - <the words of TEXT you relied on, or what TEXT is missing>

TEXT: <candidate, or its path>
STATEMENTS: <probe statements, or their path>
```

## Grader prompt

```
You are grading one step of a conceptual compression. ORIGINAL is source prose. CANDIDATE is an attempt to say the same thing with fewer, more general ideas. A good candidate lets a reader who never saw ORIGINAL make every decision ORIGINAL leads to, including in cases ORIGINAL did not list but plainly meant, and no other decisions. Judge by decisions, not wording: a detail whose absence changes nothing a reader would do is not a defect.

Work through these in order.

1. Read CANDIDATE on its own first. A statement is VACUOUS when it is the only thing covering some decision and it would fit any behavior, or two careful readers could apply it in opposite ways. A framing sentence whose consequences the candidate goes on to spell out is not vacuous.
2. Read ORIGINAL item by item: every rule, example, exception, number, name, and limit on scope. An item is LOST when a reader holding only CANDIDATE would decide differently than ORIGINAL says, or could not know a fact they need. Before listing one, search CANDIDATE for it. An example, anecdote or repeat that a surviving statement already produces is not lost.
3. Read CANDIDATE statement by statement. A statement is OVERREACH when it demands, forbids or covers something ORIGINAL gives no support for: a wider scope, a dropped condition or exception, a new rule. Reaching an unlisted case for the same reason ORIGINAL gives for its listed cases is the purpose of compression and is not overreach.
4. Find what is still COLLAPSIBLE. First name the distinct ideas CANDIDATE carries, one short line each. Then look at what CANDIDATE spends beyond stating each idea once: statements that are instances of an idea already stated, a list of members beside the rule that already qualifies them, an example its rule implies, an anecdote or history no decision depends on, the same thing said in two places, two statements that pull against each other in some case. For each, give the cut or the single statement that replaces it. Exact names, numbers and commands a reader needs cannot be derived from anything and are not collapsible.

List only findings you could defend to the author by quoting both texts. An empty list is a normal result, and a candidate with nothing to report is finished.

Verdict: STOP if all four lists are empty, otherwise CONTINUE.

End your reply with exactly this block. One line per finding; write "none" for an empty list, and leave out things you checked and found fine.

VERDICT: CONTINUE | STOP
VACUOUS: "<statement>" - <the decision it leaves open>
LOST: "<item from ORIGINAL>" - <what a reader of CANDIDATE would do instead>
OVERREACH: "<statement in CANDIDATE>" - <what it covers that ORIGINAL does not>
COLLAPSIBLE: "<statements>" - <the cut, or the replacement statement>

CANDIDATE: <candidate, or its path>
ORIGINAL: <source, or its path>
```

## Deciding

Check every finding and every probe mismatch against the source before acting on it. The judges run on cheaper models than you and are sometimes wrong, so a failing probe is not automatically the candidate's fault and a passing one is not proof: read the words the validator says it relied on, because a right answer quoted from nowhere in the candidate came from general knowledge. A judge failing to find what the candidate does say is still evidence of how the candidate reads.

A miss that survives the check says which way the candidate erred:

- **It leaves open what the source settles** (a probe expected true or false comes back open; the grader finds something lost or vacuous). The idea is gone or too vague to apply. Restore it at the most general wording that settles the case. Pasting the lost item back grows the list again, so restore verbatim only what is irreducible.
- **It settles what the source leaves open** (a probe expected open comes back true or false; the grader finds overreach). Narrow the statement to the source's scope or condition.
- **It gives the opposite answer.** The statement misleads or the probe is wrong. Recheck the probe against the source, then fix whichever is at fault.

Add a probe for anything the grader caught and the probes did not, so it cannot quietly recur. If a collapse still fails after one repair, undo it and do not retry it.

A candidate holds when every probe passes and no finding of lost, overreach, or vacuous survives your check. Holding makes it the best so far and is not a reason to stop, because a candidate that changed little holds trivially. Make the next collapse, the grader's (when the merge would hold) or one you see, and stop when none is left: going further has been tried and broke, or neither you nor the grader can name anything further to try. A statement that covers two ideas and that neither idea's author would recognize is not a collapse; they are two ideas. Stop also when two rounds in a row produce no shorter candidate that holds, or at the round limit.

Return the shortest candidate that held, exactly as it was judged: an edit after the last judging is a candidate nobody has checked. Before returning it, run the validator on it once more in a fresh context, on your probes and the held-out statements together, and only then open the held-out answers. Validators vary at the edge, and a probe that fails on a second read marks an idea stated too thinly to rely on; a held-out probe that fails, once you have checked it against the source like any other mismatch, is a loss your own probes missed. Repair either and judge again, once, even past the round limit.

## Report

```
## Compressed
<the result>

## What changed
- Generalized: <specifics> -> <the statement that now covers them>
- Added from exploration: <statement> - <where it was found>
- Kept exactly: <irreducible facts>
- Dropped: <item> - <why no decision depends on it>
- Now also covers: <unlisted case> - <the source's reason that reaches it>
- Needs your call: <conflicts or ambiguities in the source that the text alone could not settle>

<n> rounds, stopped because <reason>. <source words> -> <result words> words. Probes: <passed>/<total>.
```

Omit a line that has nothing to report. "Now also covers" and "Needs your call" are where you inferred intent, so they are what the user most needs to check. Give each gathered item that shaped the result its own "Added from exploration" line with its origin (path and line, or URL): a grouped list hides which statements the user did not write and where to check them.
