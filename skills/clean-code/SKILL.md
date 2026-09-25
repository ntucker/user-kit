---
name: clean-code
description: Principles and a staged workflow for writing, simplifying, refactoring, and evaluating code cleanliness in any language, with Python and TypeScript specifics. Distills Clean Code, the Zen of Python, and idiomatic practice into judgment calls agents get wrong - reusing or extending existing abstractions instead of writing new ones, splitting code into units at one level of abstraction instead of growing existing functions, and placing every concept with its owner. Use when writing or modifying non-trivial code, refactoring, simplifying, cleaning up, deduplicating, or reviewing code for readability, maintainability, complexity, or code smells, even if the user never says "clean code". Not for formatter or linter configuration.
metadata:
  sources: Clean Code (Martin, 2008) incl. ch. 17 Smells and Heuristics; PEP 20 The Zen of Python; Beck's rules of simple design; A Philosophy of Software Design (Ousterhout); Metz, The Wrong Abstraction
---

# Clean code

Clean code is code whose next change is cheap and safe: a reader finds where a concept lives, understands it without surprise, and changes it in one place. Every principle here serves that goal. When a principle works against it in a specific case, the goal wins. Practicality beats purity.

| Task | Follow |
|---|---|
| Writing or modifying code | "Before writing a new unit", write, then "After it works" |
| Simplifying, cleaning up, refactoring | "Refactor stages" |
| Reviewing or evaluating code | "Evaluating" |

Scope is the code the task touches. Leave it cleaner than you found it, but do not restructure unrelated code: a behavior change and a broad restructuring in one diff hide each other. Report larger problems outside scope instead of fixing them.

## Values, in priority order

Beck's rules of simple design; a lower rule yields to a higher one.

1. **Works, and you can show it.** Tests, types, or a reproducible check. Refactoring without verification is guessing.
2. **No duplicated knowledge.** Each rule, fact, decision, and shape has one home.
3. **Reveals intent.** Names and structure say what and why. "If the implementation is hard to explain, it's a bad idea."
4. **Fewest elements.** The fewest functions, types, modules, parameters, and layers that satisfy 1-3.

Rule 4 is what keeps 2 and 3 from turning into ceremony; rule 3 is what keeps 4 from turning into a god function.

## Principles

### Every concept has one owner

Separation of concerns follows from ownership, not from file size or layer diagrams. A concept is any piece of knowledge: a business rule, limit, format, default, data shape, invariant, error policy, or lifecycle (who creates, who disposes, who may mutate). Its owner is the unit that would change if the concept changed. Put the concept there; everything else asks the owner.

Signs a concept is in the wrong place:

- **Feature envy.** A function mostly reads or manipulates another unit's data. Move it to that unit, unless moving it would teach the owner about a concern it should not know (a report's layout does not belong in the data it reports on).
- **Hidden assumption.** A caller relies on a callee's limit, ordering, or format without asking. Make the owner expose it.
- **Same decision in two places**, or one conceptual change that needs edits across many files.
- **Convenience placement.** A constant or helper put where it was handy rather than where it belongs, forcing unrelated modules to import each other. A `utils` grab-bag is code with no owner.
- **Policy buried in mechanism.** Defaults and configuration decided deep in low-level code. Decide policy high, pass it down.
- **Many writers.** State mutated from several places. One owner mutates; others request.

Code lives where a reader would look first. High-level policy should not depend on low-level detail. Wrap a third-party API at your boundary when its types and quirks would otherwise spread through the codebase, not by reflex around every call.

### One level of abstraction per unit

A function body should read as the steps one level below its name: "To X, we A, then B, then C." Mixing intent with mechanics (string assembly, index math, protocol or storage details) is the main source of unreadable functions, and once details mix in, more accrete.

- Extract a group of statements when it is a lower-level concept whose name says more than its code. A name that merely restates the body is not an abstraction.
- A function with sections (setup, parse, compute, format) does several things.
- Order callers above callees so a module reads top-down.

### Extract deep units, not shallow ones

The opposite failure. A unit earns its place when its interface is much simpler than what it hides, when it names a domain concept, or when it is the single owner of a decision. It is a net cost when it is a pass-through, a one-line rename of another call, a helper whose name restates its body, an interface or factory with one implementation and no second in sight, a class with one method and no state, or a split that makes the reader hop across files to follow one idea. Line count is not the measure; coherence and abstraction level are.

### Reuse before writing; generalize only along the concept

Before creating a function, type, constant, or module, search for one that already owns the concept: grep the verbs and nouns, read sibling modules, check the standard library and installed dependencies. Then:

