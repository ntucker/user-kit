# Trigger accuracy

For auto-invoked skills: measuring and revising the description, which together with `name` is all the agent sees when deciding (after `paths` or directory scoping has decided whether the skill is presented at all).

## Description content that affects triggering

Beyond the basics (capability, then "Use when…", with the user's terms): be pushy about scope—name indirect cases ("even if they don't say 'dashboard'"), adjacent phrasings, and situations where this skill competes with another and should win—and draw the boundary in one clause. Descriptions grow during tuning; re-check the 1024-character cap.

## Eval queries

Aim for ~20, labeled, and show the set to the user before spending runs on it—a bad query corrupts every measurement.

```json
[
  {"query": "ok so my boss sent me 'Q4 sales final FINAL v2.xlsx' (downloads folder) and wants a profit margin column — revenue is col C, costs col D i think", "should_trigger": true},
  {"query": "write a python script that reads a csv and uploads each row to postgres", "should_trigger": false}
]
```

Should-trigger (8–10): vary formality, typos, length, and how explicitly the domain is named; bury the need inside a larger multi-step request. The valuable ones are where the skill would help but the query does not say so.

Should-not-trigger (8–10): near-misses that share keywords or concepts but need something else (Excel formula editing for a CSV-analysis skill; CSV→database ETL). Obviously unrelated queries test nothing.

Keep queries multi-step; one-step tasks rarely trigger regardless of description.

## Measuring

`trigger_eval.py` runs each query through the Cursor CLI headless in plan mode (read-only, at some fidelity cost versus agent mode), counts a run as triggered when the agent reads `<skill>/SKILL.md`, and reports pass/fail per query:

```bash
python3 <skill-dir>/scripts/trigger_eval.py --queries queries.json \
  --skill-path /absolute/path/to/my-skill/SKILL.md \
  --workspace /path/where/skill/is/discoverable --runs 3 --model <model>
```

Smoke-test first: one obviously-positive query with `--runs 1`. If it does not trigger, inspect a raw `agent -p --output-format stream-json` run before trusting any batch result. Always pass `--model`, chosen per the eval-model rule from `agent --list-models`; the CLI's Auto default hides which model was tested. Read slug suffixes carefully—"low" and "fast" mean effort and latency, not price, so `<frontier>-low-fast` is still a frontier model and `<budget>-low` tests laziness rather than the description. Confirm the model actually used from the `system` init event in the stream. Budget: positives finish in seconds, negatives run to completion (a minute or more), so 20 queries × 3 runs is roughly 30–60 minutes; start with `--runs 1` on the train set and use 3 only for borderline queries. Without the CLI, start fresh chats manually and check whether the transcript shows a read of the skill file—the same signal, by hand.

## Optimization loop

1. Shuffle once and split ~60% train / ~40% validation, each with a proportional mix of positives and negatives. Keep the split fixed.
2. Evaluate the train set. Keep the current description and score as the baseline.
3. Revise from train failures only:
   - Missed triggers → scope is too narrow; add the category of situation, not the failed query's words.
   - False triggers → too broad; state what the skill does not do or where the boundary with an adjacent capability lies.
   - Stuck after a couple of rounds → change the structure or framing of the description instead of tweaking phrases.
4. Repeat on train up to ~5 times. Retain at most two materially different finalists with the best train results.
5. Run the baseline and finalists on validation once. Choose the best validation pass rate, breaking ties toward the shorter or earlier description because eight queries resolve only 12.5% steps.
6. Confirm the winner with 5–10 fresh queries at 3+ runs, then update the frontmatter.

If nothing improves, suspect the queries (mislabeled, too easy, too hard) before the description.

## Rewrite prompt

Use in a fresh subagent when you want an independent rewrite:

```
Rewrite the description for the skill "<name>". The agent sees only name + description
when deciding whether to load the skill; the body is read afterwards.

Current description: <text>
Skill body (for what it actually does): <SKILL.md body>
Train results: <passed/total>
Missed triggers (should have fired): <queries>
False triggers (should not have fired): <queries>
Previous attempts and scores: <list, so you do not repeat them>

Write one new description: capability, then an imperative trigger clause aimed at the agent,
user-intent focused, states scope and boundary, generalizes from the failures rather than
listing them, structurally different from prior attempts if they stalled, under 1024
characters. Return only the description.
```
