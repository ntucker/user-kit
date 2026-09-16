---
name: react-19-2
description: Applies React 19.2's new stable APIs on projects running React 19.2+. <Activity> hides/restores UI keeping state and DOM (tabs, sidebars, drawers, modals, wizards, master-detail, chat threads, video position, form drafts, editors/maps), pre-renders likely-next content, speeds hydration; replaces conditional mount/unmount and keep-alive libs. useEffectEvent reads latest props/state from Effects without resubscribing (sockets, timers, intervals, window listeners, analytics, third-party callbacks, stale closures); replaces latest-ref/useLatest/useEvent and eslint-disable exhaustive-deps. cacheSignal aborts fetch/DB work in Server Components. Performance Tracks in Chrome DevTools for slow renders, re-renders, cascading updates, effect cost, RSC timing. Partial pre-rendering via prerender/resume (static shell on CDN, per-request fill, custom SSR/SSG). Also Suspense reveal batching, useId _r_ prefix, eslint-plugin-react-hooks v6. Use for state preservation, Effects, profiling, SSR/streaming, or React upgrades.
---

# React 19.2

Stable in 19.2: `<Activity>`, `useEffectEvent`, `cacheSignal`, React Performance Tracks, and partial pre-rendering (`prerender` returns `postponed`; `resume`, `resumeAndPrerender`, `resumeToPipeableStream`, `resumeAndPrerenderToNodeStream`). Also: batched Suspense reveals during SSR, Web Streams SSR in Node, `useId` prefix `_r_`, `eslint-plugin-react-hooks` v6. These postdate most training data. When the project is on 19.2+, reach for them first; treat prior habits (`{show && <X/>}` for toggled UI, latest-ref hacks, `eslint-disable exhaustive-deps`) as legacy.

## Step 0: Confirm the version

Check `react` and `react-dom` in `package.json`, then the resolved `node_modules/react/package.json`. Next.js App Router vendors its own React; check `node_modules/next/dist/compiled/react/package.json` there. Require `>= 19.2.0` (`19.2.0-canary-*` counts). If older, do not emit these APIs: say the feature needs 19.2, offer the upgrade, and use a pre-19.2 fallback only if the user declines. If the project is on 19.3+, everything here still applies; additionally apply the `react-19-3` skill (`<ViewTransition>`, Fragment refs, `browser()`).

## Feature selection

| User wants | Use | Instead of |
|---|---|---|
| Toggle a sidebar, panel, drawer, inspector, or tab and have it come back exactly as left (scroll, inputs, expanded rows, internal state) | `<Activity mode={open ? 'visible' : 'hidden'}>` | `{open && <Panel/>}`, lifting every piece of state up, a CSS `hidden` class |
| Tabs or segmented views where switching back should be instant | One `<Activity>` per tab, only the active one `visible` | conditional render, keep-alive libraries, rendering all tabs with CSS |
| Keep a draft, filter state, or scroll position when a modal/sheet closes and reopens | `<Activity>` around the content (keep the dialog chrome conditional if it must unmount) | draft state in a parent or store |
| Video/audio keeps its timecode; iframe does not reload; map/editor/chart/canvas keeps its instance | `<Activity>` plus a cleanup Effect that pauses/stops the media | unmount + re-initialize |
| Wizard or multi-step form: back/forward keeps inputs | `<Activity>` per step | reducer holding every field |
| Master-detail, chat thread list, inbox: reopening an item is instant | `<Activity>` per recently viewed item (bounded) | refetch and re-render on every switch |
| Load the next tab/route/step's data and code before the user clicks | `<Activity mode="hidden">` around it; data read with `use`/Suspense-enabled fetching, code via `lazy` | manual prefetch calls, `<link rel="prefetch">`, offscreen CSS |
| Page feels frozen until fully hydrated; heavy below-fold section (comments, feed, charts) | wrap independent sections in `<Activity>` (even always visible) so they hydrate separately | `<Suspense>` (changes initial UI by showing a fallback) |
| Effect resubscribes every render because its callback reads a prop/state (chat room + `theme`/`muted`, socket handler, `setInterval` reading `count`, `keydown` reading current selection, ResizeObserver/IntersectionObserver callbacks, third-party `on*` callbacks) | `useEffectEvent` for the callback; keep only true sync deps | `useRef` latest-ref, `useLatest`, `useEvent`/`useEventCallback` polyfills, `// eslint-disable-next-line react-hooks/exhaustive-deps` |
| Custom `useInterval`, `useTimeout`, `useEventListener`, `useDebouncedEffect` that take a callback | wrap the callback with `useEffectEvent` inside the hook | `savedCallback` ref updated in an Effect |
| Log analytics/visit on route change with current user or context | `useEffectEvent(() => log(url, user))`, Effect deps `[url]` | including `user` in deps (double logs) or disabling the lint |
| Server Component fetch/DB query should abort when the render finishes or is aborted; cancelled requests pollute logs | `cacheSignal()` as the `signal`; `cacheSignal()?.aborted` to skip logging | no signal, ad-hoc `AbortController` per request |
| "Why is this slow / re-rendering / janky", cascading updates, expensive Effects, which priority work runs at, slow RSC awaits | Chrome DevTools Performance panel React tracks (dev build, or alias `react-dom/client` to `react-dom/profiling`) | `console.time`, `why-did-you-render`, guesswork |
| Static shell cached on CDN with per-request holes (auth, cookies, personalization, A/B); custom SSR/SSG framework | `prerender` + abort, persist `postponed`, then `resume` (stream) or `resumeAndPrerender` (HTML) | two full renders, client-only holes, string stitching |
| Node server wants Web Streams (edge-portable code) | `renderToReadableStream` / `prerender` now run in Node; prefer Node stream APIs when perf and compression matter | polyfills |
| Lint for 19.2 hooks | `eslint-plugin-react-hooks` >= 6.1 (flat config default) | v5, which lacks the newer Effect Event and `use` rules |
| Tests, selectors, or CSS parse `useId` output | stop parsing; IDs now look like `_r_1_` (client) or `_R_…_` (server-generated) and are valid selectors | regexes on `:r1:` / `«r1»`, `CSS.escape` |

