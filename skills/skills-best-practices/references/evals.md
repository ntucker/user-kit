# Output-quality evals in Cursor

Answers "does this skill make outputs better, and at what cost?" by running the same prompts with and without the skill and grading with evidence. Use the available subagent tool with a fresh `generalPurpose` run for each case; some clients call it `Task`, others `Subagent`. Clean contexts make the comparison honest—you wrote the skill, so running it yourself proves little. Without subagents, use fresh chats or `agent -p`; running cases in the authoring session is only a sanity check and baselines mean nothing there.

## Workspace

Put the snapshot and run outputs in a directory outside every skills root—`/tmp/<skill>-workspace/` or a gitignored folder. Cursor discovers any `SKILL.md` under a skills root, so a snapshot placed there becomes a duplicate skill and contaminates the very runs meant to compare against it. (The case definitions themselves stay in the skill's `evals/`; they contain no `SKILL.md`.) Layout, created as you go:

```
<workspace>/
├── skill-snapshot/                 # cp -r of the skill before editing (baseline when improving)
└── iteration-N/<eval-name>/{with_skill,without_skill|old_skill}/outputs/
```

Never let an eval mutate real external state. Use dry runs, mocks, sandbox accounts, or disposable targets for deploys, migrations, pushes, billing, and similar operations. A worktree isolates files and Git state only; use one in addition when the task also edits a repository.

## 1. Test cases

Store in `<skill>/evals/evals.json`. Start with 2–3 and show them to the user before running—a bad case corrupts every run.

```json
{
  "skill_name": "csv-analyzer",
  "evals": [
    {
      "id": 1,
      "name": "top-months-chart",
      "prompt": "I have monthly sales in data/sales_2025.csv — find the top 3 months by revenue and make a bar chart",
      "expected_output": "Bar chart of the top 3 months with labeled axes and values",
      "files": ["evals/files/sales_2025.csv"],
      "assertions": []
    }
  ]
}
```

Prompts read like real messages: file paths, column names, personal context, casual phrasing. Vary formality and detail; include one boundary case (malformed input, ambiguous instruction).

## 2. Runs

Spawn the with-skill and baseline subagents for every case in the same turn so they finish together. Set every runner's model per the eval-model rule, choosing from the session's available subagent models. Grade with a stronger model; the grader's judgment is not what is under test.

With skill:

```
Execute this task.
- First read the skill at <abs path>/SKILL.md and follow it, loading its references as it directs.
- Task: <prompt>
- Input files: <paths or "none">
- Save outputs to: <workspace>/iteration-N/<eval-name>/with_skill/outputs/
- Also write outputs/transcript.md: start and end timestamps, the steps you took, tools used, anything you were unsure of or worked around.
- Return: files created and a one-paragraph summary.
```

Baseline: identical prompt with the first bullet replaced by "Do not read any skill files" (saving to `without_skill/`) or by "Read only `<workspace>/skill-snapshot/SKILL.md`; do not read `<name>` from your skills list" (saving to `old_skill/`). The subagent can still see the live skill in its skills list; the instruction is the only barrier, so check its transcript for a read of the live path.

A direct subagent result carries no token or duration fields; the run's own timestamps give duration. When token cost matters, run cases through the CLI instead—`agent -p --output-format json --trust -f --model <cheap model> --workspace <dir> "<prompt>"`—whose result event carries `duration_ms` and (undocumented but present) `usage` token counts. Without `-f`, unattended shell steps are denied and results are not comparable to subagent runs; with it, use the isolation above.

## 3. Assertions

Draft them while runs are in progress, from the expected outputs; finalize against real outputs, because you rarely know what "good" looks like until you have seen a run. Good assertions are objectively checkable and read clearly in a results table:

- "Output file is valid JSON"; "chart has both axes labeled"; "report lists ≥3 recommendations".
- Not: "output is good" (unverifiable); "contains exactly the phrase 'Total Revenue: $X'" (brittle).

Record assertions in `evals.json` for reuse.

## 4. Grading

One grader subagent can grade every run of an iteration. Use a script for mechanical checks (valid JSON, file exists, row count). Grader prompt:

```
You are grading agent runs against assertions. Burden of proof is on PASS; no partial credit.
For each run directory listed: assertions <list>, transcript <run>/outputs/transcript.md, outputs <run>/outputs/.
PASS only with concrete evidence of genuine completion (a file that exists AND has correct content, not just the right name; a step the outputs show, not one the transcript merely claims). Otherwise FAIL. Quote or describe the evidence.
Also: (a) extract factual/process/quality claims the run made and verify them; (b) flag assertions a clearly wrong output would still pass, and important outcomes no assertion covers.
Write <run>/grading.json:
{"assertions":[{"text":"","passed":true,"evidence":""}],
 "summary":{"passed":0,"failed":0,"total":0,"pass_rate":0.0},
 "claims":[{"claim":"","verified":true,"evidence":""}],
 "eval_feedback":{"suggestions":[{"assertion":"","reason":""}],"overall":""}}
```

## 5. Aggregate and analyze

Compute per-configuration mean pass rate and time plus the delta (a short script is fine). Read the delta as a trade: a large pass-rate gain justifies added time and tokens; a marginal gain at double the cost argues for cutting the skill down. Then look past the averages:

- Passes in both configurations: does not measure the skill; drop or sharpen.
- Fails in both: broken, too hard, or checking the wrong thing; fix before the next iteration.
- Passes only with the skill: its value; know which instruction produced it.
- Passes only without the skill: an instruction is making things worse; find and remove it before any other change.
- Inconsistent across runs: flaky eval or ambiguous instruction; add an example or tighten wording.
- Time outliers: read that transcript for the bottleneck.

## 6. Human review before self-revision

Present each case's prompt and outputs to the user and collect feedback per case before drawing your own conclusions. Empty feedback means "fine"; "chart is missing axis labels" is actionable, "looks bad" is not. Humans catch what no assertion anticipated—technically correct output that misses the point.

## 7. Iterate

Three signals feed the revision: failed assertions (specific gaps), human feedback (approach or structure), transcripts (why). Classify and revise per the Improving workflow and Principles of skill "skills-best-practices", then re-run the changed skill into `iteration-N+1/` and review again. Reuse baseline artifacts while prompt, model, snapshot, environment, and fixtures are unchanged; rerun them only when an input changes or when intentionally measuring variance. Once the set passes consistently, add cases before declaring done—a skill tuned on three prompts has been shown to work on three prompts.

For "is v2 really better than v1", run a blind comparison: give a subagent both outputs labeled A/B without saying which version produced which, have it build a task-specific rubric (correctness, completeness, organization, usability), score both, and pick a winner—ties only when genuinely equivalent; if both fail, the less-bad one. Then unblind and read both transcripts, separating causal differences (an instruction the transcript shows being followed) from incidental ones, and propose only changes that would help the other cases too.
