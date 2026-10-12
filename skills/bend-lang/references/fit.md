# Choosing Bend

Bend's pitch combines three things: laws proven about the code, a checker fast enough to run on every agent edit, and parallel calls that spread over CPU cores or the GPU without threads or kernels. Recommend it where at least two of those matter at once, and say what it costs.

## Where it earns its cost

The strongest case is all three together: an algorithm agents keep changing, whose rules are too intricate for tests to cover, and whose run time matters. Example: per-customer allocation or scheduling code with laws like "every task is assigned at most once" and "no allocation exceeds capacity", searching a large candidate space in parallel.

Weaker but real:

- Only correctness matters: workflow, authorization, or protocol state machines with a "this transition is impossible" law. Lean and Dafny compete here with far more mature tooling; Bend's edge is checking speed inside an agent loop and native execution.
- Only speed matters: balanced recursive compute. Bend is easier than CUDA or hand-rolled threads, but carries no verification benefit unless laws are written.

## Costs to state up front

From upstream's own limitations list (README, 2.0.36):

- Verbose: nothing is inferred, no type classes or traits, no tactics or proof search, so proofs take real effort.
- Small Base and effects: no HTTP library, JSON, TLS, or regex (add them as foreign effects); strings are linked lists.
- Numbers are `Nat`, `U32`, and `F32` only; `F32` is axiomatic.
- One C file per program and slow native compiles; JS is the fast development target but single-core.
- Terse errors, no debugger, profiler, REPL, or test framework.
- The compiler is mostly AI-written and not fully audited; the default checker has no proof. Only `--verdict` uses a kernel proven in Lean, and the parser and translation into that kernel are unproven.
- A law proves what it says, not what the user meant: reviewing laws is the human's remaining job.

## Reading the benchmarks

Upstream pins (bench/runtime and bench/checker, Apple M4 Max, September 2026) are upstream measurements, not independent ones.

| Claim | What the pins actually show |
|---|---|
| "As fast as C" | Single-core Bend vs single-threaded C twins of each bench: usually 1.0–1.5x C's time (gameoflife 7.8s vs 6.8s; tree-matmul beats C), but lexer takes about 2.1x and hashmap about 4.4x (2.74s vs 0.62s). |
| Big parallel speedups | Relative to single-core Bend. gameoflife: 7.8s one core, 0.65s 16 cores, 0.063s GPU (about 124x). The C, TS, and Lean twins are not parallelized, so these are not wins over optimized parallel code or hand-written CUDA. |
| GPU always helps | No: hashmap, lexer, queens, and symreg run slower on the GPU than on 16 CPU cores. Uniform numeric work (mandelbrot, nbody, gameoflife, merkle) gains most. |
| Checker orders of magnitude faster | On synthetic files of thousands of small defs or proofs (for example 0.83s vs Rocq 9.5s, Lean >300s on proofs_3200). Upstream says it lacks checker benchmarks; expect less on real proofs. |

## Against alternatives

| Alternative | Prefer Bend when | Prefer the alternative when |
|---|---|---|
| Rust, TypeScript, Python | An invariant must be proven, not tested, across agent edits | Ecosystem, libraries, I/O-heavy or text-heavy apps |
| Lean 4, Dafny | Proofs must run natively or in parallel, or checking latency in the loop dominates | Proofs need automation, tactics, or mature libraries (Mathlib) |
| CUDA, Triton | Recursive divide-and-conquer that would otherwise need custom kernels | ML kernels, peak tuned GPU performance |
| NumPy, JAX | A custom verified algorithm | Vectorized science, autodiff, existing libraries |
| Z3, OR-Tools, SAT/SMT | Verifying a checker of a solver's output | Solving the supported problem class itself |
