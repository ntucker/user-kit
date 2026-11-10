---
name: conceptual-compression
description: Compresses verbose prose (rules, guidelines, notes, explanations) into the fewer, more general statements its specifics follow from, in a loop where an efficient-model grader and a blind edge-case validation judge each step until compressing further would lose meaning. Also simplifies a design (architecture, interface, UX, spec) by proposing small behavior changes that let it be stated more simply, each judged against the design's objective. Run on a file, a section, or pasted text.
disable-model-invocation: true
---

# Conceptual compression

Rewrite a source text as the fewer, more general ideas its specifics follow from. A source usually records what its author had seen: lists of cases, examples standing in for whole areas, prescriptions tied to one situation. The result states what those were instances of.

The measure is decisions, not words. A reader holding only the result should settle every case the way the source would (for explanatory text: reach every conclusion it supports), including cases the source never listed but its reasons reach, and should receive no instruction the source would not give. Fewer words follow from fewer ideas. Tightening the wording of the same ideas, or summarizing what the text is about, is a different job.

Both directions fail:

| Compression | What goes wrong |
|---|---|
| Too little | Still a list. A list is silent on the unlisted case, and rules stated separately can contradict each other unnoticed. |
| Too much | A statement that fits any behavior (vacuous), a concept that is gone (lost), or a rule that now governs cases the source never meant (overreach). |

You cannot find the point between them from the inside: you have read the source, so your abstraction reads as complete to you. Independent readers judge every step instead.

| The user wants | What decides right and wrong | Do |
|---|---|---|
| The same meaning in fewer ideas (default) | The source | The procedure below |
| A simpler design, and accepts that behavior may change | The objective the design serves | The procedure below, then read [Smoothing a design](references/smoothing.md) |

## Roles

| Role | Model | Sees | Returns |
|---|---|---|---|
| Compressor | You, ideally a strong model (Opus, Fable, GPT Sol) | Everything | Each candidate |
| Grader | An efficient model (Haiku, Grok, Terra) | Source and candidate | What is lost, overreaching, vacuous, or still collapsible; continue or stop |
| Validator | A mid-tier model (Sonnet), the kind of reader that will act on the result | Candidate and probe statements only | True, false, or open for each probe |

The model names are examples; pick the nearest tiers your harness offers. Comparing two texts is cheap work, so the grader is the cheapest model. Applying a text to cases it does not list takes more: a cheap model given even the full source answers "open" on unlisted cases, so as a validator it cannot tell a candidate that generalizes from one that only kept the list.

Run both judges as subagents with a fresh context every round. A validator that saw an earlier, longer candidate remembers what the shorter one dropped and is no longer blind. Where the judges can read files, keep the source, each candidate, and the probe statements as scratch files and pass paths, so the source reaches the grader verbatim without you retyping it; name only the candidate and probe files to the validator. If the harness cannot give you another model or a fresh context, run the checks yourself and say in the report that they were not independent.

## Procedure

1. **Fix the source.** Keep a verbatim copy. Every round is judged against it and never against the previous candidate, or each round's small loss compounds. Write down, in a sentence or two, who acts on this text and what it is trying to get them to do. Collapses move toward that intent; a generalization that fits the examples but not the intent is where overreach comes from.
2. **Explore, if the source is not the whole idea.** Read [Exploring before compressing](references/exploring.md) when the user asks for it, the source points outside itself (other files, earlier decisions, "the usual cases"), the user gave a subject and no text, or you could not write the intent sentence without guessing. What it gathers joins the fixed source, marked as gathered.
3. **Write the probes** (see Probes) from the fixed source alone, before any compressing, so they test the source's meaning and not your candidate.
4. **Baseline the probes.** Run the validator on the source itself. Unlisted-case probes may come back open here, and those stay (see Probes). Any other probe the source fails is a wrong probe or a real ambiguity in the source: fix or drop the probe, and keep the ambiguity for the report.
5. **Loop**, at most 6 rounds:
   1. *Compress* (see Collapses). In the first round go straight to the level of ideas: for each cluster of specifics, write the one statement they are instances of, and keep a specific only where Collapses says to. Be bold. The judges will show what has to come back, and restoring a named loss is cheap. A cautious first candidate gives them nothing to find, and the loop ends where it began. In later rounds, fix everything the judges found and make every collapse still open, not one per round, since each round costs two judge runs. Note each collapse in one line (what went in, what replaced it) so a finding can be traced to the collapse that caused it.
   2. *Judge.* Run the grader and the validator on the candidate, in parallel.
   3. *Decide* (see Deciding): repair, compress further, or stop.
6. **Report** (see Report). Do not overwrite the source unless asked.

## Collapses

