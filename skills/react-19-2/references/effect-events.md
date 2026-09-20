# `useEffectEvent` reference

Companion to `SKILL.md`.

```js
import { useEffectEvent } from 'react';
const onEvent = useEffectEvent(callback);   // same signature as callback; reads latest render values when called
```

Effect Events are the "event" part of an Effect: logic that fires because something happened inside the Effect (a connection opened, a timer ticked, a listener fired) but that should not decide when the Effect re-synchronizes.

## Reactive vs non-reactive

Ask, for each value the Effect reads: "if this changes, should the external system be re-synchronized (disconnect/reconnect, clear/restart, unsubscribe/resubscribe)?"

| Value | Answer | Where it lives |
|---|---|---|
| `roomId`, `url`, `channel`, `delay`, `enabled` | yes | Effect dependency |
| `theme`, `muted`, `count`, `user`, `onChange` prop, `selectedIds`, `locale` for a toast | no, just read when it happens | inside `useEffectEvent` |

If the answer is "yes but I do not want the flicker", the fix is elsewhere (memoize the dependency, split the Effect), not an Effect Event.

## Constraints

- Declare at the top level of a component or custom Hook (it is a Hook).
- Call the result only from Effect bodies (`useEffect`, `useLayoutEffect`, `useInsertionEffect`) or from other Effect Events of the same component. Calling during render throws `A function wrapped in useEffectEvent can't be called during rendering`.
- Do not pass it to children, other Hooks, or event handlers. Plugin v7.0.1+ also rejects inline `useEffectEvent(...)` values as JSX props.
- Do not add it to dependency arrays. Identity intentionally changes every render.
- Works inside Effects that were set up with `[]` deps: the Effect Event still sees fresh values on every call.
- Effect Events created in a custom Hook see the latest values of the component that called the Hook (via the callback closure).

## Migration recipes

Latest-ref pattern:

```jsx
// Before
const latestOnMessage = useRef(onMessage);
useEffect(() => { latestOnMessage.current = onMessage; });
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = e => latestOnMessage.current(e);
  return () => ws.close();
}, [url]);

// After
const handleMessage = useEffectEvent(e => onMessage(e));
useEffect(() => {
  const ws = new WebSocket(url);
  ws.onmessage = e => handleMessage(e);
  return () => ws.close();
}, [url]);
```

Disabled lint rule:

```jsx
// Before
useEffect(() => {
  const id = setInterval(() => setCount(count + step), 1000);
  return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// After
const onTick = useEffectEvent(() => setCount(count + step));
useEffect(() => {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}, []);
```

`useLatest` / `useEvent` / `useEventCallback` polyfills (from usehooks-ts, MUI, ahooks): replace uses that are only called from Effects with `useEffectEvent`. Keep the polyfill (or `useCallback`) where the stable function is passed to a child or used in a JSX handler; Effect Events are not allowed there.

Custom Hooks that accept a callback:

```jsx
function useInterval(callback, delay) {
  const onTick = useEffectEvent(callback);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(onTick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

function useEventListener(target, type, handler, options) {
  const onEvent = useEffectEvent(handler);
  useEffect(() => {
    if (!target) return;
    target.addEventListener(type, onEvent, options);
    return () => target.removeEventListener(type, onEvent, options);
  }, [target, type]);   // options intentionally excluded if it is an inline object; hoist it or split fields
}
```

Observers reading current state:

```jsx
const onResize = useEffectEvent(entries => {
  if (!isMeasuring) return;
  setSize(entries[0].contentRect);
});
useEffect(() => {
  const ro = new ResizeObserver(onResize);
  ro.observe(ref.current);
  return () => ro.disconnect();
}, []);
```

Third-party library callbacks (map, chart, editor, player):

```jsx
const onMarkerClick = useEffectEvent(id => onSelect(id, currentFilter));
useEffect(() => {
  const map = createMap(container.current, { center });
  map.on('markerclick', onMarkerClick);
  return () => map.destroy();
}, [center]);
```

Analytics / logging:

```jsx
const logPageView = useEffectEvent(() => track('page_view', { url, userId: user?.id, experiment }));
useEffect(() => { logPageView(); }, [url]);   // one log per URL, always with current context
```

## Do not use it for

- Skipping a dependency that should re-run the Effect (`pageUrl` in a visit logger). That hides bugs.
- Handlers passed to children or attached in JSX. Use a regular function or `useCallback`.
- Values read during render. Read them directly.
- Replacing `useCallback` for memoization. It has no stable identity.

## Lint and runtime messages

| Message | Fix |
|---|---|
| `Functions returned from useEffectEvent must not be included in the dependency array` | remove it from deps |
| `... is a function created with React Hook "useEffectEvent", and can only be called from Effects and Effect Events` | you called it from render, an event handler, or passed it to a child; use a normal function there |
| `A function wrapped in useEffectEvent can't be called during rendering` (runtime) | move the call into an Effect |
| Rules-of-hooks error on conditional `useEffectEvent` | hoist to top level; the callback can branch internally |

Requires `eslint-plugin-react-hooks` >= 6.1 for full enforcement (`rules-of-hooks` and `exhaustive-deps` both know about Effect Events). v6 uses flat config for `recommended`; eslintrc users take `recommended-legacy`.

## TypeScript

`useEffectEvent<T extends Function>(callback: T): T` in `@types/react` 19.2+. The returned function keeps the callback's parameter and return types. If types are missing, update `@types/react`/`@types/react-dom` alongside React.
