# Fragment refs / `FragmentInstance` reference

Companion to `SKILL.md`. `import { Fragment } from 'react'` and pass `ref`; the `<>...</>` shorthand cannot take `ref` or `key`.

```jsx
const ref = useRef(null);
<Fragment ref={ref}>{children}</Fragment>
// ref.current is a FragmentInstance (or null before mount / after unmount)
```

Ref callbacks work too and receive the `FragmentInstance`.

## Which nodes are targeted

Given:

```jsx
<Fragment ref={ref}>
  <div id="A" />
  <Wrapper>            {/* component, looked through */}
    <div id="B"><div id="C" /></div>
  </Wrapper>
  <div id="D" />
  text
</Fragment>
```

First-level host children are `A`, `B`, `D`. `C` is inside DOM node `B` and is not targeted. Text nodes are skipped by observers (dev warning if only text). `focus`/`focusLast` differ: they search every nested descendant depth-first.

Membership is live: children added or removed by later renders are automatically attached/detached for listeners and observers (`commitNewChildToFragmentInstance` / `deleteChildFromFragmentInstance` in `react-dom`). On removal, an `IntersectionObserver` target stays observed until the observer's next delivery so the callback still receives an `isIntersecting: false` entry for it; `ResizeObserver` targets are unobserved immediately.

## Methods

| Method | Signature | Returns | Notes |
|---|---|---|---|
| `addEventListener` | `(type, listener, options?: boolean \| AddEventListenerOptions)` | `undefined` | Applied to each first-level DOM child; capture option normalized per DOM spec. Not applied while inside a hidden `<Activity>`; applied when it becomes visible. |
| `removeEventListener` | `(type, listener, options?)` | `undefined` | Must match `addEventListener` args. |
| `dispatchEvent` | `(event: Event)` | `boolean` (false if `preventDefault` called) | Runs listeners added via the instance; bubbles to the Fragment's parent DOM node if `event.bubbles`. |
| `focus` | `(options?: FocusOptions)` | `undefined` | First focusable descendant, depth-first. `{ preventScroll: true }` supported. |
| `focusLast` | `(options?: FocusOptions)` | `undefined` | Last focusable descendant. |
| `blur` | `()` | `undefined` | Blurs `document.activeElement` only if it is inside the Fragment. |
| `observeUsing` | `(observer: IntersectionObserver \| ResizeObserver)` | `undefined` | Observes each first-level DOM child. Same observer instance may be shared across Fragments. |
| `unobserveUsing` | `(observer)` | `undefined` | Pass the same observer instance. |
| `getClientRects` | `()` | `DOMRect[]` | One rect per first-level DOM child (flat array). |
| `getRootNode` | `(options?: { composed?: boolean })` | `Document \| ShadowRoot \| FragmentInstance` | Returns the instance itself when there is no parent DOM node. |
| `compareDocumentPosition` | `(otherNode: Node)` | bitmask | Same flags as `Node.compareDocumentPosition`. Empty Fragments and portal children add `DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC`. |
| `scrollIntoView` | `(alignToTop?: boolean)` | `undefined` | `true`/omitted aligns first child to top; `false` aligns last child to bottom. An options object throws. Empty Fragment scrolls nearest sibling/parent instead. |

Each first-level DOM child also gets a `reactFragments: Set<FragmentInstance>` property listing the Fragments that own it.

## Patterns

Click delegation over a group (no wrapper, no per-child `onClick`):

```jsx
function ClickGroup({ onClick, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const inst = ref.current;
    if (!inst) return;
    inst.addEventListener('click', onClick);
    return () => inst.removeEventListener('click', onClick);
  }, [onClick]);
  return <Fragment ref={ref}>{children}</Fragment>;
}
```

Focus management for a dialog or wizard step (works through fieldsets, labels, third-party inputs):

```jsx
function AutoFocusFirst({ children }) {
  const ref = useRef(null);
  useLayoutEffect(() => { ref.current?.focus({ preventScroll: true }); }, []);
  return <Fragment ref={ref}>{children}</Fragment>;
}
// focus trap edges: on Shift+Tab from first -> ref.current.focusLast(); on Tab from last -> ref.current.focus()
```

Resize tracking of a component you do not own:

```jsx
function OnResize({ onSize, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const ro = new ResizeObserver(entries => onSize(entries.map(e => e.contentRect)));
    const inst = ref.current;
    inst.observeUsing(ro);
    return () => inst.unobserveUsing(ro);
  }, [onSize]);
  return <Fragment ref={ref}>{children}</Fragment>;
}
```

Scroll a rendered section into view (anchor links, "jump to error", chat "scroll to latest"):

```jsx
useEffect(() => { if (active) ref.current?.scrollIntoView(); }, [active]);   // or scrollIntoView(false) for bottom
```

Measure a group without a wrapper (tooltips, popovers anchored to multiple siblings, selection highlights):

```js
const rects = ref.current.getClientRects();
const union = rects.reduce((u, r) => ({
  left: Math.min(u.left, r.left), top: Math.min(u.top, r.top),
  right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom),
}), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
```

One shared `IntersectionObserver` per options set, routed by `reactFragments` (impression tracking across many cards):

```jsx
const callbacks = new WeakMap();   // FragmentInstance -> callback[]
const observers = new Map();       // optionsKey -> IntersectionObserver

function sharedObserver(inst, cb, options) {
  callbacks.set(inst, [...(callbacks.get(inst) ?? []), cb]);
  const key = `${options?.rootMargin ?? '0px'}|${options?.threshold ?? 0}`;
  if (!observers.has(key)) {
    observers.set(key, new IntersectionObserver(entries => {
      for (const entry of entries) {
        for (const owner of entry.target.reactFragments ?? []) {
          for (const fn of callbacks.get(owner) ?? []) fn(entry);
        }
      }
    }, options));
  }
  return observers.get(key);
}

function Observed({ onIntersection, options, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const inst = ref.current;
    const observer = sharedObserver(inst, onIntersection, options);
    inst.observeUsing(observer);
    return () => { inst.unobserveUsing(observer); callbacks.delete(inst); };
  }, [onIntersection, options]);
  return <Fragment ref={ref}>{children}</Fragment>;
}
```

## When to still use an element ref

- You need a single specific node's full DOM API (`getBoundingClientRect`, `classList`, `animate`, `scrollTo`, input value) and you own that element.
- You need `scrollIntoView` options (`behavior: 'smooth'`, `block`).
- Listeners on nested (non-first-level) descendants; either put the Fragment closer to them or use event delegation on a real ancestor.

## Gotchas

- `ref.current` can be `null` in effects if the Fragment rendered nothing; guard it.
- Portal children count as "implementation specific" for `compareDocumentPosition`.
- Hidden `<Activity>` suppresses instance listeners until visible.
- Observers ignore text-only children; wrap text in an element if you need to observe it.