| In the source | Collapse to | Keep |
|---|---|---|
| Several examples of one thing | The rule they show | One example, only if the rule is ambiguous without it |
| Rules that share a reason | The reason, stated as the rule | |
| A list of cases | What qualifies a case for the list | Members the criterion would not predict |
| A prescription for one situation | The goal it serves | The prescription, when the means is not derivable from the goal |
| A rule with exceptions | The narrower rule the exceptions reveal | |
| Two rules that conflict in some case | One rule conditioned on what decides between them | If the source does not say what decides, flag it; do not choose |
| An anecdote or history | The reason it is evidence for | |
| A repeat | One statement | |

Some content is irreducible: names, numbers, commands, thresholds, arbitrary conventions, and anything that contradicts what its principle predicts. Nothing generates these, so state them exactly, beside the principle they belong to. A principle plus its exceptions is shorter and truer than a principle stretched to swallow them.

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

The banned phrases became the criterion that bans them, which also covers phrases nobody listed. The three situation rules became the goal they serve. The approval threshold, the queue, and the refund timing are irreducible and stay exact. A result that still has one line per source line has been reworded, not compressed.

Write the result in the source's own form and register, in full sentences. Telegraphic wording saves words and costs the reader the meaning, which is the wrong trade here.

## Probes

A probe is a statement about one concrete case that the source makes true, makes false, or leaves open. The validator judges each from the candidate alone, so a probe passes only if the candidate carries the idea by itself.

- A probe asks about a decision some reader will face. It never asks them to recall the source (who said it, which incident, how it was worded). Writing a probe is a commitment to keep what it tests, so details no one decides by get none.
- Give every idea you expect in the result one or two probes, aimed at its least obvious case. Count ideas, not source lines.
- Probe every exception, condition, and scope limit from both sides. Cases just outside the source's scope have the expected answer "open" and are what catches overreach.
- Add a few unlisted cases the source's reasons plainly reach. They catch a candidate that memorized the list. The source itself may answer "open" on these at baseline; that gap is what compression should close. Keep them, and name them in the report, because their expected answer is your inference.
- Prefer statements a reader could not answer without the text. Validators answer from general knowledge when the text is silent, so a probe whose answer is common practice passes against anything.
- Mix expected answers so that agreeing with everything fails. 10 to 20 probes suit a page of source.

Keep the expected answers to yourself; the validator gets the statements only.

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

Send the judges these prompts and the texts, nothing else. Your reading of the intent, your collapse notes, or a hint about what changed turns an independent check into a confirmation of your own view.

## Deciding

Check every finding and every probe mismatch against the source before acting on it. The judges run on cheaper models than you and are sometimes wrong, but a judge failing to find something in the candidate is itself evidence of how the candidate reads.

| Signal | Meaning | Do |
|---|---|---|
| Probe expected true or false, validator says open | The idea is gone, or its statement is too vague to apply | Restore it, at the most general wording that settles the probe |
| Probe expected open, validator says true or false | Overreach | Narrow the statement to the source's scope or condition |
| Validator gives the opposite answer | The statement misleads, or the probe is wrong | Recheck the probe against the source, then fix whichever is at fault |
| Grader: lost, overreach, or vacuous, and the source bears it out | A collapse went too far | Repair the idea, and add a probe for it so it cannot quietly recur |
| Grader: collapsible, and the merge would hold | Not compressed enough | Make it the next collapse |
| Grader: a finding the source does not bear out | Grader noise | Drop it |

A candidate holds when every probe passes and no finding of lost, overreach, or vacuous survives your check.

| The candidate | Next |
|---|---|
| Does not hold | Repair at the level of the idea. Pasting the lost item back grows the list again, so look for the general statement that would have produced it, and restore an item verbatim only when it is irreducible. If a collapse still fails after one repair, undo it and do not retry it. |
| Holds, and a collapse is left to try (the grader's, or one you see) | It is the best so far. Make that collapse next. |
| Holds, and no collapse is left | Stop. |

Holding is not a reason to stop: a candidate that changed little holds trivially. The stopping point is known only once going further has been tried and broke, or neither you nor the grader can name anything further to try. Stop also when two rounds in a row produce no shorter candidate that holds, or at the round limit.

Return the shortest candidate that held, exactly as it was judged. An edit made after the last judging is a new candidate that nobody has checked, so judge it or leave it out. Before returning it, run the validator on it once more in a fresh context: validators vary at the edge, and a probe that fails on a second read marks an idea stated too thinly to rely on. Repair that and judge again.

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

Omit a line that has nothing to report. "Now also covers" and "Needs your call" are where you inferred intent, so they are what the user most needs to check.

## Gotchas

- A merged statement silently takes the widest scope and the weakest force of its parts. One rule's "in integration tests" or "never" disappears in the merge. Carry each part's own qualifiers into the result.
- A reason is not a rule. "A retry hides the cause" forbids nothing; when a reason replaces rules, state it with their force.
- A failing probe is not automatically the candidate's fault, and a passing one is not proof. Read the words the validator says it relied on: a right answer quoted from nowhere in the candidate came from general knowledge.
- Deeper is not always better. When the only statement that covers two ideas is one neither idea's author would recognize, they are two ideas.
