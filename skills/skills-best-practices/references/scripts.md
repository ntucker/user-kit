# Scripts and commands in skills

An agent reads a script's stdout/stderr to decide its next step, cannot answer prompts, and may retry. Design for that reader.

## When to bundle

- Prefer a pinned one-off command when a published tool already does the job: `npx pkg@1.2.3 …`, `uvx tool@0.8.0 …`, `go run mod@v1 …`.
- Move to `scripts/` when a command is hard to get right first try, when transcripts show the agent rewriting the same helper, or when consistency matters (validation, plan checks, format conversion).
- Make dependencies self-contained: PEP 723 inline metadata run with `uv run`, `npm:` specifiers under Deno, `bundler/inline` for Ruby. Otherwise state prerequisites in `SKILL.md` and use the `compatibility` field for runtime-level needs.

## Interface

- **Never interactive.** No TTY prompts, confirmations, or password dialogs. Take input via flags, environment, or stdin, and fail with usage text when required input is missing.
- **`--help` is the interface documentation.** Brief purpose, flags, examples, exit codes. Keep it short; it lands in context.
- **Errors say what was expected and what to try.** "Error: --format must be one of json, csv, table; received 'xml'" turns a wasted turn into a corrected retry.
- **For machine-consumed output, use JSON/TSV on stdout and progress or warnings on stderr.** Human-facing validators may default to concise text when they also offer a structured-output flag.
- **Distinct exit codes** per failure type.

## Behavior

- Idempotent where possible ("create if missing").
- Reject ambiguous input with a clear error instead of guessing; prefer enums and closed sets.
- `--dry-run` for destructive or stateful operations; require `--confirm`/`--force` where the risk warrants.
- Bound output size. Harnesses truncate tool output (often 10–30K chars); default to a summary and offer `--offset`/`--limit` or `--output <file>` for the rest.
- Write invocations as `python3 <skill-dir>/scripts/x.py`, and say whether each script is executed or read as reference.

## Validators as the lever

The most reusable script in a skill is often a validator: it checks the agent's plan or output against a source of truth and emits self-correcting errors ("field 'signature_date' not found — available: customer_name, order_total, signature_date_signed"). Pair it with a do → validate → fix loop in the target skill's body.
