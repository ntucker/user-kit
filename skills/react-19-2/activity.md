# `<Activity>` reference

Companion to `SKILL.md`. Read when deciding whether Activity fits, when hidden content misbehaves, or when designing pre-rendering.

```jsx
import { Activity } from 'react';
<Activity mode={visible ? 'visible' : 'hidden'}>{children}</Activity>
```

`mode` defaults to `'visible'`. Only `'visible'` and `'hidden'` exist in 19.2; more modes are planned, so do not build abstractions that assume a boolean.

## What each mode does

| Aspect | `visible` | `hidden` |
|---|---|---|
| Component state (`useState`, `useReducer`, refs) | live | preserved |
| DOM | normal | kept, each host child gets `display: none` inline |
| Effects (`useEffect`, `useLayoutEffect`) | mounted | cleanup run; re-created on reveal |
| `useInsertionEffect` | mounted | not torn down (style injection stays) |
| Re-renders on new props/context | normal priority | still rendered, at lowest priority, deferred until React is idle |
| Suspending children | shows nearest Suspense fallback | keeps rendering in background; does not show the visible fallback |
| Errors thrown while rendering | nearest error boundary | 19.2: propagate to the nearest error boundary, possibly visible UI; 19.3 contains them |
| `createPortal` children | shown | 19.2: still visible; 19.3 hides them |
| `<title>`/`<meta>`/`<link>` metadata | hoisted to `<head>` | 19.2: still hoisted; 19.3 stops hoisting from hidden trees |
| Server rendering | included in HTML | skipped; rendered on the client after hydration |
| Selective hydration | independent hydration unit | independent hydration unit |
| Performance Tracks | Mount/Unmount | Disconnect on hide, Reconnect on reveal |

Activity itself renders no DOM node. Hiding is applied to the first-level host children, so layout-affecting wrappers are not introduced.

## Choosing Activity vs alternatives

| Situation | Choose |
|---|---|
| The user will likely come back and expects it as they left it | `<Activity>` |
| Content must be gone for correctness (logout, permission revoked, sensitive data) | unmount |
| Content is cheap to recreate and rarely revisited | unmount (avoid memory cost) |
| You need the DOM visible but inert | not Activity; use `inert`/styling |
| You want it hidden but still running subscriptions or timers | not Activity (Effects are unmounted); reconsider whether it should be hidden |
| Large virtualized lists | virtualize; do not wrap each row in Activity |

Cost model: each hidden tree keeps its fibers and DOM. For master-detail or chat-thread caching, cap the cache (for example the last 3 to 5 items) and unmount the rest.

## Pre-rendering mechanics

`<Activity mode="hidden">` on first render is a pre-render:

- Children render at lowest priority. `lazy()` chunks load, and any data read through Suspense (`use(promise)`, Suspense-integrated data libraries, RSC-provided promises) is requested.
- Nothing is painted, the enclosing visible Suspense fallback is not shown for the hidden subtree, and Effects do not run.
- On `visible`, if data and code are ready the content appears synchronously; otherwise the normal Suspense path applies.

Not fetched during pre-render: anything in `useEffect` (`fetch` in an Effect, TanStack Query without Suspense mode, SWR without `suspense: true`). To benefit, read that data through a Suspense-compatible API or move it to a Server Component.

Because hidden content is not in the server HTML, do not rely on it for SEO or for above-the-fold LCP. It becomes useful right after hydration.

## Hydration

Activity boundaries divide the tree into units for Selective Hydration, like Suspense boundaries, without changing what the initial HTML looks like. Use always-visible `<Activity>` around independent heavy sections so interactive controls elsewhere hydrate first:

```jsx
<Post />
<Activity><Comments /></Activity>
<Activity><RelatedPosts /></Activity>
```

Use Suspense instead when a fallback is acceptable and the content also needs to load lazily on the server.

## Patterns

Tabs with instant switching and background pre-render (the inactive tab fetches in the background):

```jsx
function Tabs({ active }) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Activity mode={active === 'overview' ? 'visible' : 'hidden'}><Overview /></Activity>
      <Activity mode={active === 'metrics' ? 'visible' : 'hidden'}><Metrics /></Activity>
    </Suspense>
  );
}
```

Collapsible sidebar/inspector keeping expanded sections and scroll:

```jsx
<Activity mode={sidebarOpen ? 'visible' : 'hidden'}><Sidebar /></Activity>
<main>...</main>
```

Wizard steps that keep inputs on back/forward:

```jsx
{steps.map((Step, i) => (
  <Activity key={i} mode={i === current ? 'visible' : 'hidden'}><Step /></Activity>
))}
```

Master-detail / thread cache with a bound:

```jsx
const recent = useRecentIds(selectedId, 4);         // selected first, then recently viewed
{recent.map(id => (
  <Activity key={id} mode={id === selectedId ? 'visible' : 'hidden'}><Thread id={id} /></Activity>
))}
```

Router keep-alive for instant Back (client router that owns the element per route):

```jsx
{cachedRoutes.map(r => (
  <Activity key={r.key} mode={r.key === location.key ? 'visible' : 'hidden'}>{r.element}</Activity>
))}
```

Prepare the probable next screen: `<Activity mode="hidden"><Checkout /></Activity>` rendered from the cart page; flip to `visible` on navigation.

Media inside Activity: DOM side effects persist behind `display: none`, so stop them in a cleanup:

```jsx
function Video(props) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    return () => el.pause();          // runs when hidden, keeps timecode
  }, []);
  return <video ref={ref} {...props} />;
}
```

Same idea for `<audio>`, `<iframe>` (consider clearing `src` if it plays media), Web Audio nodes, `requestAnimationFrame` loops, and third-party widgets started in Effects (they are already torn down by the Effect cleanup).

Pairing with transitions: wrap the mode change in `startTransition` when the reveal may suspend, so the current UI stays interactive. On 19.3+, that also enables `<ViewTransition>` enter/exit animations for the Activity (see the `react-19-3` skill).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Hidden component still plays video/audio, iframe keeps running | DOM persists; add a cleanup Effect that pauses/stops |
| Hidden component's subscription is gone; data stale on reveal | expected: Effects are unmounted while hidden; re-created on reveal. Fetch through Suspense if it must stay fresh. If the subtree uses `useSyncExternalStore`, verify freshness on reveal; 19.3 fixed mutations missed while hidden |
| Nothing renders for hidden text | text-only children have no element to hide; wrap in an element or accept it |
| Hidden content missing from server HTML | by design; it renders after hydration |
| Fallback flashes on reveal | data was not Suspense-based, so nothing pre-rendered; switch to `use`/Suspense-enabled fetching |
| Memory grows | too many hidden trees; bound the cache or unmount cold ones |
| Effect does setup-only cleanup (relies on mount to reset) | refactor so the returned cleanup undoes the setup; `<StrictMode>` surfaces this in dev |
| Tooltip/modal rendered with `createPortal` inside a hidden Activity stays on screen | 19.2 behavior (fixed in 19.3); gate the portal on the visible state or unmount it |
| Page title/meta changes to the hidden tab's values | 19.2 hoists metadata from hidden trees (fixed in 19.3); render document metadata only from the visible tree |
| Error in a pre-rendering hidden tab blanks the visible page | 19.2 lets it reach the nearest error boundary (fixed in 19.3); wrap each hidden tree in its own error boundary |
| `Activity` is `undefined` in a Server Component | the `react` server entry point exports it from 19.3; on 19.2 render `<Activity>` in a Client Component |
