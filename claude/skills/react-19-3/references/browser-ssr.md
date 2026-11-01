# `browser()` reference (react-dom)

Companion to `SKILL.md`. `browser` marks a component as browser-only during server rendering, using Suspense as the mechanism.

```js
import { use } from 'react';
import { browser } from 'react-dom';

use(browser(reason?))
```

## Behavior

| Environment | `use(browser())` |
|---|---|
| Server render (`renderToPipeableStream`, `renderToReadableStream`, `prerender*`, framework SSR) | Suspends. The nearest `<Suspense>` fallback is emitted in the HTML. No `onError` / `onRecoverableError` call; reported to `onBrowserBailout` if that option is provided (accepted by the `react-dom/server` streaming APIs and the `react-dom/static` `prerender*` APIs; legacy `renderToString` still emits the fallback but has no such option). |
| Client render and hydration | Returns `undefined` synchronously. Component continues. The boundary's content client-renders once into the fallback slot; no mounted-flag re-render, no mismatch. |
| No `<Suspense>` ancestor on the server | Server render fails, reported via the renderer's normal error callbacks. |

`reason` (optional): a string, or a function returning any value (call it lazily; `() => new Error('...')` gives the cause its own stack). It becomes the `cause` on the `Error` handed to `onBrowserBailout`. Functions are called only on the server, once per encounter. Nothing about the reason is serialized into HTML.

Caveats:

- Client Components only (`'use client'`). It is not supported in Server Components.
- Pass the return value to `use`. `browser()` alone does nothing; throwing it is wrong.
- Conditional-safe like other `use` calls: after an early return, inside `if`, inside a custom hook.

## Server reporting

```js
const { pipe, abort } = renderToPipeableStream(<App />, {
  onShellReady() { pipe(response); },
  onBrowserBailout(error, errorInfo) {
    // error.cause === the reason you passed (if any)
    // errorInfo.componentStack shows where the bailout happened
    metrics.increment('ssr.browser_bailout', { component: topFrame(errorInfo.componentStack) });
  },
});
```

Use this to keep an eye on how much of the page is being deferred to the browser. It is the only channel for bailouts; `onError` stays clean.

## Server timeouts that hand off to the browser

Pass `browser(reason)` as the abort reason to stop waiting on slow Suspense content without treating it as an error. Pending boundaries stay as fallbacks in the HTML and render in the browser; each is reported to `onBrowserBailout`.

```js
const { pipe, abort } = renderToPipeableStream(<App />, {
  onShellReady() {
    pipe(response);
    setTimeout(() => abort(browser('server render timed out')), 10_000);
  },
});

// Web-stream APIs: pass it through an AbortController
const controller = new AbortController();
setTimeout(() => controller.abort(browser('timed out')), 10_000);
const stream = await renderToReadableStream(<App />, { signal: controller.signal });
```

## Patterns

Bail out only when the server has nothing meaningful to render:

```js
export function useTimeZone(defaultTimeZone) {
  if (defaultTimeZone !== undefined) return defaultTimeZone;   // server renders this
  use(browser('no default time zone was provided'));
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
```

Suspense-enabled data hook that SSRs only when seeded (RSC loader, `getServerSideProps`, route loader):

```js
function useBrowserQuery(query, options) {
  if (options.initialData === undefined) use(browser('useBrowserQuery: no initialData'));
  return useQuery(query, options);
}
```

Browser storage, media queries, device APIs:

```jsx
'use client';
function ThemeFromSystem() {
  use(browser('matchMedia'));
  const dark = useSyncExternalStore(
    cb => { const m = matchMedia('(prefers-color-scheme: dark)'); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
    () => matchMedia('(prefers-color-scheme: dark)').matches,
  );
  return <Icon name={dark ? 'moon' : 'sun'} />;
}
```

Note: if a `useSyncExternalStore` store can provide a sensible `getServerSnapshot`, prefer that and skip `browser()`; the content then ships in the HTML.

Third-party browser-only widgets (maps, charts, editors that touch `window` at import time): keep `React.lazy`/dynamic import for code splitting, and add `use(browser())` in the wrapper so SSR emits the fallback instead of crashing or requiring `ssr: false`.

Place the `<Suspense>` boundary tightly around the browser-only part so the rest of the page still server-renders. Reuse the same skeleton the client would show for loading so there is no visual jump at hydration.

## Migration table

| Before | After |
|---|---|
| `const isBrowser = typeof window !== 'undefined'; if (!isBrowser) return null;` | `use(browser())` under `<Suspense fallback={null}>` (or a skeleton) |
| `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), []); if (!mounted) return <Skeleton/>;` | `use(browser())`; the skeleton becomes the Suspense fallback; no effect-triggered re-render |
| `useIsClient()`, `useHydrated()`, `useIsMounted()` for rendering decisions | `use(browser())` |
| `dynamic(() => import('./Widget'), { ssr: false })` | `lazy(() => import('./Widget'))` inside a component that calls `use(browser())`, under Suspense |
| `<ClientOnly>{() => ...}</ClientOnly>` wrappers | `use(browser())` inside the child |
| Throwing an error on the server to force a fallback (`if (typeof window === 'undefined') throw Error(...)`) | `use(browser())`; no error noise, reported via `onBrowserBailout` |
| `suppressHydrationWarning` on timezone/locale/`Date.now()` text | Render a server-safe default (event tz, server-formatted date) or `use(browser())` for the client-specific value |
| Framework "no SSR" component options | `use(browser())` (framework-agnostic) |

## Trade-offs to state when suggesting it

- Bailed-out content is not in the HTML: no SEO for it, later LCP if it is above the fold. Pair with a well-sized fallback to avoid layout shift.
- It does not fix code that touches `window` at module evaluation time; keep those imports lazy.
- It is a rendering-time opt-out only; effects already only run in the browser.
