# Python

Follow the project's Python version, type-checking setup, and linters first; features below note their minimum version where it matters.

## The Zen of Python as working rules

PEP 20 aphorisms, each with what it asks for in practice. Most generalize to any language.

| Aphorism | In practice |
|---|---|
| Beautiful is better than ugly. | Code whose shape mirrors the problem; formatting consistent enough to be invisible. |
| Explicit is better than implicit. | Pass dependencies as parameters; import names explicitly; no hidden global state, import-time side effects, or magic attribute lookups. |
| Simple is better than complex. Complex is better than complicated. | Choose the simplest structure that handles the real cases. When the problem is genuinely complex, organize the complexity; don't tangle it. |
| Flat is better than nested. | Guard clauses and early returns; shallow package hierarchies; avoid comprehensions nested more than one level. |
| Sparse is better than dense. | One idea per line; name intermediates rather than chaining clever one-liners. |
| Readability counts. | Optimize for the reader, including the reader who is you in six months. |
| Special cases aren't special enough to break the rules. Although practicality beats purity. | Keep conventions uniform; break one only for a concrete, stated benefit. |
| Errors should never pass silently. Unless explicitly silenced. | Catch specific exceptions; when you do suppress one, make it visible (`contextlib.suppress(SpecificError)`, a comment stating why). |
| In the face of ambiguity, refuse the temptation to guess. | Reject ambiguous input at the boundary with a clear error instead of picking an interpretation. |
| There should be one-- and preferably only one --obvious way to do it. | Reuse the existing helper or idiom; don't add a second way. |
| Now is better than never. Although never is often better than *right* now. | Ship the needed thing; don't build speculative options or abstractions. |
| If the implementation is hard to explain, it's a bad idea. If it is easy to explain, it may be a good idea. | Say the design in two sentences before writing it; if you can't, simplify it. |
| Namespaces are one honking great idea -- let's do more of those! | Modules and packages are the unit of ownership; group by concept and use qualified names (`json.loads`) where they clarify. |

## Idioms agents get wrong

**Units and structure**
- A module of functions is the default unit. Use a class when there is state with invariants to protect or real polymorphism. A class with `__init__` and one method is a function; a class of only static methods is a module.
- Records: `@dataclass` (with `frozen=True` and `slots=True` when appropriate), `NamedTuple`, or `TypedDict` for dict-shaped data at boundaries. Not hand-written `__init__`/`__eq__`/`__repr__`.
- Plain attributes first; add `@property` when a computed or validated value is needed later. No `get_x()`/`set_x()` pairs.
- `typing.Protocol` for structural interfaces; `abc.ABC` only when you need enforced abstract methods on a real hierarchy.
- `enum.Enum` or `Literal[...]` instead of string or int constants that select behavior.
- `match` (3.10+) for dispatch on shape or type; one match per discriminator, not copies across modules.

**Functions and arguments**
- Keyword-only arguments (after `*`) for booleans and options, so call sites read `send(msg, retry=False)`.
- Never a mutable default argument; use `None` and create inside, or `dataclasses.field(default_factory=...)`.
- Return new values rather than mutating inputs, unless the function's name says it mutates (like `list.sort` vs. `sorted`).
- Generators (`yield`) for streams and pipelines instead of building intermediate lists.

**Iteration and data**
- Iterate directly; use `enumerate`, `zip` (`strict=True` on 3.10+ when lengths must match), `dict.items()`. No `range(len(x))` indexing.
- A comprehension when it is one transform with at most one filter; a loop when it has side effects, several branches, or needs a name for its steps.
- Reach for the standard library before writing helpers: `pathlib`, `itertools`, `functools` (`cache`, `partial`), `collections` (`defaultdict`, `Counter`, `deque`), `contextlib`, `dataclasses`, `enum`.
- Truthiness (`if items:`) for collections; `is None` when `0`, `""`, or `False` are valid values.

**Errors and resources**
- EAFP (try, then catch the specific exception) when the check would race or duplicate the operation, such as file access or dict lookups. LBYL is fine for cheap, non-racy checks.
- Never bare `except:`. `except Exception` belongs only at top-level boundaries that log and report; everywhere else catch what you can handle.
- `raise NewError(...) from err` to keep the cause when translating exceptions at a boundary.
- Context managers (`with`) for every acquired resource: files, locks, connections, temporary state. Write one with `contextlib.contextmanager` rather than paired setup/teardown calls.

**Types**
- Annotate public function signatures; let locals infer. Use `X | None` (3.10+) or `Optional[X]` and handle the `None`.
- Avoid `Any` and `cast` except at validated boundaries; they turn off the checker exactly where it would help.

**Writing Java in Python** (smells): `Manager`/`Factory`/`Helper` classes without state, interfaces with one implementation, getters and setters, deep inheritance for code reuse, `from x import *`.