## `<Activity>`

```jsx
import { Activity } from 'react';
<Activity mode={isOpen ? 'visible' : 'hidden'}>
  <Sidebar />
</Activity>
```

Props: `children`; `mode`: `'visible'` (default) or `'hidden'`. No other modes in 19.2.

Semantics of `hidden`: React keeps the children mounted and their state, sets `display: none` on their host DOM nodes, unmounts their `useEffect`/`useLayoutEffect` Effects (cleanup functions run; `useInsertionEffect` stays), and keeps re-rendering them on prop changes at lower priority (deferred until React is otherwise idle). Switching back to `visible` reveals the same DOM and state and re-runs mount Effects. Hidden on initial render = pre-rendering: children render, load `lazy` code, and fetch Suspense-based data in the background without appearing.

Rules:

1. Treat hidden as unmounted for Effects. Subscriptions, timers, and listeners are torn down while hidden and re-created on reveal. Never rely on an Effect's setup running to undo something; do it in the cleanup. `<StrictMode>` simulates hide/show in dev to surface violations.
2. DOM side effects persist. `<video>`, `<audio>`, `<iframe>`, running CSS animations keep going behind `display: none`. Add a cleanup for media: `useLayoutEffect(() => { const el = ref.current; return () => el.pause(); }, [])`.
3. Text-only children render nothing while hidden (no element to hide). `<Activity mode="hidden">text</Activity>` outputs nothing; wrap in an element if the DOM must exist.
4. Hidden content is not in the server HTML; it renders on the client after hydration. No SEO for it, and a hidden subtree that suspends does not show the enclosing visible `<Suspense>` fallback; it just keeps pre-rendering.
5. Pre-rendering only fetches data read through Suspense (`use(promise)`, Suspense-enabled data libraries). Data fetched in `useEffect` does not run while hidden.
6. Memory and DOM cost are real: every hidden tree keeps its DOM and fiber state. Bound the set (recent N items), and do not wrap huge lists item by item. Unmount when the content must truly go away (security, logout).
7. 19.2-only gotchas, fixed in 19.3: `createPortal` content inside a hidden Activity stays visible (hide it yourself or unmount the portal); `<title>`/`<meta>`/`<link>` inside a hidden Activity are still hoisted into `<head>` (keep document metadata out of hidden trees); an error thrown while pre-rendering hidden content propagates to the nearest error boundary and can take down visible UI (wrap hidden content in its own error boundary).
8. `Activity` is not exported from the `react` server entry point in 19.2 (added in 19.3), so import and render it in Client Components. On 19.3+, an `<Activity>` inside `<ViewTransition>` whose `mode` changes inside `startTransition` runs the boundary's `enter`/`exit` animation; see the `react-19-3` skill.

