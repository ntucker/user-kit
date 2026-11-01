# `<ViewTransition>` reference

Companion to `SKILL.md`. Read when building anything beyond a simple enter/exit, or when an animation does not fire.

## What React does under the hood

React applies `view-transition-name` as an inline style on the nearest DOM node(s) inside the boundary, only at the moment that boundary participates in an animation. Sibling DOM nodes under one boundary get suffixed names but behave as one unit. Then React itself calls `document.startViewTransition` and, inside the update callback:

1. Applies DOM mutations and runs `useInsertionEffect`.
2. Waits for fonts to load (up to a timeout, about 500ms).
3. Runs `componentDidMount` / `componentDidUpdate` / `useLayoutEffect` / refs.
4. Waits for any pending Navigation API navigation to finish (so scroll restoration lands inside the animation).
5. Measures layout to decide which boundaries animate.

After the browser's `ready` promise resolves React removes the `view-transition-name`s and calls `onEnter` / `onExit` / `onUpdate` / `onShare`. `useEffect` runs after the `finished` promise so it does not compete with the animation (unless another `setState` forces it earlier).

Consequences:

- If another React VT is running, the next waits; updates that arrive meanwhile are batched. A to B running, then C and D arrive: the second animation goes B to D.
- Anything else on the page calling `startViewTransition` gets interrupted by React. Migrate it.
- `flushSync` in the middle skips the animation.
- `getSnapshotBeforeUpdate` runs before `startViewTransition`.

## Activation checklist

An animation did not fire. Check, in order:

1. Was the state change inside `startTransition`, `useTransition`, a Suspense reveal, `useDeferredValue`, or an `<Activity>` toggle within a transition? Bare `setState` and event-handler updates outside a transition never animate.
2. For enter/exit/reorder: is `<ViewTransition>` the first thing rendered in the inserted/removed subtree, with no DOM element above it inside that subtree? `<li><ViewTransition>` fails; `<ViewTransition><li>` works.
3. Did `default="none"` turn off the trigger you expected? Every trigger not listed is off.
4. Did a Transition Type map to `"none"`? Any `"none"` wins over other matches.
5. Was `flushSync` called during the commit? Was it a legacy `popstate` navigation (skipped by design)?
6. Is the environment the DOM? React Native and other renderers are not supported yet.
7. Console error "There are two `<ViewTransition name=...>` components with the same name mounted at the same time": a development-only `console.error` (once per name); in any build the browser aborts the view transition. Include an id in `name`.

## Class-prop semantics in full

Each of `default`, `enter`, `exit`, `update`, `share` accepts:

- `"auto"`: browser default (cross-fade, plus group position/size interpolation).
- `"none"`: no `view-transition-name` assigned for this trigger, so nothing animates and the boundary does not snapshot.
- `"some-class"`: React adds that class to the boundary's pseudo-elements for this trigger.
- `{ [type]: value, default: value }`: matched against `addTransitionType` types active in the transition. All matching types' classes are joined; if none match, `default` is used; if any matched value is `"none"` the boundary is disabled.

Resolution order for a trigger (from `getViewTransitionClassName` in the reconciler): the specific prop (`enter`, etc.) if it resolves to a value, else `default`; a resolved `"auto"` means no class is added and the browser default runs.

Recommended baseline for most boundaries: be explicit and opt in only what you want, e.g. `default="none" enter="..." exit="..."`, or for Suspense wrappers `update="auto" default="none"`.

## CSS recipes

Target pseudo-elements by class, never by generated names.

```css
/* global timing */
::view-transition-old(*), ::view-transition-new(*) {
  animation-duration: 250ms;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

/* slide family, parameterized by --offset */
::view-transition-new(.from-right) { --offset: 100%;  animation-name: slide-in; }
::view-transition-new(.from-left)  { --offset: -100%; animation-name: slide-in; }
::view-transition-old(.to-right)   { --offset: 100%;  animation-name: slide-out; }
::view-transition-old(.to-left)    { --offset: -100%; animation-name: slide-out; }
@keyframes slide-in  { from { transform: translateX(var(--offset)); opacity: 0; } }
@keyframes slide-out { to   { transform: translateX(var(--offset)); opacity: 0; } }

/* fade + rise */
::view-transition-new(.fade-up)   { animation: fade-up-in 200ms ease-out; }
::view-transition-old(.fade-down) { animation: fade-down-out 150ms ease-in; }
@keyframes fade-up-in    { from { opacity: 0; transform: translateY(8px); } }
@keyframes fade-down-out { to   { opacity: 0; transform: translateY(8px); } }

/* slow the default cross-fade */
::view-transition-old(.slow-fade), ::view-transition-new(.slow-fade) { animation-duration: 500ms; }

/* shared-element morph: let the group interpolate, tune its easing */
::view-transition-group(.morph) { animation-duration: 300ms; animation-timing-function: ease-in-out; }

/* type-scoped styling without classes */
:root:active-view-transition-type(next) {
  &::view-transition-new(*) { animation-name: slide-in; --offset: 100%; }
}

/* mandatory */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-image-pair(*),
  ::view-transition-old(*), ::view-transition-new(*) { animation: none !important; }
}
```

Pseudo-element roles: `::view-transition-group(.x)` is the moving/resizing container; `::view-transition-image-pair(.x)` holds both snapshots; `::view-transition-old(.x)` is a static snapshot of the outgoing state; `::view-transition-new(.x)` is a live snapshot of the incoming state (a replaced element, not the DOM node itself).

