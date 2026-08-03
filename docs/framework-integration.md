# Framework Integration Guide

`ai-visibility`'s README covers Express and Next.js. This guide covers
Nuxt, Vue, and React — and, more importantly, is honest about which of
those actually get the full feature set and which don't.

Every recipe here has a runnable, verified counterpart in
[`examples/`](../examples): [`nuxt-app`](../examples/nuxt-app),
[`vue-vite-spa`](../examples/vue-vite-spa),
[`react-vite-spa`](../examples/react-vite-spa), and
[`react-router-app`](../examples/react-router-app). Each was built,
type-checked, and served with real `curl` requests during development —
see each example's README for the exact commands.

## Read this first: this package is server-side

`ai-visibility` detects crawlers from request headers, serves optimized
HTML, and generates files at request time. None of that exists in a
client-only bundle. So the question that actually matters for your
framework isn't "does it have components" — it's **does it have a server**:

| Framework | Has a server? | What works |
|---|---|---|
| Nuxt (Nitro) | Yes | Everything — middleware, generated files, JSON-LD, HTML optimization |
| Remix / React Router (framework mode) | Yes | Everything |
| Astro (server adapter), TanStack Start, Express + React SSR | Yes | Everything (same pattern as React Router below) |
| Vue SPA (Vite, no server) | **No** | Build-time file generation + build-time JSON-LD injection only |
| React SPA (Vite/CRA, no server) | **No** | Same as Vue SPA |

If you install this package expecting middleware to run inside a Vite SPA
with no server and nothing happens, that's not a bug — there's no request
for it to run against. A client-rendered SPA has a genuine AI-visibility
problem this package can only partly solve: the fix is SSR, prerendering,
or putting a server (even a thin one — a Vercel/Netlify function, a
Cloudflare Worker, an Express wrapper) in front of the static files.