Patterns:

Tabs that keep state and pre-render the inactive one:

```jsx
<Suspense fallback={<Skeleton />}>
  <Activity mode={tab === 'home' ? 'visible' : 'hidden'}><Home /></Activity>
  <Activity mode={tab === 'posts' ? 'visible' : 'hidden'}><Posts /></Activity>
</Suspense>
```

Prepare content the user will probably open next: `<Activity mode="hidden"><CheckoutStep2 /></Activity>` (renders, loads code and Suspense data in the background). Hydration units without changing the initial UI: `<Activity><Comments /></Activity>` under the main post. Router keep-alive: render the previous route's element in a hidden `<Activity>` so Back is instant. Media inside Activity: pause in a cleanup Effect. Full detail and troubleshooting: [activity.md](activity.md).

## `useEffectEvent`

```jsx
import { useEffect, useEffectEvent } from 'react';

function ChatRoom({ roomId, theme, muted }) {
  const onConnected = useEffectEvent(() => {
    if (!muted) showNotification('Connected!', theme);   // always sees latest theme/muted
  });
  useEffect(() => {
    const conn = createConnection(roomId);
    conn.on('connected', () => onConnected());
    conn.connect();
    return () => conn.disconnect();
  }, [roomId]);                                          // theme/muted correctly omitted
}
```

Decision rule: a value the Effect should re-synchronize on (`roomId`, `url`, a delay) stays a dependency. A value that is merely read when something happens (`theme`, `muted`, `count`, the current user, an `onChange` prop) moves into an Effect Event. Reads of an Effect Event's closure are always the latest committed render.

Rules (the linter, `eslint-plugin-react-hooks` >= 6.1, enforces most):

- Call it at the top level of a component or custom Hook.
- Call the returned function only from `useEffect`/`useLayoutEffect`/`useInsertionEffect` bodies or other Effect Events in the same component. Not during render, not from event handlers, not passed as a prop or to another Hook. For those, use a plain function or `useCallback`.
- Never list it in a dependency array. Its identity changes every render on purpose so misuse shows up as an Effect that re-runs constantly.
- It is not a way to hide dependencies. If a value should re-run the Effect (`pageUrl` for a visit log), keep it as a dependency. Only extract logic that genuinely should not re-trigger.
- Works in custom Hooks: `const onTick = useEffectEvent(callback)` lets `useInterval(callback, delay)` accept a fresh callback each render without resetting the timer.

Common conversions:

```jsx
// Interval that reads latest state without restarting
const onTick = useEffectEvent(() => setCount(count + increment));
useEffect(() => { const id = setInterval(onTick, 1000); return () => clearInterval(id); }, []);

// Global listener reading latest state
const onKey = useEffectEvent(e => { if (e.key === 'Escape' && isOpen) close(); });
useEffect(() => { window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, []);

// Analytics on navigation with current context
const logVisit = useEffectEvent(() => analytics.page(url, { userId: user?.id, plan }));
useEffect(() => { logVisit(); }, [url]);
```

Migration recipes from latest-ref/`useEvent` polyfills and lint-error meanings: [effect-events.md](effect-events.md).

## `cacheSignal` (Server Components)

```js
import { cache, cacheSignal } from 'react';

// Put cacheSignal() inside the cached function: cache() keys on argument identity,
// so passing a fresh { signal } object per call would defeat deduplication.
const getProduct = cache(async (id) => {
  const res = await fetch(`/api/products/${id}`, { signal: cacheSignal() });
  return res.json();
});

async function Product({ id }) {
  const product = await getProduct(id);
  // ...
}
```

Returns an `AbortSignal` during a Server Component render that aborts when React finishes rendering (success, abort, or failure), so in-flight fetches, DB queries, and streams stop. Returns `null` outside rendering and in Client Components today (do not assume it stays null on the client; write `cacheSignal()?.aborted`).

