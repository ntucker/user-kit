#!/usr/bin/env python3
"""Measure how reliably a skill triggers, using the harness CLI in headless mode.

For each query in a JSON file, runs the harness CLI several times in read-only plan mode
and records whether the agent loaded the skill. A run is terminated the moment it triggers.

  cursor: `agent -p --output-format stream-json --mode plan --workspace <dir>`. Triggered
          when a readToolCall for the exact --skill-path appears.
  claude: `claude -p --output-format stream-json --verbose --permission-mode plan`, run with
          <dir> as the working directory. Triggered when the Skill tool is called with the
          skill's name or a Read of the exact --skill-path appears. The init event's skill
          list is checked first; a skill missing from it is not discoverable from <dir>.

--harness auto picks claude inside a Claude Code session (CLAUDECODE=1), else cursor.
Requires the chosen CLI on PATH and logged in. Python 3.8+, stdlib only.

queries.json: [{"query": "...", "should_trigger": true}, ...]

Output (stdout, JSON): per-query trigger_rate, timeouts, and pass/fail, plus a summary
listing missed and false triggers. Progress goes to stderr. A query counts as triggered when
its trigger rate is strictly above --threshold; use an odd --runs to avoid ties. Any query
with a timed-out run is inconclusive and is not scored.

Exit codes: 0 all queries passed; 1 some failed; 2 bad arguments or input; 3 harness CLI
not found; 4 the CLI failed (not logged in, bad --model, untrusted workspace, skill not
discoverable) - results would be meaningless, so the script aborts and prints the CLI's
stderr; 5 one or more queries were inconclusive.
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading


class CLIError(Exception):
    pass


QUERY_FORMAT = "a non-empty JSON list of {query: str, should_trigger: bool}"


CLIS = {"cursor": "agent", "claude": "claude"}
warned_rivals = False


def build_command(harness, query, workspace, model, effort):
    if harness == "cursor":
        return ["agent", "-p", "--output-format", "stream-json", "--trust", "--mode", "plan",
                "--workspace", workspace, "--model", model, query]
    cmd = ["claude", "-p", "--output-format", "stream-json", "--verbose", "--permission-mode", "plan",
           "--model", model]
    if effort:
        cmd += ["--effort", effort]
    return cmd + [query]


def tool_calls(harness, event):
    """Yield (tool, args) for each tool call in a stream event; tool is "read", "skill", or None."""
    if harness == "cursor":
        if event.get("type") == "tool_call":
            read = event.get("tool_call", {}).get("readToolCall")
            if read:
                yield "read", read.get("args", {}).get("path")
        return
    if event.get("type") != "assistant":
        return
    for block in event.get("message", {}).get("content") or []:
        if isinstance(block, dict) and block.get("type") == "tool_use":
            args = block.get("input") or {}
            name = block.get("name")
            if name == "Read":
                yield "read", args.get("file_path")
            elif name == "Skill":
                yield "skill", str(args.get("skill", "")).lstrip("/")


def check_init(harness, event, skill_name):
    """Raise CLIError when Claude Code's init event shows the skill is not discoverable."""
    if harness != "claude" or event.get("type") != "system" or event.get("subtype") != "init":
        return
    skills = event.get("skills") or []
    if skill_name not in skills:
        raise CLIError("skill %r is not in the session's skill list, so it cannot trigger; put it under "
                       "<workspace>/.claude/skills/ or ~/.claude/skills/. Discovered: %s"
                       % (skill_name, ", ".join(skills) or "none"))
    global warned_rivals
    rivals = [s for s in skills if s.endswith(":" + skill_name)]
    if rivals and not warned_rivals:
        warned_rivals = True
        print("  warning: plugin copies %s compete with the skill under test; invocations of them "
              "are not counted" % ", ".join(rivals), file=sys.stderr)


