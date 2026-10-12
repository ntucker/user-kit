---
name: when-to-use-bend
description: Judges whether a task should be written in Bend 2 (bend-lang.com), the language that proves agent-written code against declared laws and runs balanced recursion in parallel on CPU or GPU. Use when the user mentions Bend, asks whether it fits, quotes its benchmarks, or wants an algorithm agents keep editing to be provably correct and fast. Not for writing Bend code, or for Bend 1/HVM2.
metadata:
  sources: github.com/bendlang/bend README, GUIDE.md, bench pins; bend 2.0.36 (2026-10)
---

# Is Bend the right tool?

Recommend Bend 2 only when at least two of these matter: proofs that block bad agent edits, fast checking in the loop, parallel speed. Ignore Bend 1 material; it is a different language.

| Task | Verdict |
|---|---|
| Pure algorithm agents keep editing, rules tests can't cover, speed matters (scheduling, allocation, sorting, interpreters) | Best fit |
| Rules only, speed irrelevant (workflow, auth, protocol states) | Maybe; Lean/Dafny are more mature |
| Balanced divide-and-conquer or uniform numeric compute | Fit for speed; GPU helps uniform work |
| Divergent search (queens, lexing, hashing) | CPU at best; GPU is slower |
| SAT/SMT/ILP-shaped problems | Use the solver |
| Text, 64-bit or float math, HTTP/JSON, CRUD, ecosystem-heavy, production-critical | No |

Costs to state: verbose, no tactics, so proofs are manual; only `Nat`/`U32`/`F32`, and floats are unprovable; tiny stdlib; young, mostly AI-written compiler (only `--verdict` uses a proven kernel); laws prove what they say, not what was meant.

Benchmarks are upstream's own: single-core Bend runs about C speed (1.0–1.5x, worse on hashmap and lexer); the 124x GPU figure is against single-core Bend, not parallel C or CUDA; the checker-speed wins come from synthetic files.

If yes: run `bend guide` before writing any Bend.
