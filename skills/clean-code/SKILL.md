---
name: clean-code
description: Writes, simplifies, refactors, and reviews code so its next change is cheap and safe - reusing or extending existing abstractions instead of writing new ones, splitting code into units at one level of abstraction instead of growing existing functions, placing every concept with its owner, and stripping the cruft agent-written code accumulates. Applies Clean Code and the Zen of Python, corrected for modern Python and TypeScript. Use when writing or modifying non-trivial code, refactoring, simplifying, cleaning up, deduplicating, or reviewing code for readability, maintainability, complexity, or code smells, even if the user never says "clean code". Not for formatter or linter configuration.
metadata:
  sources: Clean Code (Martin, 2008) incl. ch. 17 Smells and Heuristics; PEP 20 The Zen of Python; Beck's rules of simple design; A Philosophy of Software Design (Ousterhout); Metz, The Wrong Abstraction
---

# Clean code

Clean code is code whose next change is cheap and safe: a reader finds where a concept lives, understands it without surprise, and changes it in one place. When a rule here works against that goal in a specific case, the goal wins.

The standard advice (descriptive names, guard clauses, why-comments, narrow interfaces) is assumed. This skill targets where agents predictably go wrong: writing new code instead of reusing, growing functions instead of splitting them, placing code where it was handy, abstracting too much or too little, and stopping once it works.

| Task | Follow |
|---|---|
| Writing or modifying code (default) | "Writing" |
| Simplifying, cleaning up, refactoring | "Refactoring" |
| Reviewing or evaluating code | "Reviewing" |

**Scope** is the code the task touches. Leave it cleaner than you found it, but do not restructure unrelated code: a behavior change and a broad restructuring in one diff hide each other. Report larger problems outside scope instead of fixing them.

**The codebase's conventions outrank this skill** unless a convention causes the defects it targets; then raise it rather than half-migrate, because two conventions are worse than one imperfect one.

**When principles conflict**, a lower one yields to a higher (Beck's rules of simple design): works, verifiably > no duplicated knowledge > reveals intent > fewest elements. Fewest elements keeps the middle two from turning into ceremony; revealing intent keeps fewest elements from turning into a god function.

## Writing

### Before writing a new unit

1. **Name the concept and its owner.** A concept is any piece of knowledge: a rule, limit, format, default, data shape, invariant, error policy, or lifecycle (who creates, disposes, may mutate). Its owner is the unit that would change if the concept changed.
2. **Search for an existing owner** before creating any function, type, constant, or module: grep the verbs and nouns, read sibling modules, check the standard library and installed dependencies. Then apply the table below.
3. **Place new code with its owner**, where a reader would look first. A `utils` grab-bag is code with no owner.
4. **When adding to an existing function**, check afterward that its name still describes everything it does and its statements still sit at one level. If not, the addition is its own unit, here or in the owner one level down. A new parameter must be a new dimension of the same concept, not a mode switch.

Smallest diff is not the target; the simplest resulting code within scope is. Growing a function because it is the nearest place to type is how god functions form.

| What the search finds | Do |
|---|---|
| A unit whose concept matches, even if you would have written it differently | Use it |
| A match needing a generalization its concept already implies (a hardcoded value that is really a parameter of the same idea, a result it already computes) | Generalize it in place, keep its name truthful, update callers |
| Similar code that would need a mode flag, a caller-specific branch, or a second reason to change to fit | Leave it; write a separate unit, sharing only a sub-step that is itself a nameable concept |
| The same knowledge re-implemented in several places | Consolidate into its owner and replace the copies within scope |
| Nothing | Write a new unit, placed with its owner, named for the concept |

Duplicated knowledge is always a defect; similar-looking code is not always duplicated knowledge. Code that changes for different reasons stays apart even if it matches today, because duplication is far cheaper than the wrong abstraction. When two copies clearly encode one rule, consolidate now; when you cannot yet tell, wait for a third occurrence to show the shape.

### After it works

Making code work and making it clean are separate passes, and agents tend to stop after the first. Reread everything you touched as a stranger would:

- **Names still true.** Rename what the change made inaccurate, including names that now hide side effects (`getOrCreate`, not `get`).
- **One level per function**, and no duplicate of something that exists: search again with the final names.
- **Remove what you added but do not need:**
  - debug output, unused parameters and imports left from iteration
  - speculative options, and options restating library defaults (unless deliberately pinning behavior across upgrades)
  - defensive checks for states the types or invariants exclude; validate at system boundaries, then trust internal invariants
  - backward-compatibility shims, feature toggles, and fallback paths nobody asked for
  - one-caller wrappers and single-implementation interfaces, factories, or base classes "for flexibility"
  - comments narrating the change ("now also handles X") or restating the code; keep only the why and constraints the code cannot show
- **No silent failure.** A `try` that logs and continues, or falls back to defaults, is right only when continuing is correct and the owner of that policy decided it. Otherwise catch narrowly, at the level that can act, and re-raise with what was attempted and on what input.
- **Know why it works**, not just that the tests pass.

## Principles behind the steps

### Every concept has one owner

Separation of concerns follows from ownership, not from file size or layer diagrams. Signs a concept is in the wrong place:

- **Feature envy:** a function mostly uses another unit's data. Move it there, unless that teaches the owner a concern it should not know (a report's layout does not belong in the data it reports on).
- **Hidden assumption:** a caller relies on a callee's limit, ordering, or format without asking. Make the owner expose it.
- **Same decision in two places**, or one conceptual change needing edits across many files.
- **Convenience placement:** a constant or helper put where it was handy, forcing unrelated modules to import each other.
- **Policy buried in mechanism:** defaults decided deep in low-level code. Decide policy high, pass it down.
- **Many writers:** state mutated from several places. One owner mutates; others request.