| What you find | Do |
|---|---|
| A unit whose concept matches, even if you would have written it differently | Use it |
| A match that needs a generalization its concept already implies (a hardcoded value that is really a parameter of the same idea, a result it already computes) | Generalize it in place, keep its name truthful, update callers |
| Similar code, but fitting it would need a mode flag, a caller-specific branch, or would give it a second reason to change | Leave it; write a separate unit, sharing only a sub-step that is itself a nameable concept |
| The same knowledge re-implemented in several places | Consolidate into its owner and replace the copies within your scope |
| Nothing | Write a new unit, placed with its owner, named for the concept |

Duplicated knowledge is always a defect; similar-looking code is not always duplicated knowledge. Two pieces that change for different reasons should stay apart even if they match today, because duplication is far cheaper than the wrong abstraction. When two copies clearly encode the same rule, consolidate now. When you cannot yet tell whether they are one concept, wait for a third occurrence to show the shape before inventing a shared abstraction.

### Functions

- Do one thing, and let the name say everything it does, side effects included (`getOrCreate`, not `get`).
- Few parameters. A long list usually hides a concept (group it into a type) or a function doing too much. A boolean or mode argument that selects behavior means two functions. Named or keyword options for genuine settings are fine.
- Either change state or answer a question, not both.
- Return values instead of mutating arguments. When steps must run in order, pass each step's output into the next so the order cannot be broken.
- Keep computation pure where practical and push I/O and side effects to the edges.

### Names

Names carry most of a program's readability. Make them intention-revealing, pronounceable, and searchable, with length proportional to scope. Use one word per concept across the codebase, the domain's vocabulary, no type or scope encodings, and words at the unit's level of abstraction (`connect`, not `dial`, if not every connection dials). Rename when meaning drifts. Difficulty naming something means the concept is not yet understood or the unit does too much.

### Data and objects

Choose deliberately. Plain data (records, interfaces, dataclasses) plus functions makes new operations easy; objects that hide state behind behavior make new variants easy. Pick by which axis will change. Avoid hybrids that expose all their state and also carry business logic. "Don't reach through `a.b().c().do()`" applies to objects hiding behavior, not to navigating plain data. Where the type system allows, make illegal states unrepresentable instead of validating them repeatedly.

### Control flow

Flat is better than nested: guard clauses and early returns. Name complex conditions as predicates or explanatory variables, and state them positively. Name magic values unless the literal reads more clearly in place. Keep boundary arithmetic (`+1`, `-1`, off-by-one adjustments) in one spot. The same switch on the same discriminator repeated across modules should become one dispatch point; a single exhaustive switch is fine. Complex is better than complicated: essential complexity is allowed, accidental complexity is not.

### Errors

- Errors never pass silently unless explicitly silenced, with the reason. Catching to log and continue is only right when continuing is correct.
- Handle an error at the level that can act on it; elsewhere let it propagate. Keep try blocks narrow, around the operation that can fail, so the handling is not tangled with the work.
- Raise with context: what was attempted, with what input. Define error types by what callers need to tell apart.
- Validate at system boundaries (user input, network, files, external services), then trust internal invariants instead of re-checking everywhere.
- Prefer designs where the error cannot occur: empty collections instead of null, idempotent operations, types that exclude the bad case.
- Be precise. Make absence explicit in the type and handle it. Do not assume the first match is the only match; do not use floats for money; account for concurrent updates when they can happen. In the face of ambiguity, refuse the temptation to guess.

### Comments

