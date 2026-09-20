---
name: react-19-3
description: Applies React 19.3's new stable APIs on projects running React 19.3+. <ViewTransition> and addTransitionType animate UI from user interactions (enter/exit, mount/unmount, modals, drawers, list add/remove/reorder, shared-element/hero morphs, page/tab/carousel/wizard navigation with directional slides, theme switches, skeleton-to-content reveals, image/font pop-in). Fragment refs add event listeners, Intersection/ResizeObserver, in-view/lazy-load/impression tracking, focus, scrollIntoView, and measurement to sibling groups or third-party components without wrapper divs. use(browser()) handles browser-only rendering under SSR (localStorage, window, timezone, matchMedia, hydration mismatches; replaces typeof window, mounted flags, ssr:false). Also Trusted Types under CSP and Context rendered in Server Components. Use for animation, transition, motion, loading states, Suspense, refs, DOM access, observers, focus, SSR/hydration, or React upgrades; prefer these built-ins over libraries or workarounds.
---

# React 19.3

Stable in 19.3: `<ViewTransition>`, `addTransitionType`, Fragment refs (`FragmentInstance`), `browser()` from `react-dom`, Trusted Types passthrough, and `<Context>` rendered directly from Server Components. These postdate most training data. When the project is on 19.3+, reach for them first; treat prior habits (wrapper divs for refs, `typeof window` checks, animation libraries for simple enter/exit) as legacy.

## Step 0: Confirm the version

Resolve the React that will actually run, not just what `package.json` requests:

- Plain apps: `node -p "require('react/package.json').version"` (same for `react-dom`).
- Next.js App Router vendors React and ignores the project's `react` dependency. The vendored `package.json` has no `version`; read the bundle: `rg -o -m1 'exports\.version = "[^"]+"' node_modules/next/dist/compiled/react/cjs/react.production.js`. Pages Router uses the project's own `react`.

Require `>= 19.3.0`. A `19.3.0-canary-*` build is a snapshot from its date and can have some 19.3 APIs but not others (Next 16.3.4 ships `19.3.0-canary-cbb046ab-20260731`: it exports `ViewTransition`, `addTransitionType`, `Activity`, and `browser`, but its server renderer lacks `onBrowserBailout`). On a canary, confirm the specific export before using it, e.g. `rg -c 'exports\.browser =' node_modules/next/dist/compiled/react-dom/cjs/react-dom.production.js`, or `'ViewTransition' in React` at runtime.

If the version is older, do not emit these APIs: say the feature needs 19.3, offer the upgrade, and use a pre-19.3 fallback only if the user declines.

## Feature selection

| User wants | Use | Instead of |
|---|---|---|
| Something animates in/out: modal, drawer, toast, dropdown, row added/removed, expand/collapse, tab panel swap | `<ViewTransition>` around the conditional element; flip the state inside `startTransition` | `AnimatePresence`, `react-transition-group`, mount-time CSS keyframes |
| Direction-aware motion: next/prev, forward/back, wizard steps, swipe, carousel | `addTransitionType('next')` in the transition + `enter={{ next: 'from-right', prev: 'from-left' }}` | tracking a `direction` state |
| One element morphs between two screens: thumbnail to detail, card to page header, avatar to profile | ``<ViewTransition name={`thing-${id}`}>`` on both sides (shared element) | manual FLIP, `layoutId` |
| Sort, filter, drag-reorder a list with motion | `<ViewTransition key={item.id}>` directly around each item; reorder in `startTransition` | AutoAnimate, layout animations |
| Skeleton to content without a pop; images or fonts flicker in late | `<ViewTransition update="auto" default="none"><Suspense>` | `onLoad` state, `document.fonts.ready`, opacity hacks |
| Animated show/hide that keeps internal state | `<Activity mode>` wrapping `<ViewTransition>` | conditional render (loses state) |
| Cross-fade on theme or layout-mode switch | `<ViewTransition>` at the root, `update="none"` on children | manual class toggling with transitions |
| Existing `document.startViewTransition(...)` calls | Migrate them to `<ViewTransition>`; React calls `startViewTransition` itself and interrupts any other caller | |
| Add listeners, observers, focus, scroll, or measurement to siblings or a component you cannot give a ref | `<Fragment ref>` and the `FragmentInstance` | wrapper `<div>`, forking a library component, `findDOMNode`, `parentElement.querySelectorAll` |
| In-view detection, lazy render, impression analytics, infinite-scroll sentinel, size tracking | `fragmentRef.current.observeUsing(observer)` | wrapper div plus `useRef` |
| Focus first/last field in a dialog or step; clear focus in a region | `.focus()`, `.focusLast()`, `.blur()` | `querySelector('input')?.focus()` |
| Component needs `window`, `localStorage`, `navigator`, `Intl` timezone, `matchMedia`; hydration mismatch text | `use(browser())` under `<Suspense>` | `typeof window`, `useEffect` mounted flag, `dynamic(..., { ssr: false })`, `useIsClient`, `suppressHydrationWarning` |
| CSP `require-trusted-types-for 'script'` | Pass `TrustedHTML` / `TrustedScriptURL` objects straight into props | pre-stringifying (now rejected by the browser) |
| Server Component shares data with the client tree via Context | Render `<Ctx value={...}>` imported from a `'use client'` file directly | a `Provider` wrapper component |