## Event-prop semantics

```jsx
<ViewTransition
  onEnter={(instance, types) => cleanup}
  onExit={(instance, types) => cleanup}
  onUpdate={(instance, types) => cleanup}
  onShare={(instance, types) => cleanup}
/>
```

- `instance.old`, `instance.new`, `instance.group`, `instance.imagePair`: animatable pseudo-element handles; call `.animate(keyframes, options)` on them. `instance.name`: the boundary's `view-transition-name`.
- `types`: array of active Transition Types (empty if none).
- Exactly one event fires per boundary per transition. `onShare` takes precedence over `onEnter`/`onExit`.
- Return a cleanup that cancels the animation; React calls it when the VT finishes or is interrupted. Omitting it leaks animations on interruption.
- Events run after React computed the default animations, so CSS classes and JS can be combined (CSS cross-fade plus JS slide, for example).

```jsx
const SLIDE_IN = [{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }];
<ViewTransition
  onEnter={(inst, types) => {
    const a = inst.new.animate(SLIDE_IN, { duration: types.includes('fast') ? 150 : 400, easing: 'ease-out' });
    return () => a.cancel();
  }}
  onExit={(inst) => {
    const a = inst.old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 });
    return () => a.cancel();
  }}>
```

## Transition Types

```js
startTransition(() => {
  addTransitionType('nav-forward');
  addTransitionType('fast');       // multiple allowed; all collected
  navigate(next);
});
```

- Types from concurrently batched transitions are merged.
- Types reset after each commit. A Suspense fallback committed in the transition carries them; the eventual content reveal does not.
- Three consumers: class-prop objects (`enter={{ 'nav-forward': 'from-right' }}`), CSS `:active-view-transition-type(...)`, and the `types` argument of event props.

## Suspense placement variants

Update (cross-fade fallback into content; same name for both):

```jsx
<ViewTransition update="auto" default="none">
  <Suspense fallback={<Skeleton />}><Content /></Suspense>
</ViewTransition>
```

Exit/enter (fallback exits, content enters; two names):

```jsx
<Suspense fallback={<ViewTransition exit="fade-out"><Skeleton /></ViewTransition>}>
  <ViewTransition enter="fade-up"><Content /></ViewTransition>
</Suspense>
```

Principles for good loading UX: fallback appears immediately without animation; fallback to content animates; content that does not suspend (cached) appears immediately without animation. `update="auto" default="none"` on the wrapper implements exactly this.

Resource waiting during a VT update: new fonts (timeout about 500ms), visible `<img>`s inside the boundary (timeout; `onLoad` on an image opts it out), and `<link rel="stylesheet" precedence>` (blocks the Suspense boundary itself, VT or not). Declare fonts via `<style href={url} precedence="default">{`@font-face { ... }`}</style>` inside the suspending component so React can track them.

## Shared elements

- Only reason to set `name`. Must be unique among mounted boundaries at any instant, so derive from an id.
- Pair forms when a named boundary is in a deleted subtree and the same name is in an inserted subtree within one transition. It can be arbitrarily deep; it does not need to be first in the subtree.
- If the transition first shows a Suspense fallback and only later mounts the new name, no share animation runs. Keep destination data warm (prefetch on hover/focus, cache) so the destination commits in the same transition.
- Group easing/duration: style `::view-transition-group(.your-share-class)` with `share="your-share-class"`.

## Lists

- Wrap each item: `<ViewTransition key={item.id}>` immediately inside the list container, before the item's own DOM.
- Reorder/sort/filter inside `startTransition`. Items get `update` (move), removed items `exit`, added `enter`.
- For long lists, consider `default="none" update="auto"` to avoid enter/exit noise on paging.
- Do not give list items a static `name`; duplicates log a development error and the browser aborts the transition.

## Activity

```jsx
<Activity mode={visible ? 'visible' : 'hidden'}>
  <ViewTransition enter="auto" exit="auto" default="none"><Panel /></ViewTransition>
</Activity>
```

Hidden to visible triggers `enter`; visible to hidden triggers `exit`; `Panel` state persists. Toggle `mode` inside `startTransition`. Also useful to pre-render the destination of a shared-element transition.

## Routers

- React waits for a pending Navigation API navigation before measuring, so scroll restoration lands inside the animation. If the navigation is blocked on React, unblock it from `useLayoutEffect`; `useEffect` deadlocks.
- Legacy `popstate` (`history.back()` / back button) must finish synchronously for scroll/form restoration, so React skips VT animations for those. Use a Navigation-API-based router to animate back navigations.
- Router transitions must be wrapped in `startTransition` for any boundary to animate. Most Suspense-aware routers already do this.
- Use `addTransitionType('nav-back' | 'nav-forward')` in the router's navigate call so pages can pick direction.

## Anti-patterns

- Wrapping the whole app in a bare `<ViewTransition>`: every transition cross-fades everything. Scope boundaries; use `update="none"` to fence children.
- Wrapping a boundary in an extra `<div>` "for layout" and losing enter/exit.
- Setting `name` on non-shared boundaries "for CSS targeting". Use classes.
- Calling `document.startViewTransition` in a click handler alongside React state.
- Animating everything inside Suspense (cached content should not animate).
- Forgetting `prefers-reduced-motion`.
- Forgetting the cleanup return in event props.