def run_once(harness, query, skill_path, workspace, model, effort, timeout):
    """Return "triggered", "not_triggered", or "timeout". Raise CLIError if the CLI itself failed."""
    cmd = build_command(harness, query, workspace, model, effort)
    skill_path = os.path.realpath(skill_path)
    skill_name = os.path.basename(os.path.dirname(skill_path))
    with tempfile.TemporaryFile(mode="w+") as err:  # a pipe could fill and deadlock; a file cannot
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stdin=subprocess.DEVNULL, stderr=err, text=True,
                                cwd=workspace if harness == "claude" else None)
        timed_out = False

        def on_timeout():
            nonlocal timed_out
            if proc.poll() is None:
                timed_out = True
                proc.kill()

        timer = threading.Timer(timeout, on_timeout)
        timer.start()
        triggered = saw_result = is_error = False
        error_text = ""
        events = 0
        try:
            for line in proc.stdout:
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                events += 1
                check_init(harness, event, skill_name)
                kind = event.get("type")
                for tool, arg in tool_calls(harness, event):
                    if tool == "read" and arg and not os.path.isabs(arg):
                        arg = os.path.join(workspace, arg)
                    if (tool == "skill" and arg == skill_name
                            or tool == "read" and arg and os.path.realpath(arg) == skill_path):
                        triggered = True
                        break
                if triggered:
                    proc.terminate()
                    break
                if kind == "result":
                    saw_result = True
                    is_error = bool(event.get("is_error"))
                    error_text = str(event.get("result") or "") if is_error else ""
        except CLIError:
            proc.kill()
            proc.communicate()
            raise
        else:
            try:
                proc.communicate(timeout=10)  # drain remaining stdout; a CLI that ignores SIGTERM gets killed
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.communicate()
        finally:
            timer.cancel()
        err.seek(0)
        stderr = err.read()
    if triggered:
        return "triggered"
    if timed_out:
        if events <= 1:  # nothing beyond the init event: the CLI is stuck, not the agent undecided
            raise CLIError("run produced no events before the %ss timeout; the CLI appears stuck (approval prompt? network?)\n%s" % (timeout, stderr.strip()[-2000:]))
        print("  timeout after %ss; counting as not triggered" % timeout, file=sys.stderr)
        return "timeout"
    if is_error or not saw_result or proc.returncode != 0:
        detail = "\n".join(t for t in (error_text, stderr.strip()[-2000:]) if t)
        raise CLIError(detail or "%s exited %s without a result event" % (cmd[0], proc.returncode))
    return "not_triggered"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--queries", required=True, help="JSON file: [{query: str, should_trigger: bool}, ...]")
    ap.add_argument("--skill-path", required=True, help="Exact path to the skill's SKILL.md")
    ap.add_argument("--workspace", required=True, help="Directory where the skill is discoverable")
    ap.add_argument("--runs", type=int, default=3, help="Runs per query, >=1 (default 3)")
    ap.add_argument("--threshold", type=float, default=0.5, help="Trigger rate must be strictly above this to count as triggered (default 0.5)")
    ap.add_argument("--harness", choices=["auto", "cursor", "claude"], default="auto",
                    help="CLI to run: cursor (`agent`) or claude (`claude`); auto picks claude when CLAUDECODE=1 (default auto)")
    ap.add_argument("--model", required=True,
                    help="Model to test with: a slug from `agent --list-models` (cursor) or an alias such as haiku (claude)")
    ap.add_argument("--effort", choices=["low", "medium", "high", "xhigh", "max"],
                    help="claude only: effort level (cursor encodes effort in the model slug)")
    ap.add_argument("--timeout", type=int, default=180, help="Seconds per run before killing it (default 180)")
    ap.add_argument("--output", help="Also write results JSON to this file")
    args = ap.parse_args()

    if args.runs < 1:
        ap.error("--runs must be >= 1")
    if not 0 <= args.threshold < 1:
        ap.error("--threshold must be in [0, 1)")
    harness = args.harness
    if harness == "auto":
        harness = "claude" if os.environ.get("CLAUDECODE") == "1" else "cursor"
    if args.effort and harness != "claude":
        ap.error("--effort applies only to --harness claude; pick a Cursor model slug with the effort suffix instead")
    if shutil.which(CLIS[harness]) is None:
        print("Error: `%s` CLI not found on PATH. Install the %s CLI and log in, or pass --harness."
              % (CLIS[harness], "Claude Code" if harness == "claude" else "Cursor"), file=sys.stderr)
        return 3
    if not os.path.isdir(args.workspace):
        ap.error("--workspace %s is not a directory" % args.workspace)
    if not os.path.isfile(args.skill_path):
        ap.error("--skill-path %s is not a file" % args.skill_path)
    skill_path = os.path.realpath(args.skill_path)
    skill_name = os.path.basename(os.path.dirname(skill_path))
    try:
        with open(args.queries) as f:
            queries = json.load(f)
    except (OSError, ValueError) as e:
        ap.error("--queries must be %s: %s" % (QUERY_FORMAT, e))
    if not isinstance(queries, list) or not queries:
        ap.error("--queries must be %s" % QUERY_FORMAT)
    for i, q in enumerate(queries):
        if not (isinstance(q, dict) and isinstance(q.get("query"), str) and isinstance(q.get("should_trigger"), bool)):
            ap.error("--queries[%d] must be {query: str, should_trigger: bool}" % i)

    results = []
    for i, q in enumerate(queries, 1):
        print("[%d/%d] %s" % (i, len(queries), q["query"][:80]), file=sys.stderr)
        hits = timeouts = 0
        for _ in range(args.runs):
            try:
                outcome = run_once(harness, q["query"], skill_path, args.workspace, args.model, args.effort,
                                   args.timeout)
            except CLIError as e:
                print("Error: the harness CLI failed, so trigger results would be meaningless.\n%s" % e, file=sys.stderr)
                return 4
            hits += outcome == "triggered"
            timeouts += outcome == "timeout"
        completed = args.runs - timeouts
        rate = hits / completed if completed else None
        inconclusive = bool(timeouts)
        passed = None if inconclusive else (rate > args.threshold) == q["should_trigger"]
        verdict = "INCONCLUSIVE" if inconclusive else ("PASS" if passed else "FAIL")
        print("  triggered %d/%d%s -> %s" % (hits, completed, " (%d timeouts)" % timeouts if timeouts else "",
                                             verdict), file=sys.stderr)
        results.append({"query": q["query"], "should_trigger": q["should_trigger"], "triggers": hits,
                        "timeouts": timeouts, "runs": args.runs, "completed_runs": completed,
                        "trigger_rate": rate, "passed": passed, "inconclusive": inconclusive})

    failed = [r for r in results if r["passed"] is False]
    inconclusive = [r for r in results if r["inconclusive"]]
    passed_count = sum(r["passed"] is True for r in results)
    out = {
        "summary": {
            "skill_name": skill_name,
            "harness": harness, "model": args.model, "effort": args.effort,
            "skill_path": skill_path,
            "total": len(results), "passed": passed_count, "failed": len(failed),
            "inconclusive": len(inconclusive),
            "pass_rate": passed_count / (passed_count + len(failed)) if passed_count + len(failed) else None,
            "missed_triggers": [r["query"] for r in failed if r["should_trigger"]],
            "false_triggers": [r["query"] for r in failed if not r["should_trigger"]],
        },
        "results": results,
    }
    text = json.dumps(out, indent=2)
    print(text)
    if args.output:
        with open(args.output, "w") as f:
            f.write(text)
    return 5 if inconclusive else (1 if failed else 0)


if __name__ == "__main__":
    sys.exit(main())
