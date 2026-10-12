---
name: bend-lang
description: Writes, proves, and runs Bend 2 programs (bend-lang.com), the affine, dependently typed language where LAWS.bend states rules, PROOF.bend proves the code obeys them, and parallel calls spread over CPU cores or the GPU. Also judges whether a task should be written in Bend at all. Use when editing .bend files, LAWS.bend, or PROOF.bend, when the user mentions Bend, bend-lang, BendTT, or law-driven development, or asks whether Bend fits an algorithm, a proof-enforced invariant on agent-written code, or GPU parallelism without CUDA. Not for Bend 1 or HVM2 programs, and not for picking a proof assistant when Bend was never raised.
metadata:
  sources: github.com/bendlang/bend README, guide/GUIDE.md, WONTFIX.txt, bench pins, and runs of bend 2.0.36 (2026-10)
---

# Bend 2

Bend 2 postdates most training data, and most Bend code online is Bend 1, a different language (Python-like `bend`/`fold`/`when` syntax on the HVM2 runtime). Never write Bend 1 forms. The installed compiler documents itself; learn the language from it, not from memory:

| Need | Run |
|---|---|
| Version (must be 2.x) | `bend version` |
| Language guide | `bend guide`, before writing any Bend |
| Parallel or graphical code | `bend guide shaders`, before writing it |
| Custom C/JS effects | `bend guide effects` |
| Base library names | `bend base Map` for one name and everything under it; `bend base --types` for types only |

If `bend` is missing, give the user the upstream install line, `curl -fsSL https://bend-lang.com/install.sh | sh`, and ask before running it. Upstream supports Linux and macOS (WSL on Windows). A checkout's `bun bend2/main.ts` reads that directory's `bunfig.toml` and `.env`, so check untrusted code with the installed `bend` instead.

## Does the task fit Bend?

Read [Choosing Bend](references/fit.md) when the user is deciding whether to use Bend, comparing it with Lean, Dafny, Rust, CUDA, or a solver, or quoting performance claims. In short:

| Task | Verdict |
|---|---|
| Pure algorithm with a precise rule that must survive agent edits (sorting, scheduling, allocation, state machines, interpreters) | Strong fit: put the rule in `LAWS.bend` |
| Divide-and-conquer compute that splits into balanced halves (trees, fractals, uniform numeric grids, exhaustive search) | Fit: parallel calls, GPU for uniform numeric work |
| Divergent search (n-queens, lexing, hashing) | CPU-parallel Bend; upstream's own benches run these slower on the GPU |
| Text-heavy, 64-bit integers or doubles, floating-point properties, HTTP/JSON/TLS, large ecosystem needs | Poor fit: strings are linked lists, numbers are `Nat`/`U32`/`F32` only, nothing about `F32` is provable, and Base has no HTTP, JSON, TLS, or regex |
| A problem a mature solver already covers (SAT, SMT, ILP) | Use the solver; Bend can verify a checker of its answers |

## Law-driven workflow

`LAWS.bend` imports the code and states each law; it is the human's spec. `PROOF.bend` imports `LAWS.bend` and proves `law x` with `def Laws.x(...)`; the agent writes it along with the code.

- [ ] Run `bend guide` if this session has not.
- [ ] Laws missing or new behavior unspecified: draft them in `LAWS.bend` and show them to the user before proving anything. A law that says the wrong thing is proven just as happily as a right one.
- [ ] Edit the code, then run `bend PROOF.bend`. Exit 0 with ALL PROOFS CHECK is the gate; exit 1 with SOME PROOFS FAIL means not done.
- [ ] On failure, read the `expected` / `observed` terms and the location; put `?name` where a step fails to print the goal, fix code or proof, rerun.
- [ ] Before calling the work verified, run `bend PROOF.bend --verdict`, which rechecks with the kernel proven in Lean. It needs Lean v4.34.0 (or `$BENDTT` pointing at a built kernel); if that is unavailable, say the checker passed and `--verdict` was not run.

Do not edit an existing law, delete one, or weaken it (an added `where` precondition, a narrower `for` type) to make proofs pass: that changes the spec. Stop and tell the user which law fails and why the code cannot meet it.

## Writing proofs

There are no tactics or proof search: a law is a type and its proof is a `def` of that type.

- `{==}` closes a goal whose sides compute to the same term; a `match` refines the goal per case; a recursive call is the induction hypothesis.
- `%e : P` rewrites with `e : {a == b : T}`, where `P` is the goal with `_` marking `b`. Write intermediate goals out in full, as upstream's `demos/proof_insertion_sort` and `demos/pure_par_sum` do.
- Make the program's decisions return evidence: a comparison that answers `Or(LE(x, h), LE(h, x))` instead of `Bool` lets the proof branch on the fact the program used.
- A proof cannot match on a computed value either. Split a lemma into a `.fin` helper that takes the computed verdict as a parameter and matches it, passing the recursive result in as `rec`.
- Keep large constants and depths abstract in laws; the checker unrolls concrete arithmetic and can go exponential.
- Helper lemmas such as `add_zero` and `add_assoc` live in `PROOF.bend`; `Equal.sym`, `Equal.trans`, and `Equal.cong` are in Base.

## Gotchas

Each of these was observed on bend 2.0.36 or is stated by upstream.

- `bend main.bend` runs happily while a law is broken: running `main` checks types, not laws. Only `bend PROOF.bend` proves them.
- `@unsafe`, `def f?(..)`, and foreign `import "./x.c"` bodies make any def relying on them fail the gate ("relies on unsafe or foreign code"). Never reach for them to get past the termination check in code a law covers.
- Values are affine: a variable used twice fails with "consumed more than once". Mark it `+x`, which works only for `Data` types; closures, arrays, and IO handles are `Type` and can never be copied. A closure can be called once.
- Operators need the type and spaces: `(a + b : U32)`, not `a + b`. Value equality is a call, `U32.is_eq(a, b)`; `==` only forms the equality type.
- No `if`: match on `True{}` / `False{}`. `match f(x):` is rejected; pass the value to a helper def that matches its parameter.
- Termination reads recursive-call arguments left to right: each must pass unchanged until one shrinks. Put the shrinking parameter first; mutual recursion is not allowed (merge into one def with a selector argument).
- A parallel let, `a b = f(x) g(y)`, promises the calls take about the same time; the scheduler never rebalances, so an unbalanced split loses the speedup. `f!(x)` sends work to the GPU only at the root of an IO step, a machine without a GPU runs it on the CPU, and the JS target runs everything on one core.
- A `main` returning a value is normalized by the checker, which is slow for real work. For speed, return `IO`, build with `bend file.bend -o file` (clang only), and run `./file --threads N` or `./file --gpu off`.
- Laws hold for Bend's semantics, not necessarily each backend (`F32` NaN can differ), and `--verdict` trusts the parser and its translation. To confirm what the kernel was handed, write `bend PROOF.bend -o PROOF.bendtt` and read the law's entry, not the whole dense file.
- `--publish` uploads permanently and publicly to BendHub. Never run it unless the user asks.
