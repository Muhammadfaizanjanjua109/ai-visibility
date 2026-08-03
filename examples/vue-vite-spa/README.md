# Vue (Vite SPA) Integration Example

Verified against Vite 8.2, Vue 3.5, @unhead/vue 3.2, `ai-visibility` 0.3.1.

## Read this first: what a pure client SPA can and can't do

**This package is server-side.** It detects crawlers from request headers,
serves optimized HTML, and generates files at request time. None of that
exists once your app is a static bundle with no server behind it.

A Vite SPA with no server (deployed as static files to Vercel/Netlify/S3/a
CDN, no functions) **cannot run `ai-visibility`'s middleware or bot
detection at all** — there's no request to detect a crawler on, and no
server-side code runs per-visit. If you install this expecting the
middleware to spring into action, nothing will happen, and that's not a bug.

What a client SPA genuinely *can* do, and what this example does:

1. **Generate `robots.txt` / `llms.txt` at build time** using
   `ai-visibility/generators`, written straight into `dist/` via a Vite
   plugin's `closeBundle` hook.
2. **Inject JSON-LD into the built `index.html` at build time** (this
   example's `transformIndexHtml` hook) — this is what actually reaches
   crawlers that don't execute JavaScript, since it lands in the static
   HTML your CDN serves.
3. Optionally, inject *additional* schema client-side with `useHead()` for
   things that are genuinely dynamic per route (a product page fetched after
   navigation, say) — but that only reaches crawlers that run your JS.
   `App.vue` demonstrates this with the caveat stated inline.

If you need real crawler detection, server-rendered optimized HTML, or
crawler-visit logging, you need an actual server behind the app — see the
[Nuxt example](../nuxt-app) (Nitro) or the
[React Router example](../react-router-app) (any Node server) for what that
looks like, or deploy this SPA behind a thin Express/Workers layer that at
least fronts the static files.

## Files

```
vite.config.ts   # build-time robots.txt/llms.txt + index.html JSON-LD injection
src/main.ts      # @unhead/vue v3 setup (createHead from '/client')
src/App.vue      # client-side JSON-LD via useHead(), with the caveat above
```

## Setup

```bash
npm install ai-visibility @unhead/vue
npm run build
```

## Verifying it

```bash
cat dist/robots.txt
cat dist/llms.txt
grep 'application/ld+json' dist/index.html   # WebSite schema, present pre-hydration
```

One thing worth knowing: `ai-visibility/schema`'s `fromHTML()` lazily
`import()`s `cheerio` — if you never call `fromHTML()`, your bundler will
still emit a separate chunk for it (code-split, since it's a dynamic
import), but it won't be fetched by the browser unless `fromHTML()` actually
runs. Confirmed by inspecting the built output: the chunk exists on disk,
isn't referenced from `index.html`'s eager script tags, and isn't pulled
into the main entry chunk.

## Related docs

- [Framework Integration Guide](../../docs/framework-integration.md)
- [API Reference](../../docs/api-reference.md)
