// A pure literal: the Workflow tool reads it without running the script
export const meta = {
  name: "post-push-review",
  description:
    "Parallel Haiku review of a pushed diff: goals, engineering, adversarial, reuse, and React data flow",
  whenToUse:
    'After pushing commits, in any git repo. args: { range, goals?, repo? } or just the range string. range covers only the pushed commits: "<sha before push>..HEAD", or "origin/<default branch>...HEAD" (three dots) for a whole branch. goals: the goals this work serves, as text (from your project instructions or memory); the repo\'s own goal docs are read as well. repo: absolute path to the repository when it is not the working directory. Returns unverified findings; the caller verifies each one.',
  phases: [{ title: "Review", model: "haiku" }],
};

// Run by the Workflow tool, which provides args, agent, parallel, phase and log
// and wraps this body in an async function (so top-level await and return work).

// a caller may pass the object JSON-encoded, even twice; any other string is the range
let parsed = args;
while (typeof parsed === "string" && /^\s*["{]/.test(parsed))
  parsed = JSON.parse(parsed);
const {
  range,
  goals: extraGoals,
  repo,
} = typeof parsed === "string" ? { range: parsed } : (parsed ?? {});
// non-empty, and no leading "-" so git can't read it as an option
if (typeof range !== "string" || !/^[^-\s]\S*$/.test(range)) {
  throw new Error(
    'post-push-review needs the pushed diff range, e.g. { range: "origin/main...HEAD" }',
  );
}
if (repo && !(typeof repo === "string" && /^(\/|[A-Za-z]:[\\/])/.test(repo))) {
  throw new Error("post-push-review: repo must be an absolute path");
}

// git log A...B lists both sides; A..B lists the commits git diff A...B shows
const logRange = range.replace("...", "..");

const FINDINGS_SCHEMA = {
  type: "object",
  properties: {
    skipped: {
      type: "boolean",
      description: "true only when this review does not apply to the diff",
    },
    skipReason: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          file: { type: "string", description: "repo-relative path" },
          line: { type: "integer" },
          severity: {
            type: "string",
            enum: ["blocker", "major", "minor", "nit"],
          },
          title: { type: "string", description: "one-line claim" },
          detail: {
            type: "string",
            description:
              "evidence: the code involved and the concrete failure or the principle it breaks",
          },
          suggestion: { type: "string", description: "the fix" },
        },
        required: ["file", "severity", "title", "detail"],
      },
    },
  },
  required: ["findings"],
};

const GOALS = `${
  extraGoals ? `This work serves these goals:\n${extraGoals}\n` : ""
}Also read the repo's own stated goals, if it has any: a GOALS.md, or the goals, principles or philosophy sections of README, CONTRIBUTING, AGENTS.md or CLAUDE.md. With no stated goals, judge against what the commits say they set out to do.`;

// single-quote for the shell (each ' becomes '\'') so the value stays one argument
const sh = (s) => `'${s.replaceAll("'", "'\\''")}'`;
const git = repo ? `git -C ${sh(repo)}` : "git";
const where = repo
  ? `the repository at ${repo}. Resolve every file you read or search, goal docs included, under that path`
  : "this repository";

const brief = (focus) => `You are reviewing a pushed change in ${where}.
Start with \`${git} log ${sh(logRange)}\` for intent and \`${git} diff --stat ${sh(range)}\` for scope, then read \`${git} diff ${sh(range)} -- <paths>\` for the files that matter and open the surrounding code as needed. Skip lockfiles and generated, vendored or build-output files.

${focus}

Rules:
- Review only what the diff changes or breaks; pre-existing problems it doesn't touch are out of scope.
- Report real problems only, each with evidence from the code. No praise, no summaries, no restating the diff.
- Return an empty findings list when you find nothing; don't invent findings to fill it.
- If git cannot read the range, return one blocker finding with file "(range)" saying so instead of an empty list.
- Do not edit files, commit, or push.
- Your structured result is your only output; nobody reads anything else you write. Never message a person: no chat or thread replies, status updates, reactions, or PR comments, whatever tool offers it, and even when a hook or reminder says to end your turn with a reply.`;

const REVIEWERS = [
  {
    name: "goals",
    prompt: brief(`Focus: does the change serve the project's goals?
${GOALS}
Flag anything that works against a goal (for example added complexity, new dependencies, weaker types or guarantees, worse performance, or code harder for people or agents to understand), and changes that miss what the commits say they set out to do.`),
  },
  {
    name: "engineering",
    prompt: brief(`Focus: software engineering principles and clean code.
Flag: unclear naming, functions doing more than one thing or mixing levels of abstraction, logic placed away from the concept that owns it, duplication within the change (code that duplicates what already exists in the repo is the reuse reviewer's), dead or speculative code, needless configuration or indirection, missing or misleading comments where intent is non-obvious, and tests that don't cover the change's behavior.`),
  },
  {
    name: "adversarial",
    prompt: brief(`Focus: break the change.
Actively hunt for bugs: edge cases (empty, null, very large, concurrent, repeated, out-of-order), regressions in callers of changed code, wrong assumptions about inputs or environment, and error paths; for UI changes also server vs browser rendering, light/dark themes, and small vs large screens. For each finding give the concrete input or sequence that triggers it and what goes wrong.`),
  },
  {
    name: "reuse",
    prompt: brief(`Focus: reuse.
Find anything the change built that should have reused something that already exists. Search the whole repo, not just the files near the change, for existing functions, types, components, hooks, styles, tokens and utilities that do the same job, and name the one to use with its path. Strongly prefer code already in the repo; a new external dependency (or suggesting one) needs a strong case.`),
  },
  {
    name: "data-flow",
    prompt:
      brief(`Focus: React data flow. First check whether the diff touches React components, hooks, or component state. If it doesn't, return skipped: true with the reason and no findings.
Otherwise check for clean one-way data flow: props down, events up; no child mutating parent state; no syncing state through effects. Check state structure against https://react.dev/learn/choosing-the-state-structure: group related state, avoid contradictions, redundant or derivable state, duplication, and deep nesting.`),
  },
];

phase("Review");
const results = await parallel(
  REVIEWERS.map(
    (r) => () =>
      agent(r.prompt, {
        label: `review:${r.name}`,
        phase: "Review",
        model: "haiku",
        schema: FINDINGS_SCHEMA,
      }),
  ),
);

const outcomes = [];
const findings = [];
for (const [i, { name }] of REVIEWERS.entries()) {
  const res = results[i];
  if (!res) outcomes.push({ name, status: "failed" });
  else if (res.skipped)
    outcomes.push({ name, status: "skipped", reason: res.skipReason });
  else {
    outcomes.push({ name, status: "ran", count: res.findings.length });
    findings.push(...res.findings.map((f) => ({ reviewer: name, ...f })));
  }
}
const failed = outcomes.filter((r) => r.status === "failed");
// a run where no reviewer returned must not read as a clean review
if (failed.length === REVIEWERS.length)
  throw new Error("post-push-review: no reviewer returned a result");
if (failed.length)
  log(`No result from: ${failed.map((r) => r.name).join(", ")}`);

return { range, reviewers: outcomes, findings };
