# Partial pre-rendering reference

Companion to `SKILL.md`. Partial pre-rendering (PPR) renders the static part of a page once, stores the HTML plus a `postponed` state, and per request finishes only the dynamic parts. Frameworks (Next.js PPR) do this for you; use these APIs when building a custom server, static generator, or edge runtime.

## API matrix

| Step | Web Streams (edge, Deno, Node 18+) | Node Streams (fastest in Node, supports compression) |
|---|---|---|
| Prerender, stop at dynamic holes | `prerender(node, opts)` from `react-dom/static` -> `{ prelude, postponed }` | `prerenderToNodeStream(node, opts)` from `react-dom/static` -> `{ prelude, postponed }` |
| Resume to a streaming response | `resume(node, postponed, opts)` from `react-dom/server` -> `ReadableStream` with `.allReady` | `resumeToPipeableStream(node, postponed, opts)` from `react-dom/server` -> `{ pipe, abort }` |
| Resume to static HTML (SSG / ISR) | `resumeAndPrerender(node, postponed, opts)` from `react-dom/static` -> `{ prelude, postponed }` | `resumeAndPrerenderToNodeStream(node, postponed, opts)` from `react-dom/static` |

`postponed` is `null` when the prerender completed with nothing left to resume; then `prelude` is the whole page and no resume step is needed.

## Flow

1. Mark dynamic content with `<Suspense>` and make it suspend during prerender (read request data through a promise that is not resolved at build time; `use(cookies)`, `use(session)`, a data loader that throws/suspends without a request).
2. Prerender with an `AbortSignal`. Abort as soon as the static work is done (a macrotask `setTimeout(..., 0)` if all static data resolves synchronously or in microtasks; otherwise a budget like a few hundred ms). Every Suspense boundary still pending at abort is emitted as its fallback and recorded in `postponed`.
3. Persist `prelude` (as HTML text) and `postponed` (JSON) together, keyed by route.
4. Per request: write `prelude` to the response, then run `resume` with the same element and the loaded `postponed`, providing request data, and pipe its output after the prelude. For static regeneration, run `resumeAndPrerender` instead and store the resulting `prelude` as the final HTML.
5. Client: `hydrateRoot(document, <App />)` as usual.

Web Streams example:

```js
import { prerender, resumeAndPrerender } from 'react-dom/static';
import { resume } from 'react-dom/server';

class Postponed extends Error {}

export async function buildShell(route) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(new Postponed()), 300);
  const { prelude, postponed } = await prerender(<App route={route} />, {
    signal: controller.signal,
    bootstrapScripts: [assets['main.js']],
    identifierPrefix: 'app',
    onError(error) {
      if (!(error instanceof Postponed)) console.error(error);
    },
  });
  await kv.set(`shell:${route}`, { html: await streamToString(prelude), postponed });
}

export async function handle(request) {
  const { html, postponed } = await kv.get(`shell:${route(request)}`);
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  await writer.write(new TextEncoder().encode(html));
  writer.releaseLock();
  if (postponed) {
    // No nonce here: the prerender above emitted bootstrapScripts, so per-request nonces cannot apply
    const rest = await resume(<App route={route(request)} />, postponed);
    rest.pipeTo(writable);
  } else {
    writable.close();
  }
  return new Response(readable, { headers: { 'content-type': 'text/html' } });
}
```

Node Streams example (per request):

```js
import { resumeToPipeableStream } from 'react-dom/server';

response.setHeader('content-type', 'text/html');
response.write(shell.html);
const { pipe, abort } = resumeToPipeableStream(<App />, shell.postponed, {
  onShellReady() { pipe(response); },
  onShellError(err) { response.statusCode = 500; response.end(fallbackHtml); },
  onError(err) { log(err); },
});
setTimeout(() => abort(), 10_000);    // hand remaining boundaries to the client
```

## Rules and caveats

- The element passed to `resume*` must produce the same tree as the prerender. `resume` re-renders from the root and skips only components that fully finished prerendering (component and all descendants). Non-deterministic rendering between the two phases breaks hydration.
- `bootstrapScripts`, `bootstrapScriptContent`, `bootstrapModules`, `identifierPrefix`, `importMap` belong to `prerender`. `resume*` does not accept them; the prefix is carried in `postponed`. If you need per-request bootstrap content, write it into the stream manually.
- `nonce` cannot be given to `prerender` (a CSP nonce must be unique per request; baking it into cached HTML is insecure). Pass `nonce` to `resume` only if `prerender` emitted no scripts; otherwise use hashes or `strict-dynamic` for the cached shell scripts.
- Static data must resolve before the abort; anything still pending is treated as dynamic and moves to the resume phase. Pick the abort timing deliberately.
- Passing an abort reason: the reason is surfaced to `onError`. Use a sentinel class so real errors still log.
- `prerender` waits for all non-aborted Suspense content (it does not stream). `resume` streams like `renderToReadableStream`; `await stream.allReady` for crawlers.
- Suspense boundaries can nest: an outer boundary can be static while an inner one postpones.
- `browser()` bailouts (19.3) also work inside `resume*`/`prerender` via `onBrowserBailout`.
- Server Components: run Flight first and feed the RSC payload into these Fizz APIs, as frameworks do. PPR is an HTML-level concept; it does not by itself cache RSC payloads.

## Web Streams in Node (19.2)

`renderToReadableStream` and `prerender` now run in Node.js without polyfills, so edge-oriented code can be shared. For production Node servers keep `renderToPipeableStream`/`prerenderToNodeStream`/`resumeToPipeableStream`: Node streams are faster and integrate with `zlib` compression middleware, whereas Web Streams in Node do not compress by default and can lose the benefits of streaming.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `postponed` is always `null` | nothing suspended before abort; the dynamic data resolved synchronously or is fetched in Effects. Make it suspend during prerender |
| Everything postpones, prelude is just fallbacks | abort fired before static data resolved; extend the budget or make static data synchronous/cached |
| Hydration mismatch after resume | different tree between prerender and resume (env flags, `Date.now()`, random IDs, different `identifierPrefix`) |
| Scripts missing on the resumed page | `bootstrapScripts` was passed to `resume`; move to `prerender` |
| CSP blocks inline scripts | nonce was not applied; ensure `resume` gets `nonce` and the prelude has no nonce-requiring scripts, or use hashes |
| Response hangs | prelude was not flushed before resume, or `pipe` was never called in `onShellReady` |