Rules: only work started during render can be cancelled; a `fetch` kicked off at module scope with `cacheSignal()` is not aborted (and `cacheSignal()` is `null` there anyway). Pass it to every cancellable I/O in RSC data helpers. In `catch` blocks, skip logging when `cacheSignal()?.aborted` so cancelled connections are not reported as errors.

## React Performance Tracks

Development builds add custom tracks to Chrome DevTools' Performance panel automatically. Record a profile and read:

- Scheduler track (Blocking, Transition, Suspense, Idle subtracks): which priority did the work, the update that caused each render, and Render / Commit / Remaining Effects phases. "Cascading update" entries name the component and method that scheduled a render during a render; treat them as regressions to fix.
- Components track: flamegraph of component render and Effect durations (Effects shown when >= 0.05ms or when they scheduled an update); Mount/Unmount and, for `<Activity>`, Reconnect/Disconnect. Click a render to see changed props and find unnecessary re-renders.
- Server Requests and Server Components tracks (dev only): every awaited Promise in RSC with stack and resolved value; third-party internals collapse into one span; rejected Promises in red.

For production-like numbers use the profiling build: alias `react-dom/client` to `react-dom/profiling` in the bundler (or use the framework's profiling flag). Profiling builds show Scheduler tracks by default; the Components track only covers `<Profiler>` subtrees unless the React DevTools extension is installed. When asked to diagnose slowness, point at these tracks first rather than ad-hoc timers or render-counting libraries.

## Partial pre-rendering

```js
import { prerender, resumeAndPrerender } from 'react-dom/static';
import { resume } from 'react-dom/server';

// Build time or first request: render the static shell, stop at request-specific data
const controller = new AbortController();
setTimeout(() => controller.abort(new Postponed()), 0);        // or a real timeout
const { prelude, postponed } = await prerender(<App />, {
  signal: controller.signal,
  bootstrapScripts: ['/main.js'],
  onError(e) { if (!(e instanceof Postponed)) console.error(e); },
});
await store(prelude, postponed);                                // postponed === null means fully rendered

// Per request: send the cached prelude, then stream the rest
const { html, postponed: saved } = await load(request);
const stream = await resume(<App />, saved);
// write html to the response first, then pipe stream after it

// Or finish to static HTML for SSG
const { prelude: fullHtml } = await resumeAndPrerender(<App />, saved);
```

Node stream variants: `prerenderToNodeStream` (`react-dom/static`), `resumeToPipeableStream` (`react-dom/server`, callbacks `onShellReady`/`onAllReady`/`onShellError`, returns `{ pipe, abort }`), `resumeAndPrerenderToNodeStream` (`react-dom/static`). Prefer Node streams in Node for speed and compression.

Rules:

- Everything request-specific must be inside a `<Suspense>` boundary and suspend during prerender (read cookies/session through a promise). Boundaries still pending at abort are emitted as fallbacks in `prelude` and recorded in `postponed`.
- Render the same element (`<App />`) to `prerender` and `resume`; `resume` re-renders from the root and skips only components that fully finished prerendering.
- `bootstrapScripts`, `bootstrapScriptContent`, `bootstrapModules`, `identifierPrefix` go to `prerender` only; `resume` inherits and does not accept them. `nonce` is not allowed on `prerender` (it would bake a per-request secret into the cache); pass it to `resume` only if `prerender` emitted no scripts.
- `postponed` is JSON-serializable; persist it with the prelude (KV, S3, file). `null` means nothing to resume.
- Abort with a sentinel (`class Postponed extends Error {}`) and filter it in `onError` so intentional postponement is not logged as a failure.
- Hydrate the whole document with `hydrateRoot(document, <App />)` as usual.

End-to-end flow, storage, timeouts, and troubleshooting: [partial-prerendering.md](partial-prerendering.md).

## Other 19.2 behavior to rely on

- Suspense reveals from streaming SSR are batched briefly so more content appears together, matching client behavior (React stops batching when page load nears ~2.5s to protect LCP). Do not add delays or ordering hacks to synchronize boundaries; do not expect each boundary to pop individually. This also prepares `<ViewTransition>` reveals (19.3).
- `useId` now produces `_r_…_` (was `:r…:` in 19.0, `«r…»` in 19.1). Valid in CSS selectors and `view-transition-name` without escaping. Update snapshots/tests that hard-code the old format; never parse or reconstruct IDs; `identifierPrefix` still applies.
- `eslint-plugin-react-hooks` v6: `recommended` is flat config; eslintrc users switch to `plugin:react-hooks/recommended-legacy`. New violations: `use` inside `try/catch`, Effect Events called from arbitrary closures. `recommended-latest` adds React Compiler rules (v7 turns them on in `recommended` and supports both config formats). Upgrade the plugin with React so `useEffectEvent` is linted.
- Web Streams SSR in Node: `renderToReadableStream` and `prerender` work in Node.js; keep `renderToPipeableStream`/`prerenderToNodeStream` for production Node servers.
- `nonce` is honored on hoistable `<style href precedence nonce>`, so those styles can pass a nonce-based `style-src` CSP.
- ARIA 1.3 attributes (`aria-description`, `aria-braillelabel`, etc.) no longer warn; use them directly.
- Context stringifies as `SomeContext` instead of `SomeContext.Provider` in warnings/DevTools; update string matches.
- Fixed: `useDeferredValue` with an `initialValue`, infinite `useDeferredValue` loop on `popstate`, crash when submitting forms with Client Actions, `use` inside `lazy` components, deeply nested Suspense in SSR fallbacks, hangs after aborting a suspended server render. Remove workarounds for these.
- SSR reveal now also waits for Suspensey fonts; `progressiveChunkSize` is configurable on server APIs.
- RSC: dev logs an error if production-build elements are rendered during development (mixed builds); `filterStackFrame` receives line/column.

## Legacy to replace when on 19.2

| Legacy | Replacement |
|---|---|
| `{isOpen && <Panel/>}` for UI the user toggles back and forth | `<Activity mode={isOpen ? 'visible' : 'hidden'}>` |
| Rendering every tab and hiding with a CSS class or `hidden` attribute (Effects and subscriptions stay live) | `<Activity>` per tab (Effects unmount while hidden) |
| Keep-alive / `react-activation` style libraries, `display:none` wrappers | `<Activity>` |
| Manual prefetch of the next tab or step's data before it is shown | `<Activity mode="hidden">` around it with Suspense data |
| Lifting form state to a parent only so it survives a collapse | keep it local under `<Activity>` |
| `const latest = useRef(cb); latest.current = cb;` and `useLatest`, `useEvent`, `useEventCallback` polyfills used inside Effects | `useEffectEvent` |
| `// eslint-disable-next-line react-hooks/exhaustive-deps` to avoid resubscribing | `useEffectEvent` for the non-reactive part |
| `savedCallback` ref in `useInterval`/`useTimeout` hooks | `useEffectEvent(callback)` |
| RSC fetches with no signal; logging every cancelled query | `signal: cacheSignal()`; skip when `cacheSignal()?.aborted` |
| `console.time`, render counters, `why-did-you-render` for perf triage | React Performance Tracks in the Performance panel |
| Regex/`CSS.escape` around `useId` values; tests asserting `:r0:` | plain `#${id}`; update fixtures to `_r_` |
| `plugin:react-hooks/recommended` in eslintrc with plugin v6 | `plugin:react-hooks/recommended-legacy` (or flat config) |

## References

- [activity.md](activity.md): lifecycle table, SSR/hydration behavior, pre-render mechanics, patterns (tabs, routers, master-detail, wizards, modals, media), memory guidance, troubleshooting.
- [effect-events.md](effect-events.md): reactive vs non-reactive decision, migration recipes, custom Hook patterns, every lint/runtime error and its fix.
- [partial-prerendering.md](partial-prerendering.md): full API matrix (Web and Node streams), storage/serving flow, abort sentinel, Suspense placement, caveats.
- Upstream: [React 19.2 post](https://react.dev/blog/2025/10/01/react-19-2), [`<Activity>`](https://react.dev/reference/react/Activity), [`useEffectEvent`](https://react.dev/reference/react/useEffectEvent), [`cacheSignal`](https://react.dev/reference/react/cacheSignal), [Performance Tracks](https://react.dev/reference/dev-tools/react-performance-tracks), [`prerender`](https://react.dev/reference/react-dom/static/prerender), [`resume`](https://react.dev/reference/react-dom/server/resume), [`eslint-plugin-react-hooks`](https://react.dev/reference/eslint-plugin-react-hooks).