Code says what and how; a comment says why, or states a constraint the code cannot show (a workaround's reason, a non-obvious invariant, a warning of consequences, a public contract). Delete redundant, obsolete, and journal comments, bylines, position markers, and commented-out code; version control remembers. A comment that explains what the code does is a request for a better name or an extraction.

### Tests

Tests make cleaning safe, and they are code held to the same standard, readability first. Test one concept per test; keep tests fast, independent, repeatable, and self-checking. Test boundary conditions, and test exhaustively near a bug, because bugs cluster.

### Consistency

Do similar things the same way; there should be one obvious way. The codebase's established conventions outrank this skill's preferences unless a convention causes the defects this skill targets. In that case raise it rather than half-migrate, because two conventions are worse than one imperfect one.

## Before writing a new unit

1. Name the concept and its owner.
2. Search for an existing owner and apply the reuse table.
3. Place the new code with its owner.
4. When adding to an existing function, check afterward that its name still describes everything it does and its statements still sit at one level. If not, the addition is its own unit, here or in the owner one level down. When adding a parameter, check that it is a new dimension of the same concept, not a mode switch.

Smallest diff is not the target; the simplest resulting code within the task's scope is. Growing an existing function because it is the nearest place to type is how god functions form.

## After it works

Making code work and making it clean are separate activities, and it is tempting to stop after the first. Before calling the task done, reread what you touched as a stranger would:

- Are names, levels, and owners right?
- Remove what you added but do not need: debug output, unused parameters and imports, speculative options, defensive branches for impossible states, compatibility shims nobody asked for, and comments that narrate the code.
- Search again with the final names to confirm you did not duplicate something that exists.
- Make sure you know why it works, not just that the tests pass.

## Refactor stages

Behavior-preserving small steps, verifying after each. The order matters because each stage makes the next cheaper and safer.

1. **Pin behavior.** Identify how you will verify: existing tests, the type checker, or characterization tests you add for the code in scope. Without verification, limit yourself to mechanical, tool-assisted changes.
2. **Delete.** Dead code, unreachable branches, unused parameters and exports (confirm every caller; flag public surface as "possibly unused" instead), commented-out code, redundant comments, options restating library defaults, speculative generality. Deleting first avoids polishing or unifying code that should not exist.
3. **Consolidate onto existing abstractions.** Replace re-implementations with the owner's version; unify true duplicates. Argue equivalence before merging: same results and effects for the same inputs, including edge cases and errors. If the similarity is coincidental, leave the copies apart.
4. **Relocate.** Move each concept to its owner: envious functions, misplaced constants and defaults, hidden assumptions, knowledge leaking across layers. Do this before splitting so new units are born in the right home.
5. **Reshape units.** Split what mixes levels or changes for several reasons; inline shallow wrappers, pass-throughs, and single-use indirection; replace mode flags with separate functions; flatten nesting; group parameter clumps into types.
6. **Clarify.** Rename to the final responsibilities, add explanatory variables and named predicates, order top-down, and cut comments to the why.
7. **Verify and reread the diff.** Checks pass, each change reads as one intention, and no behavior change slipped in. Then evaluate the result as below.

Stop when the next step's benefit is taste rather than a cheaper likely change. Restructure incrementally, keeping the system working after every step; big-bang rewrites rarely recover the old behavior.

## Evaluating

Judge by the cost and risk of the next change, not by how many rules are broken. For each finding give the location, the problem in plain words, why it makes change costly or risky, a concrete fix, and a severity:

- **must-fix**: will cause bugs or mislead (silenced errors, duplicated knowledge that will drift, names that lie, an owner mismatch that forces multi-place edits)
- **should-fix**: materially slows understanding or change (mixed levels, a god function, mode flags, a hybrid object)
- **consider**: marginal or taste

State what is already good in a line. Skip what formatters and linters enforce. Do not propose a merge without an equivalence argument, or a new abstraction for a single use. Read [Smell catalog](references/heuristics.md) for a systematic pass over a module or a large diff.

## Gotchas

Clean Code was written for 2008 Java. Its values transfer; several specifics do not, and literal application drives agents astray.

- **Size targets.** "Functions of 2-4 lines, rarely 20" produces shallow fragments when taken literally; the book's own rules of simple design also call for keeping the count of functions and classes low. Use one level of abstraction and a nameable concept as the test, never a line count.
- **Zero-argument functions.** Chasing low arity by promoting locals to instance fields hides data flow in shared state; the book notes this destroys cohesion. Prefer explicit parameters, a parameter object, or keyword options.
- **Polymorphism over switch.** In TypeScript and Python, an exhaustive switch or `match` over a discriminated union is idiomatic and type-checked. The smell is the same switch repeated across modules, not a switch as such.
- **Classes and non-static methods by default.** A Java habit. Module-level functions are the default unit in Python and TypeScript; reach for a class when state plus invariants need protecting or real polymorphism is needed.
- **Wildcard imports** (J1 in the book). Wrong for Python and TypeScript; import names explicitly.
- **"Comments are failures."** Overreach. Why-comments, constraints, and public API docs are worth writing; follow the repo's docstring conventions.
- **"Never return null."** With checked optional types (`T | undefined`, `X | None`), returning absence is explicit and fine. The smell is unchecked absence, or null where an empty collection would do.
- **Exceptions vs. return codes.** Follow the language and codebase: Python favors exceptions (EAFP); TypeScript codebases often return typed results for expected outcomes and throw for exceptional ones. Never swallow either.
- **Law of Demeter everywhere.** Applying it to plain data spawns forwarding methods; it is for objects that hide behavior.
- **Getters and setters.** Use plain attributes or properties in Python and plain readonly data in TypeScript, not bean-style accessors.
- **Boy Scout rule without bounds.** "Leave it cleaner" means the code in the task's path, not a drive-by rewrite of the module.

## Language references

- Read [Python](references/python.md) when writing or reviewing Python; it maps the Zen of Python to concrete idioms.
- Read [TypeScript](references/typescript.md) when writing or reviewing TypeScript or JavaScript.
- Read [Worked examples](references/examples.md) when a judgment call is unclear: reuse vs. new, extend vs. separate, extract vs. inline, where a concept belongs, splitting flags, surfacing ordering, handling errors.
