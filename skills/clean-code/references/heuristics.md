# Smell catalog

A language-neutral pass list generalized from Clean Code chapter 17 (codes in brackets map to the book), plus smells common in agent-written code. A smell is a prompt to look, not a verdict: confirm that the fix lowers the cost of a likely change before recommending it.

Contents: Structure and ownership · Functions · Names · Control flow and expressions · Errors and precision · Comments · Tests · Environment · Agent-written code · Not transferable

## Structure and ownership

- **Duplicated knowledge** [G5]: identical blocks, the same conditional chain in several places, or parallel algorithms differing in one step. Fix by consolidating into the owner or parameterizing the differing step. Coincidental similarity (different reasons to change) is not duplication.
- **Wrong level of abstraction** [G6]: high-level modules or base types holding details only some implementations need. An abstraction that forces implementers to fake an answer ("return 0 if unbounded") is misplaced.
- **General depending on specific** [G7]: a base type, core module, or shared library naming its concrete variants or consumers.
- **Wide interface** [G8]: a unit exposing many functions, fields, or exports that callers must orchestrate. Hide data, helpers, and constants that are not part of the contract.
- **Artificial coupling** [G13]: a general-purpose constant, type, or function declared inside a specific module, forcing unrelated code to import it.
- **Feature envy** [G14]: logic that mostly uses another unit's data. Move it, unless that would couple the owner to a foreign concern.
- **Misplaced responsibility** [G17]: code not where a reader would look; its name's vocabulary says which module it belongs to.
- **Hidden logical dependency** [G22]: a caller assumes a fact the callee owns (size, format, ordering). Make the callee expose it.
- **Buried configuration** [G35]: defaults decided deep in low-level code instead of at the top and passed down.
- **Transitive navigation** [G36]: callers walk an object graph (`a.b.c.do()`) through units that should hide their structure. Does not apply to plain data.
- **Hybrid** [ch. 6]: a type that exposes all its state and also carries business rules, making both new operations and new variants hard.
- **Low cohesion** [ch. 10]: fields used by only a subset of methods, or a module whose functions share nothing. There is another unit trying to get out.
- **Multiple reasons to change** [ch. 10, SRP]: one unit edited for unrelated kinds of change (for example, formatting and persistence).
- **Arbitrary structure** [G32]: nesting, grouping, or placement with no reason visible in the structure, which invites others to change it arbitrarily.
- **Inconsistency** [G11]: similar things done differently: two names for one concept, two error styles, two ways to build the same object.

## Functions

- **Too many arguments** [F1]; a clump of arguments that always travel together is a missing type.
- **Output arguments** [F2]: mutating a parameter as the way to return a result.
- **Flag or selector arguments** [F3, G15]: a boolean, enum, or string that selects behavior. Split into separate functions or describe the variant as data.
- **Dead function** [F4]: no callers. Delete (with closed-world evidence for exported surface).
- **Does more than one thing** [G30]: sections, or an extractable piece with a name that is not a restatement.
- **Descends more than one level** [G34]: mechanics mixed with intent in one body.
- **Hidden temporal coupling** [G31]: steps that must run in order but nothing enforces it. Pass each step's output to the next.
- **Name hides side effects** [N7]: `get` that creates, `check` that mutates, `validate` that sends.
- **Shallow unit** [Ousterhout]: a pass-through or wrapper whose interface is as complex as its body.

## Names

- **Not descriptive** [N1], or no longer accurate after the code changed.
- **Wrong abstraction level** [N2]: names committing to an implementation (`phoneNumber` where any locator works).
- **Non-standard** [N3]: ignoring pattern names, language conventions, or the project's domain vocabulary.
- **Ambiguous** [N4]: `doRename` beside `renamePage`; `data`, `info`, `manager`, `handle`, `process` with no qualifier.
- **Length out of proportion to scope** [N5]: `i` across 200 lines, or `indexOfCurrentItemInLoop` in a three-line loop.
- **Encodings** [N6]: type or scope prefixes, Hungarian notation, subsystem prefixes.
- **Unclear function name** [G20]: `date.add(5)` (five of what, and does it mutate?).

