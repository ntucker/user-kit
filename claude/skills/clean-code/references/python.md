# Python

Follow the project's Python version, type-checking setup, and linters first; features below note their minimum version where it matters.

The Zen of Python (PEP 20) is assumed. The aphorisms agents under-apply:

- **Explicit is better than implicit:** pass dependencies as parameters; no hidden global state, import-time side effects, or magic attribute lookups.
- **Errors should never pass silently, unless explicitly silenced:** silence visibly with `contextlib.suppress(SpecificError)` or a comment stating why.
- **In the face of ambiguity, refuse the temptation to guess:** reject ambiguous input at the boundary with a clear error instead of picking an interpretation.
- **One obvious way:** reuse the existing helper or idiom; do not add a second way.
- **If the implementation is hard to explain, it's a bad idea:** say the design in two sentences before writing it; if you cannot, simplify it.
- **Namespaces:** modules and packages are the unit of ownership; group by concept and use qualified names (`json.loads`) where they clarify.

## Units and structure

- A module of functions is the default unit. A class with `__init__` and one method is a function; a class of only static methods is a module; `Manager`/`Factory`/`Helper` classes without state are Java in Python.
- Records: `@dataclass` (with `frozen=True` and `slots=True` when appropriate), `NamedTuple`, or `TypedDict` for dict-shaped data at boundaries, not hand-written `__init__`/`__eq__`/`__repr__`.
- Plain attributes first; `@property` when a computed or validated value is needed later. No `get_x()`/`set_x()` pairs.
- `typing.Protocol` for structural interfaces; `abc.ABC` only for enforced abstract methods on a real hierarchy. No inheritance purely for code reuse.
- `enum.Enum` or `Literal[...]` instead of string or int constants that select behavior; `match` (3.10+) for dispatch on shape, one per discriminator.

## Functions and data

- Keyword-only arguments (after `*`) for booleans and options, so call sites read `send(msg, retry=False)`.
- Return new values rather than mutating inputs, unless the name says it mutates (`list.sort` vs. `sorted`).
- Generators for streams and pipelines instead of building intermediate lists.
- A comprehension for one transform with at most one filter; a loop when it has side effects, several branches, or steps that need names.
- `zip(..., strict=True)` (3.10+) when lengths must match.
- Reach for the standard library before writing helpers: `pathlib`, `itertools`, `functools` (`cache`, `partial`), `collections`, `contextlib`, `dataclasses`, `enum`.

## Errors, resources, types

- EAFP (try, then catch the specific exception) when a check would race or duplicate the operation; LBYL for cheap, non-racy checks.
- `except Exception` only at top-level boundaries that log and report; elsewhere catch what you can handle.
- `raise NewError(...) from err` when translating exceptions at a boundary.
- Context managers for every acquired resource; write one with `contextlib.contextmanager` rather than paired setup/teardown calls.
- Annotate public signatures; let locals infer. Handle the `None` in `X | None`.
- `Any` and `cast` only at validated boundaries; they turn off the checker exactly where it would help.
