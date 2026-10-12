---
name: when-to-use-bend
description: Judges whether a task should be written in Bend 2 (bend-lang.com), the language that proves agent-written code against declared laws and runs balanced recursion in parallel on CPU cores or the GPU, and what it would cost compared with Lean, Dafny, Rust, CUDA, JAX, or a solver. Use when the user mentions Bend or law-driven development, asks whether Bend fits a project or algorithm, quotes Bend performance or verification claims, or is choosing how to make an algorithm agents keep editing provably correct and fast, even without naming Bend. Not for writing Bend code itself, and not for Bend 1 or HVM2.
metadata:
  sources: github.com/bendlang/bend README, guide/GUIDE.md, WONTFIX.txt, and bench pins; runs of bend 2.0.36 (2026-10)
---

# Is Bend the right tool?

Bend 2 combines three things: laws, proven about the code, that block an agent's edit when it breaks them; a checker fast enough to run on every edit; and parallel calls that spread balanced work over CPU cores or the GPU without threads or kernels. Recommend it where at least two of those matter at once, and name its costs in the same answer.

Bend 2 is newer than most training data. Most Bend material online is Bend 1, a different language on the HVM2 runtime with nothing carried over, so do not reason from Bend 1 features or benchmarks.

## Decide

| The task | Verdict |
|---|---|
| A pure algorithm agents keep editing, with precise rules tests cannot cover (scheduling, allocation, sorting, state machines, interpreters), whose run time also matters | Strongest fit: all three benefits compound |
| The same, but speed does not matter (workflow, authorization, or protocol transitions that must be impossible) | Plausible. Lean or Dafny have far more mature tooling; Bend's edge is checking latency inside an agent loop and native execution |
| Divide-and-conquer compute that splits into balanced halves (trees, fractals, uniform numeric grids, simulations) | Fit for speed alone; easier than CUDA or hand-rolled threads, with no verification benefit unless laws are written |
| Divergent branching search (n-queens, lexing, hashing) | CPU-parallel Bend at best; upstream's own benches run these slower on the GPU than on CPU cores |
| A problem a mature solver covers (SAT, SMT, ILP, routing) | Use the solver. Bend can at most verify a checker of its answers |
| Text-heavy work, 64-bit integers or doubles, floating-point properties, HTTP/JSON/TLS services, CRUD, front-end, or anything leaning on an ecosystem | Poor fit (see costs) |
| Production code that must be trustworthy today | Prototype only: upstream says Bend is young and expects bugs |

## Costs to state

From upstream's limitations list (2.0.36):

- Verbose: nothing is inferred, no type classes or traits, no tactics or proof search, so proofs take real effort.
- Small Base and few effects: no HTTP library, JSON, TLS, or regex (only as hand-written foreign C/JS effects); strings are linked lists, so text is slow.
- Numbers are `Nat`, `U32`, and `F32` only, and nothing about `F32` is provable.
- Values are affine and recursion must terminate, so idiomatic code from other languages does not port directly.
- One C file per program, slow native compiles (clang only); the JS target is fast to build but single-core.
- Terse errors, no debugger, profiler, REPL, or test framework. Linux and macOS only (WSL on Windows).
- The compiler is mostly AI-written and not fully audited. The default checker has no proof; only `--verdict` rechecks with a kernel proven in Lean, and the parser and the translation into that kernel are unproven. Laws hold for Bend's semantics, and backends can still differ (`F32` NaN).
- A law proves what it says, not what the user meant. Writing and reviewing laws stays a human job, and running `main` does not check them; only `bend PROOF.bend` does.

## Reading the performance claims

Upstream's pins (bench/runtime and bench/checker, Apple M4 Max, September 2026) are its own measurements; independent cross-language benchmarks are scarce.

| Claim | What the pins show |
|---|---|
| "As fast as C" | Single-core Bend against single-threaded C twins: usually 1.0–1.5x C's time (gameoflife 7.8s vs 6.8s; tree-matmul beats C), but lexer takes about 2.1x and hashmap about 4.4x |
| Huge parallel speedups | Relative to single-core Bend. gameoflife: 7.8s on one core, 0.65s on 16, 0.063s on the GPU (about 124x). The C, TS, and Lean twins are not parallelized, so none of this beats optimized parallel code or hand-written CUDA |
| The GPU always helps | No: hashmap, lexer, queens, and symreg are slower on the GPU than on 16 CPU cores. Uniform numeric work (mandelbrot, nbody, gameoflife, merkle) gains most |
| Checker orders of magnitude faster than other provers | Measured on synthetic files of thousands of small defs or proofs (proofs_3200: Bend 0.83s, Rocq 9.5s, Lean >300s). Upstream says it lacks checker benchmarks, so expect less on real proofs |

## Against alternatives

| Alternative | Prefer Bend when | Prefer the alternative when |
|---|---|---|
| Rust, TypeScript, Python | An invariant must be proven, not tested, across agent edits | Ecosystem, I/O-heavy or text-heavy apps, production maturity |
| Lean 4, Dafny | Proven code must also run natively or in parallel, or checking latency in the loop dominates | Proofs need automation, tactics, or established libraries |
| CUDA, Triton | Recursive divide-and-conquer that would otherwise need custom kernels | ML kernels, tuned peak GPU performance |
| NumPy, JAX | A custom algorithm that must be verified | Vectorized science, autodiff, existing libraries |
| Z3, OR-Tools, SAT/SMT | Verifying a checker of a solver's output | Solving the supported problem class itself |

## If the answer is yes

Have the agent run `bend guide` before writing any Bend; the compiler documents the current language, and the README suggests adding to `AGENTS.md`: run `bend guide` to learn it, keep important rules in `LAWS.bend`, run `bend PROOF.bend` before committing. Upstream installs with `curl -fsSL https://bend-lang.com/install.sh | sh`; ask before running it.