## Control flow and expressions

- **Obscured intent** [G16]: dense run-on expressions, abbreviations, unexplained literals.
- **Missing explanatory variables** [G19]: intermediate results that deserve names.
- **Unencapsulated conditionals** [G28]: compound boolean logic inline where a named predicate would state intent.
- **Negative conditionals** [G29]: `!shouldNotX`, double negatives, `else` branches holding the main path.
- **Magic values** [G25]: unexplained numbers and strings, including test fixtures. Obvious literals in self-explanatory formulas can stay.
- **Scattered boundary arithmetic** [G33]: `+1` and `-1` repeated; name the adjusted value once.
- **Repeated switch** [G23]: the same dispatch on the same discriminator in several places.
- **Deep nesting**: more than two levels usually hides guard clauses or an extractable step.
- **Convention where structure could enforce** [G27]: rules that rely on everyone remembering, where a type, exhaustive check, or required parameter would enforce them.

## Errors and precision

- **Imprecision** [G26]: assuming the first result is the only one, floats for currency, unchecked absence, ignoring concurrent updates, overly broad or narrow types.
- **Incorrect boundary behavior** [G3]: empty, single, maximum, negative, duplicate, and Unicode inputs unconsidered and untested.
- **Obvious behavior unimplemented** [G2]: a function that surprises a reader who trusts its name (a day parser that rejects "monday").
- **Overridden safeties** [G4]: disabled warnings, skipped tests, suppressed type errors, blanket `except` or `catch` blocks.
- **Swallowed errors** [ch. 7]: catch and ignore, or log and continue where continuing is wrong.
- **Error-code plumbing** [ch. 3, 7]: every caller checking and forwarding a status the language could propagate.
- **Null for "nothing"** [ch. 7]: returning null where an empty collection or a special-case object would remove caller checks.

## Comments

- **Inappropriate information** [C1]: history, authors, ticket numbers, change logs.
- **Obsolete** [C2] or **redundant** [C3]: wrong, or restating the code or signature.
- **Poorly written** [C4]: rambling, unclear, obvious.
- **Commented-out code** [C5]: delete it.
- **What-comments** [ch. 4]: explaining what code does where a name or extraction would.

## Tests

- **Insufficient** [T1]: conditions and calculations not exercised. Use coverage to find gaps [T2]; don't skip trivial tests [T3].
- **Ignored test** [T4]: represents an unresolved requirement question; make the question explicit.
- **Boundaries untested** [T5]; **area near a found bug not exhaustively tested** [T6].
- **Slow tests** [T9]: slow tests stop being run.
- **Dirty tests** [ch. 9]: tests harder to read than the code, several concepts per test, hidden shared setup, order dependence.

## Environment

- **Build requires more than one step** [E1]; **tests require more than one step** [E2].
- **Multiple languages in one file** [G1]: large embedded SQL, HTML, or shell strings mixed with logic. Minimize their number and extent, or move them to dedicated files.

## Agent-written code

- A new helper that duplicates an existing one under a different name.
- A boolean or `mode` parameter added to an existing function to handle a new caller.
- New logic pasted into the middle of an existing function at a different level of abstraction.
- One-caller wrappers and single-implementation interfaces, factories, or base classes "for flexibility".
- Defensive checks for states the types or invariants already exclude.
- Backward-compatibility shims, feature toggles, or fallback paths nobody asked for.
- Options that restate library defaults (unless deliberately pinning behavior across upgrades).
- `try` blocks that log and continue, or fallbacks that hide real failures.
- Comments narrating the change ("now we also handle X") rather than stating a lasting constraint.
- Debug output, unused imports, and parameters left from iteration.

## Not transferable

The book's Java section does not carry over: wildcard imports [J1] are wrong for Python and TypeScript; "don't inherit constants" [J2] and "enums over int constants" [J3] reduce to "use the language's enum or literal-union mechanism and import constants explicitly".