All recipes below use the [subpath exports](../README.md#package-exports)
(`ai-visibility/detector`, `/generators`, `/schema`) rather than the root
barrel — a build-time script or a Vite SPA pulling in `pino`, `cheerio`,
`chalk`, and `commander` to generate a `robots.txt` would be absurd, and
that's exactly the gap the subpath split exists to close.

---

## Nuxt

Nuxt's Nitro server gives you the real thing: request middleware, dynamic
routes, all of it. Full recipe, verified against Nuxt 4.5 / Nitro 2.13 /
H3 1.15: [`examples/nuxt-app`](../examples/nuxt-app).

**Bot detection** — Nitro uses H3's `defineEventHandler`, not Express
signatures, so `createAIMiddleware`/`optimizeResponseForAI` from
`ai-visibility/express` don't apply here. Reach for the framework-agnostic
`AIBotDetector` directly:

```ts
// server/middleware/ai-detector.ts
import { AIBotDetector } from 'ai-visibility/detector'

const detector = new AIBotDetector()

export default defineEventHandler((event) => {
  const bot = detector.detect(getHeader(event, 'user-agent') ?? '')
  event.context.aiBot = bot
  if (bot) setResponseHeader(event, 'x-ai-crawler', bot.name)
})
```

**Generated files** — server routes returning plain text:

```ts
// server/routes/robots.txt.ts
import { RobotsGenerator } from 'ai-visibility/generators'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain')
  return RobotsGenerator.allowAll({ sitemapUrl: 'https://example.com/sitemap.xml' })
})
```

**The gotcha that will actually bite you**: `nuxi init` scaffolds a
placeholder `public/robots.txt`. Nitro serves static files from `public/`
*before* dynamic server routes at the same path — that placeholder
silently shadows `server/routes/robots.txt.ts` unless you delete it. This
cost real debugging time while verifying this recipe (the generated
robots.txt looked identical between "shadowed" and "working" at a glance,
since the scaffold's placeholder happens to also read `User-Agent: *` /
`Disallow:`). Check for `public/llms.txt` too.

**JSON-LD** — `useHead()` is auto-imported by Nuxt, and since Nuxt
server-renders, this actually reaches non-JS crawlers (unlike the SPA
cases below):

```vue
<script setup lang="ts">
import { SchemaBuilder } from 'ai-visibility/schema'

useHead({
  script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(
    SchemaBuilder.website({ name: 'My App', url: 'https://example.com' })
  ) }],
})
</script>
```

**Where `detectAndOptimize()` fits**: wherever you already have a raw HTML
string in hand — a CMS-fetched page, a cached render, a static export
you're serving dynamically. It does **not** hook cleanly into Nuxt's own
Vue SSR pipeline. We tried the obvious path first (a `render:html` hook in
`nuxt.config.ts`'s `hooks` field) and it never fired — that hook has to be
registered from a Nitro plugin (`server/plugins/*.ts`) via
`nitroApp.hooks.hook('render:html', ...)` instead. Even done correctly, that
hook only exposes `html.body`/`html.head` as separate array fragments, not
one document string — `detectAndOptimize()`'s ad/tracking/script-stripping
still works on the body fragment, but its "optimized for AI crawlers"
`<head>`-comment injection is a no-op, since there's no literal `<head>` in
that fragment to anchor to. Full details and a working `render:html`-free
alternative (a resource route serving a raw HTML string) are in the
[example](../examples/nuxt-app).

## Vue (Vite SPA)

No server — see the constraint at the top of this doc. What you can
actually do, verified against Vite 8.2 / Vue 3.5 / @unhead/vue 3.2:
[`examples/vue-vite-spa`](../examples/vue-vite-spa).

**Build-time generation**, via a small Vite plugin:

```ts
// vite.config.ts
import { RobotsGenerator, LLMSTextGenerator } from 'ai-visibility/generators'
import { SchemaBuilder } from 'ai-visibility/schema'

function aiVisibilityStatic(): Plugin {
  return {
    name: 'ai-visibility-static',
    transformIndexHtml(html) {
      const schema = SchemaBuilder.website({ name: 'My App', url: 'https://example.com' })
      return html.replace('</head>', `<script type="application/ld+json">${JSON.stringify(schema)}</script></head>`)
    },
    async closeBundle() {
      fs.writeFileSync('dist/robots.txt', RobotsGenerator.allowAll({ sitemapUrl: '...' }))
      fs.writeFileSync('dist/llms.txt', await new LLMSTextGenerator({ /* ... */ }).generate())
    },
  }
}
```

This is the recommendation, not just an option: injecting JSON-LD into the
*built* `index.html` reaches crawlers that never execute JavaScript.
Client-side injection (below) doesn't.

**Client-side schema**, for things genuinely dynamic per route — current
`@unhead/vue` (v3) API, confirmed by reading the package's own type
declarations rather than assuming the old API still works: `createHead`
moved to the `/client` subpath (`import { createHead } from '@unhead/vue/client'`);
the root-level `createHead` still exists but is marked `@deprecated,
will be removed in v4`. `useHead()` itself is unchanged:

```vue
<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { SchemaBuilder } from 'ai-visibility/schema'

// Only reaches JS-executing crawlers — see the note in vite.config.ts above.
useHead({ script: [{ type: 'application/ld+json', innerHTML: JSON.stringify(
  SchemaBuilder.product({ name: 'Example Product', price: 29 })
) }] })
</script>
```

**A build-output nuance worth knowing**: `SchemaBuilder.fromHTML()` lazily
`import()`s `cheerio`. Even though nothing calls it in this example,
Rollup still emits a separate chunk for it (confirmed: ~280KB, correctly
code-split, not referenced by `index.html`'s eager `<script>` tags, not
inlined into the main entry chunk). It sits in your `dist/` folder unused
unless `fromHTML()` actually runs client-side. Harmless, but don't be
alarmed to see it there.

## React (Vite SPA)

Same shape as Vue, same no-server constraint, verified against Vite 8.2 /
React 19.2: [`examples/react-vite-spa`](../examples/react-vite-spa). The
`vite.config.ts` plugin is identical in structure (swap `@vitejs/plugin-vue`
for `@vitejs/plugin-react`).

The one difference: no `react-helmet-async` or similar needed for
client-side schema. A plain element works:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
/>
```

JSON-LD doesn't have to live in `<head>` — Google's structured-data docs
explicitly allow it anywhere in the document — so React rendering it
in-place in the component tree is entirely valid, no head-management
library required. Same caveat as Vue applies: this only reaches
JS-executing crawlers; the build-time `transformIndexHtml` injection is
what covers the rest.

## React with a server

Picked [React Router](https://reactrouter.com) in framework mode (the
Remix successor, current as of React Router 8) as the representative
example, verified end-to-end:
[`examples/react-router-app`](../examples/react-router-app). The same
pattern applies to Remix, Astro with a server adapter, TanStack Start, and
Express + React SSR — all of them hand you a request object server-side
and let you return a `Response`, which is all `ai-visibility/detector` and
`/generators` actually need.

**Bot detection**, in the root loader (runs for every request; there's no
separate middleware layer in framework-mode React Router the way Express
has one):

```tsx
// app/root.tsx
import { AIBotDetector } from 'ai-visibility/detector'

const detector = new AIBotDetector()

export function loader({ request }: Route.LoaderArgs) {
  const bot = detector.detect(request.headers.get('user-agent') ?? '')
  return { isAIBot: Boolean(bot), botName: bot?.name ?? null }
}
```

**Generated files**, as resource routes (a route module with only a
`loader`, no default component, returning a plain `Response`):

```ts
// app/routes/robots-txt.ts
import { RobotsGenerator } from 'ai-visibility/generators'

export function loader() {
  return new Response(RobotsGenerator.allowAll({ sitemapUrl: '...' }), {
    headers: { 'content-type': 'text/plain' },
  })
}
```

**A gotcha unrelated to ai-visibility**, encountered while verifying this
example: serving the production build without `NODE_ENV=production` set
explicitly for *both* the build and serve steps produced
`TypeError: dispatcher.getOwner is not a function` — a React dev/prod
build mismatch in the server bundle. Setting `NODE_ENV=production` for
both `react-router build` and `react-router-serve` resolved it
immediately. Documented in the example's README so it doesn't cost anyone
else the same half hour.

---

## Assessment: is a dedicated Nuxt/H3 adapter worth building?

Short answer: **no, not on this evidence.**

The brief for this task asked us to write the recipes first and let the
actual boilerplate answer the question, rather than debate it in the
abstract. Having done that: the entire Nuxt integration — bot-detecting
middleware, two generated-file routes, JSON-LD injection, and a
`detectAndOptimize()` example — is five small files, and none of them
contain repetitive ceremony a `createNuxtMiddleware()` helper would
meaningfully shrink. The middleware file is a three-line `AIBotDetector`
instantiation plus a `defineEventHandler` wrapper that's already about as
short as it can get; H3's own `getHeader`/`setResponseHeader` primitives
do the rest. A dedicated adapter would save perhaps three or four lines
per project, in exchange for a new subpath that's permanent API surface to
document, type, test, and keep working across H3's own version churn
(H3 is mid-major-version-transition right now — v1 stable, v2 in RC).

The counter-argument ("Nitro is a big, growing surface") is real, but it's
an argument for *documenting* the framework-agnostic pieces well — which
this guide and the `examples/nuxt-app` recipe now do — not for shipping
more code. If a genuinely awkward, repeated pattern shows up across real
Nuxt users' issues or the CrawlPod site's own Nuxt usage, that's the
signal to revisit this, not a prediction made in advance of it.

## Notes for crawlpod.com/docs

Worth porting over as-is or near-as-is, since they're generic guidance, not
`ai-visibility`-npm-package-specific: the "read this first" server-vs-no-server
table, the Nuxt `public/robots.txt` shadowing gotcha, the `@unhead/vue`
`createHead` → `/client` move, and the React `NODE_ENV=production`
build/serve gotcha. All four are the kind of thing that costs real time
regardless of which product surface someone's using.

Framework-specific code samples (the actual middleware/route file
contents) should stay in sync with whatever CrawlPod's own onboarding flow
recommends rather than being copy-pasted verbatim — CrawlPod's docs are
likely to add product-specific config (API keys, hosted dashboard wiring)
that these recipes deliberately don't have.