## View Transitions

```js
import { ViewTransition, startTransition, addTransitionType } from 'react';
```

Rules; breaking any silently disables the animation or errors:

1. Only Transition updates animate: `startTransition` / `useTransition`, a Suspense reveal, `useDeferredValue`, an `<Activity>` mode change inside a transition. Bare `setState` never animates (urgent by design). Also router navigations only animate if the router wraps them in `startTransition`.
2. For `enter`, `exit`, and reorder `update`, the `<ViewTransition>` must be the first thing rendered in the inserted/removed subtree, before any DOM element. `<div><ViewTransition>` breaks it; `<ViewTransition><div>` works.
3. Omit `name` unless doing a shared element. Named boundaries must be unique app-wide at any moment; always embed the id (``name={`card-${id}`}``). Duplicates do not throw: React logs a `console.error` in development and the browser aborts the view transition.
4. Never call `document.startViewTransition` alongside React; React calls it and interrupts anything else.
5. Add `@media (prefers-reduced-motion: reduce)` rules yourself; React does not disable animations.
6. `flushSync` during the transition skips the animation. Animations from legacy `popstate` (back button) are skipped; a Navigation-API router fixes that.
7. DOM only for now.

Props:

- Class props `default`, `enter`, `exit`, `update`, `share`. Value: `"auto"` (browser cross-fade), `"none"`, a CSS class, or `{ [transitionType]: value, default: value }`. `default="none"` turns off every trigger not listed explicitly. Multiple matching types join their classes; any `"none"` wins.
- Event props `onEnter`, `onExit`, `onUpdate`, `onShare`: `(instance, types) => cleanup`. `instance.old`, `.new`, `.group`, `.imagePair` are the pseudo-elements; `.name` is the VT name. Always return a cleanup (`() => anim.cancel()`). One event fires per boundary per transition; `onShare` beats `onEnter`/`onExit`.

Triggers React picks automatically: `enter` (boundary inserted), `exit` (removed), `update` (children changed, or the boundary moved/resized because a sibling changed; nested boundaries absorb updates from the parent), `share` (same `name` removed in one place and inserted in another).

Style by class, not by name:

```css
::view-transition-old(*), ::view-transition-new(*) { animation-duration: 250ms; }
::view-transition-new(.from-right) { animation-name: slide-in; --offset: 100%; }
::view-transition-old(.to-left)    { animation-name: slide-out; --offset: -100%; }
@keyframes slide-in  { from { transform: translateX(var(--offset)); opacity: 0; } }
@keyframes slide-out { to   { transform: translateX(var(--offset)); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

Transition types also become browser view-transition types, so `:root:active-view-transition-type(next) { &::view-transition-new(*) { ... } }` works for page-wide scoping.

### Patterns

Enter/exit on a user action:

```jsx
<button onClick={() => startTransition(() => setOpen(o => !o))}>Toggle</button>
{open && (
  <ViewTransition enter="fade-up" exit="fade-down" default="none">
    <Panel />
  </ViewTransition>
)}
```

Directional (carousel, wizard, tabs). `key` makes each slide a distinct boundary so it enters/exits instead of updating:

```jsx
function go(dir) {                       // 'next' | 'prev'
  startTransition(() => {
    addTransitionType(dir);
    setIndex(i => i + (dir === 'next' ? 1 : -1));
  });
}
<ViewTransition
  key={slide.id}
  enter={{ next: 'from-right', prev: 'from-left' }}
  exit={{ next: 'to-left', prev: 'to-right' }}>
  <Slide slide={slide} />
