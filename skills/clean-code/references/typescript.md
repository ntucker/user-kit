# TypeScript

Follow the project's `tsconfig` strictness, lint rules, and module conventions first. Most of this applies to JavaScript too, minus the types.

## Types as structure

The type checker is the cheapest verifier in the loop, so encode decisions in types rather than conventions or comments.

- **Discriminated unions for state.** `{ status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: T }` instead of optional fields plus booleans that can contradict each other. Illegal combinations then cannot be constructed.
- **Exhaustive handling.** Switch on the discriminant and end with a `never` check (`const unreachable: never = x`, or `x satisfies never`) so adding a variant fails to compile at every site that must handle it.
- **One source for each shape.** Derive rather than restate: `typeof`, `keyof`, `as const` arrays and objects, indexed access types, `ReturnType`/`Parameters`, `Pick`/`Omit`, or a schema's inferred type (such as `z.infer`). A shape written out twice will drift.
- **`unknown` at boundaries, then narrow.** Parse external data (network, storage, user input) once with a validator or type guard; interior code then works with trusted types. Avoid `any`; avoid `as` assertions except right after validation; treat non-null `!` as a claim that needs a reason.
- **Literal unions or `as const` objects** for fixed value sets; follow the codebase if it already uses `enum`.
- **Generics only for real relationships** between parameter and return types. A type parameter used once is noise.
- **Annotate exported signatures** so the contract is explicit and errors surface at the definition; let locals infer.
- **`readonly`** for data that should not be mutated after construction, especially in public types.

## Units and modules

- The module is the encapsulation unit: unexported functions and constants are private. A class is warranted for state with invariants, or when a framework requires one; not as a namespace for static methods.
- Plain objects and interfaces for data; functions over them for behavior. Avoid classes that expose every field and also hold business logic.
- Export only what consumers need. Every export is a contract someone may depend on.
- Group by concept (feature or domain folder), not by kind (`utils/`, `helpers/`, `types/` for everything). A type lives with the code that owns it.
- Follow the repo's barrel-file and path-alias conventions; do not introduce new ones in passing.

## Functions

- An options object once there are more than two or three parameters, or any boolean. It names arguments at the call site. Don't let it become a bag of unrelated settings; that is a function doing several things.
- Default values in the destructuring (`{ retries = 3 }`), decided by the owner of the policy.
- Prefer returning new values over mutating inputs, matching whatever the codebase does for immutability.
- `map`/`filter` when they read more clearly than a loop; a `for...of` loop is fine and often clearer than `reduce` for anything beyond a simple accumulation.

## Errors and async

- Throw `Error` subclasses for exceptional failures and pass `{ cause }` when rethrowing. For expected outcomes callers must branch on (not found, validation failure), a typed result union is often clearer; follow the codebase's pattern.
- `catch (err: unknown)` and narrow; never an empty `catch {}`. Catch where you can recover or add context.
- Every promise is awaited, returned, or deliberately handled; no floating promises. `Promise.all` for independent work, not sequential `await` in a loop.
- Thread an `AbortSignal` through cancellable work rather than inventing ad-hoc cancel flags.

## Smells

- `a?.b?.c?.d` sprinkled everywhere: the types probably admit states that should not exist. Fix the type or validate at the boundary.
- `||` for defaults where `0`, `''`, or `false` are valid; use `??`.
- `// @ts-ignore` or `as unknown as T` to get past an error; this overrides a safety. Fix the type or use `@ts-expect-error` with a reason.
- Types duplicated from an API or schema by hand instead of derived.
- A `utils.ts` that every module imports.
