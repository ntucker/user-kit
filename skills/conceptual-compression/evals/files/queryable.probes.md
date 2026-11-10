# Probes for the Queryable overview

Statements for a blind reader of the overview, with the answer the repository gives (T true, F false) at reactive/data-client commit 52d3833. There is no single source text here, so every statement is one an overview has to settle: an answer of open counts as a miss.

| # | Statement | Source |
|---|---|---|
| 1 | A Queryable schema's value can be read from the store without defining an endpoint for it. | T |
| 2 | A schema whose `queryKey()` can only return `undefined` is not Queryable. | T |
| 3 | A plain Array schema such as `[Todo]` can be passed to `useQuery()`. | F |
| 4 | `new Invalidate(Todo)` is Queryable. | F |
| 5 | `useQuery(Todo, { id: '5' })` returns `undefined` when that Todo is not in the store. | T |
| 6 | When the value is missing from the store, `useQuery()` fetches it. | F |
| 7 | With default behavior, an Entity can be looked up by a field declared in its `indexes` as well as by its pk. | T |
| 8 | `new All(Todo)` reads every Todo currently in the store. | T |
| 9 | A `Query` reads its input from the store through the schema it wraps, so that schema has to be Queryable, or a plain object of Queryables. | T |
| 10 | A Manager can read a Queryable from the store with `Controller.get()` or a snapshot's `get()`. | T |
| 11 | `Controller.set()` writes to the store through a Queryable schema and its args. | T |
| 12 | A `Lazy` schema can be handed to `useQuery()` directly, without its `.query` accessor. | F |
| 13 | Because of Queryable, `useSuspense()` can render data already in the store before its own endpoint has resolved. | T |
| 14 | `queryKey()` produces, from the args and what is in the store, the normalized result an endpoint would otherwise have stored. | T |
| 15 | The value `useQuery()` returns for a `Query` is recomputed on every render. | F |
| 16 | Overriding an Entity's `queryKey()` to return `undefined` turns off lookup without an endpoint for that Entity. | T |
| 17 | A `Collection` is Queryable even though the plain Array or Values it wraps is not. | T |
| 18 | To show a sorted, filtered, or aggregated view of data already in the store, define a `Query` and render it with `useQuery()`. | T |
| 19 | `useQuery()` keeps returning the last value after the data it reads has been invalidated. | F |
| 20 | A component using `useQuery()` re-renders when the entities it reads are changed in the store. | T |