</ViewTransition>
```

Types reset after each commit: a Suspense fallback committed inside the transition carries them; the later content reveal does not.

Shared element (can be deep inside each tree; `share` beats enter/exit):

```jsx
// list item
<ViewTransition name={`thumb-${video.id}`}><Thumbnail video={video} /></ViewTransition>
// detail page
<ViewTransition name={`thumb-${video.id}`}><Hero video={video} /></ViewTransition>
```

If a Suspense fallback shows between the unmount and the mount, no share animation happens; prefetch or keep the data cached.

List reorder: `<ViewTransition key={item.id}>` directly around each item (no wrapper DOM between it and the parent), reorder inside `startTransition`. Each item gets an `update` animation to its new position.

Suspense reveal, the default to reach for:

```jsx
<ViewTransition update="auto" default="none">
  <Suspense fallback={<Skeleton />}>
    <Content />
  </Suspense>
</ViewTransition>
```

UX principles baked into that: the fallback appears immediately without animation; fallback to content animates; already-cached content appears instantly. For a distinct exit/enter instead of a cross-fade, put separate `<ViewTransition>`s inside the fallback and inside the child.

Images, fonts, stylesheets: during a VT update React waits (up to a timeout, about 500ms for fonts) for `<img>`s inside the boundary and for newly introduced fonts before animating, and `<link rel="stylesheet" precedence="...">` blocks the Suspense boundary until loaded. Put `<img>` and font `<style href precedence>` inside the VT + Suspense to get a coordinated reveal. An `onLoad` handler on an `<img>` opts that image out of the wait.

Opt a subtree out of a page-level boundary:

```jsx
<ViewTransition>
  <div className={theme}>
    <ViewTransition update="none">{children}</ViewTransition>
  </div>
</ViewTransition>
```

Preserve state while animating in/out:

```jsx
<Activity mode={show ? 'visible' : 'hidden'}>
  <ViewTransition enter="auto" exit="auto" default="none"><Sidebar /></ViewTransition>
</Activity>
```

JavaScript-driven (Web Animations API), with type-aware timing:

```jsx
<ViewTransition onEnter={(inst, types) => {
  const anim = inst.new.animate(
    [{ opacity: 0, transform: 'scale(.95)' }, { opacity: 1, transform: 'none' }],
    { duration: types.includes('fast') ? 150 : 300, easing: 'ease-out' });
  return () => anim.cancel();
}}>
```

Details (how React sequences the VT, batching of overlapping transitions, router integration, troubleshooting): [View Transitions reference](references/view-transitions.md).

## Fragment refs

```jsx
import { Fragment, useRef, useLayoutEffect } from 'react';
<Fragment ref={fragmentRef}>{children}</Fragment>   // explicit <Fragment>; <> cannot take a ref
```

`fragmentRef.current` is a `FragmentInstance` that operates on the Fragment's DOM children as a group without changing DOM structure. It sees through component boundaries, so it works on children that never expose a `ref`.

| Method | Scope |
|---|---|
| `addEventListener(type, fn, opts?)`, `removeEventListener(...)`, `dispatchEvent(event)` | first-level DOM children; listeners follow children added/removed later |
| `observeUsing(observer)`, `unobserveUsing(observer)` | first-level DOM children; `IntersectionObserver` or `ResizeObserver`; ignores text nodes |
| `focus(opts?)`, `focusLast(opts?)`, `blur()` | searches all nested children depth-first for focusables |
| `getClientRects()`, `compareDocumentPosition(node)`, `scrollIntoView(alignToTop?)` | first-level DOM children; `scrollIntoView` takes only a boolean, an options object throws |
| `getRootNode(opts?)` | the root (`Document`/`ShadowRoot`) of the Fragment's parent DOM node |

"First-level DOM children" means the first host node reached through any number of components; a `<div>` nested inside another `<div>` child is not targeted. Listeners are not applied while inside a hidden `<Activity>` and attach when it becomes visible. Each targeted element gets `element.reactFragments`, a `Set<FragmentInstance>`, for routing entries from one shared observer.

In-view wrapper that works on any children:

```jsx
function InView({ onChange, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const visible = new Set();
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target) : visible.delete(e.target);
      onChange(visible.size > 0);
    });
    const inst = ref.current;
    inst.observeUsing(observer);
    return () => inst.unobserveUsing(observer);
  }, [onChange]);
  return <Fragment ref={ref}>{children}</Fragment>;
}
```

Reach for it whenever the alternative is a wrapper element that would disturb layout/styling (flex/grid children, table rows, list items), or modifying a component you do not own to forward a ref. Full API, shared-observer and focus patterns: [Fragment refs reference](references/fragment-refs.md).

## `browser()` for browser-only rendering

```jsx
'use client';
import { Suspense, use, useState } from 'react';
import { browser } from 'react-dom';