Wrap a third-party API at your boundary when its types and quirks would otherwise spread through the codebase, not by reflex around every call.

### One level of abstraction per unit

A function body reads as the steps one level below its name: "To X, we A, then B, then C." Mixing intent with mechanics (string assembly, index math, protocol or storage details) is the main source of unreadable functions, and once details mix in, more accrete. Sections in a function (setup, parse, compute, format) mean it does several things. Extract a group of statements when it is a lower-level concept whose name says more than its code.

### Deep units, not shallow ones

The opposite failure. A unit earns its place when its interface is much simpler than what it hides, when it names a domain concept, or when it is the single owner of a decision. It is a net cost when it is a pass-through, a helper whose name restates its body, an interface or factory with one implementation and no second in sight, a class with one method and no state, or a split that makes the reader hop files to follow one idea. Line count is never the measure; coherence and abstraction level are.

## Refactoring

Behavior-preserving small steps, verifying after each. The order matters because each stage makes the next cheaper and safer.

1. **Pin behavior.** Identify how you will verify: existing tests, the type checker, or characterization tests you add for the code in scope. Without verification, limit yourself to mechanical, tool-assisted changes.
2. **Delete.** Dead code, unreachable branches, unused parameters and exports (confirm every caller; flag public surface as "possibly unused" instead), commented-out code, and the "After it works" removal list. Deleting first avoids polishing or unifying code that should not exist.
3. **Consolidate onto existing abstractions.** Replace re-implementations with the owner's version; unify true duplicates. Argue equivalence before merging: same results and effects for the same inputs, including edge cases and errors. If the similarity is coincidental, leave the copies apart.
4. **Relocate.** Move each concept to its owner. Do this before splitting so new units are born in the right home.
5. **Reshape units.** Split what mixes levels or changes for several reasons; inline shallow units; replace mode flags with separate functions; flatten nesting; group parameter clumps into types.
6. **Clarify.** Rename to the final responsibilities, name complex conditions, order callers above callees, cut comments to the why.
7. **Verify and reread the diff.** Checks pass, each change reads as one intention, no behavior change slipped in. Then review the result as below.

Stop when the next step's benefit is taste rather than a cheaper likely change. Keep the system working after every step; big-bang rewrites rarely recover the old behavior.

## Reviewing

Judge by the cost and risk of the next change, not by how many rules are broken. For each finding give the location, the problem in plain words, why it makes change costly or risky, a concrete fix, and a severity:

- **must-fix:** will cause bugs or mislead (silenced errors, duplicated knowledge that will drift, names that lie, an owner mismatch forcing multi-place edits)
- **should-fix:** materially slows understanding or change (mixed levels, a god function, mode flags, a shallow-abstraction pile)
- **consider:** marginal or taste

State what is already good in a line. Skip what formatters and linters enforce. Do not propose a merge without an equivalence argument, or a new abstraction for a single use. For a diff, check it against "Before writing a new unit" and the "After it works" list first; for a module or large diff, also read [Smell catalog](references/heuristics.md) for a systematic pass.

## Gotchas: Clean Code taken literally

The book was written for 2008 Java. Its values transfer; these specifics mislead when applied as written.

- **Function size targets** ("2-4 lines, rarely 20") produce shallow fragments. Use one level of abstraction and a nameable concept as the test, never a line count.
- **Zero-argument functions** achieved by promoting locals to instance fields hide data flow in shared state. Prefer explicit parameters, a parameter object, or keyword options.
- **Polymorphism over switch:** an exhaustive `switch` or `match` over a discriminated union is idiomatic and type-checked in TypeScript and Python. The smell is the same switch repeated across modules.
- **Classes by default:** module-level functions are the default unit in Python and TypeScript; a class is for state with invariants or real polymorphism.
- **"Comments are failures"** overreaches: why-comments, constraints, and public API docs are worth writing; follow the repo's docstring conventions.
- **"Never return null":** checked optional types (`T | undefined`, `X | None`) make absence explicit and fine. The smell is unchecked absence, or null where an empty collection would do.
- **Exceptions vs. return codes:** follow the language and codebase (Python favors exceptions; TypeScript often returns typed results for expected outcomes and throws for exceptional ones). Never swallow either.
- **Law of Demeter** applies to objects hiding behavior; applied to plain data it spawns forwarding methods.

## References

- Read [Python](references/python.md) when writing or reviewing Python.
- Read [TypeScript](references/typescript.md) when writing or reviewing TypeScript or JavaScript.
- Read [Worked examples](references/examples.md) when a judgment call is unclear: reuse vs. new, extend vs. separate, extract vs. inline, where a concept belongs, splitting flags, surfacing ordering, handling errors.