function SavedDraft() {
  use(browser('reads localStorage'));
  const [draft, setDraft] = useState(() => localStorage.getItem('draft') ?? '');
  return <textarea value={draft} onChange={e => { setDraft(e.target.value); localStorage.setItem('draft', e.target.value); }} />;
}

<Suspense fallback={<DraftSkeleton />}><SavedDraft /></Suspense>
```

Semantics: on the server `use(browser())` suspends and the nearest Suspense fallback goes into the HTML; in the browser it returns `undefined` and rendering continues; the boundary's content client-renders once, with no mounted-flag re-render and no hydration mismatch.

Rules:

- Client Component only (`'use client'` in RSC frameworks). Must have a `<Suspense>` ancestor during SSR or the server render fails.
- Pass the return value to `use`; never throw it or call `browser()` alone.
- It is conditional-safe like other `use` calls: early-return with a server-renderable default first, and only bail out when there is none. Prefer this over unconditional bailouts so the server still ships content.
- The `reason` (string, or a function for lazy/expensive values such as `() => new Error(...)`) becomes the `cause` on the error reported to the server renderer's `onBrowserBailout(error, { componentStack })`. Bailouts are not sent to `onError` or `onRecoverableError`.
- Cost: bailed-out content is absent from the HTML (SEO, LCP). Use only where the server truly cannot produce meaningful output.

Data hooks that should SSR only when seeded:

```js
function useBrowserQuery(query, options) {
  if (options.initialData === undefined) use(browser('no initialData'));
  return useQuery(query, options);
}
```

Server-side timeout that hands the rest to the browser without logging errors: `abort(browser('server render timed out'))` on the stream from `renderToPipeableStream` / `renderToReadableStream` (or pass `browser()` as the `AbortController` reason). Full detail and migration table: [Browser-only SSR reference](references/browser-ssr.md).

## Trusted Types

React no longer coerces prop values to strings before handing them to DOM sinks, so `TrustedHTML`, `TrustedScript`, and `TrustedScriptURL` objects pass through intact. No React configuration is needed.

```js
const policy = window.trustedTypes?.createPolicy('app', {
  createHTML: input => sanitize(input),   // your sanitizer
});
<div dangerouslySetInnerHTML={{ __html: policy ? policy.createHTML(raw) : sanitize(raw) }} />
```

Enforce with `Content-Security-Policy: require-trusted-types-for 'script'; trusted-types app`. DOMPurify's `RETURN_TRUSTED_TYPE: true` returns `TrustedHTML` directly through its own policy named `dompurify`, which the `trusted-types` directive must also allow. Audit any code that pre-stringifies (`'' + value`, `String(value)`, template literals) before `dangerouslySetInnerHTML`, `<script>` `src`, or iframe `srcdoc`; under enforcement the browser rejects plain strings.

## Context rendered directly in Server Components

Server Components still cannot `createContext` or read Context, but they can render one imported from a `'use client'` module:

```js
// user-context.js
'use client';
import { createContext } from 'react';
export const UserContext = createContext(null);

// layout.js (Server Component)
import { UserContext } from './user-context';
export async function Layout({ children }) {
  const currentUser = await getCurrentUser();
  return <UserContext value={currentUser}>{children}</UserContext>;
}
```

Delete pass-through `*Provider` components that existed only for this. The `value` must be serializable (it crosses the RSC boundary). Keep a Provider component only when it owns client state or logic.

## Other 19.3 behavior to rely on

- Transitions render independently; a slow transition no longer delays unrelated ones. Wrap more updates in `startTransition` without fearing entanglement.
- Strict Mode double-invokes Effects during hydration too, so SSR-only effects must be idempotent.
- New dev warning for `use()` gated on cache state. Always `return use(promise)`; never `if (!cache.value) use(cache.promise)`. For synchronous renders when data is already available, hand `use` a promise with `status = 'fulfilled'` and `value` set (or `'rejected'` and `reason`).
- `useDeferredValue` no longer gets stuck on stale values; context propagates into Suspense fallbacks; `useEffectEvent` reads fresh values inside `memo`/`forwardRef`. Remove workarounds for these.
- `useSyncExternalStore` catches mutations that happened while an `<Activity>` was hidden.
- react-dom: `onFullscreenChange` / `onFullscreenError` props (drop manual `fullscreenchange` listeners); `submit` events expose `submitter`; `onReset` fires when React auto-resets a form after a Server Action (use it to clear local state); `resize`-driven updates batch to the next frame (drop manual rAF throttling); `fetchPriority` on module resources; `credentialless` on `<iframe>`; `maskType` on SVG; `defaultValue` on `type="number"` inputs matches other inputs.
- RSC: `<Activity>` works through Flight; `Error.cause` and `AggregateError.errors` reach the client for richer error UI.
- `useActionState` errors now say "action state" (search for "form state" in error handling).

## Legacy to replace when on 19.3

| Legacy | Replacement |
|---|---|
| `typeof window !== 'undefined'` branches, `useEffect(() => setMounted(true))`, `useIsClient`, `useHydrated`, `dynamic(() => ..., { ssr: false })`, `<ClientOnly>` | `use(browser())` under Suspense |
| `suppressHydrationWarning` on locale/timezone/date text | render a server-safe default or `use(browser())` |
| `document.startViewTransition` in React apps | `<ViewTransition>` + `startTransition` |
| `AnimatePresence`, `react-transition-group`, AutoAnimate for enter/exit/reorder | `<ViewTransition>` (keep the library for gestures, springs, scroll-linked, or non-DOM) |
| Wrapper `<div ref>` added only for listeners, observers, focus, or measurement | `<Fragment ref>` |
| `forwardRef` refactors of third-party components to reach their DOM | `<Fragment ref>` around them |
| `Provider` components that only forward a server value into Context | render the Context from the Server Component |
| `String(value)` before `dangerouslySetInnerHTML` under Trusted Types CSP | pass the `TrustedHTML` object |

## References

- [View Transitions reference](references/view-transitions.md): sequencing, batching, Suspense placement variants, router notes, troubleshooting.
- [Fragment refs reference](references/fragment-refs.md): every `FragmentInstance` method with signatures, shared-observer and focus patterns.
- [Browser-only SSR reference](references/browser-ssr.md): `browser()` reference, `onBrowserBailout`, abort, migration recipes.
- Upstream: [React 19.3 post](https://react.dev/blog/2026/09/09/react-19-3), [`<ViewTransition>`](https://react.dev/reference/react/ViewTransition), [`addTransitionType`](https://react.dev/reference/react/addTransitionType), [`<Fragment>`](https://react.dev/reference/react/Fragment), [`browser`](https://react.dev/reference/react-dom/browser), [`<Suspense>`](https://react.dev/reference/react/Suspense).
