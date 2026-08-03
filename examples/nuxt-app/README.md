# Nuxt Integration Example

Verified against Nuxt 4.5, Nitro 2.13 / H3 1.15, `ai-visibility` 0.3.1.

Nuxt has a real server (Nitro), so this is a full integration — bot detection,
generated `robots.txt`/`llms.txt`, JSON-LD, and HTML optimization all work.
Uses the [subpath exports](../../README.md#package-exports) throughout
(`ai-visibility/detector`, `/generators`, `/schema`) rather than the root
barrel, so nothing Node-only or CLI-only gets pulled in.

## Files

```
server/
  middleware/ai-detector.ts   # runs on every request, detects AI crawlers
  routes/robots.txt.ts        # generated robots.txt
  routes/llms.txt.ts          # generated llms.txt
  routes/landing.get.ts       # detectAndOptimize() on a raw HTML string
app/
  app.vue                     # JSON-LD via useHead()
```

## Setup

```bash
npm install ai-visibility
```

**Delete the scaffolded `public/robots.txt`** (and `public/llms.txt` if
`nuxi init` created one). Nitro serves static files from `public/` *before*
dynamic server routes at the same path — the placeholder file will silently
shadow `server/routes/robots.txt.ts` otherwise. This isn't an ai-visibility
quirk, it's how Nitro's routing priority works; it just bites you the first
time because the scaffold's placeholder `robots.txt` looks harmless.

Copy the files above into your project, then `npm run build && node .output/server/index.mjs`
(or `npm run dev`).

## Verifying it

```bash
curl http://localhost:3000/robots.txt
curl http://localhost:3000/llms.txt
curl -H "User-Agent: GPTBot/1.0" -D - -o /dev/null http://localhost:3000/   # x-ai-crawler: GPTBot
curl -H "User-Agent: GPTBot/1.0" http://localhost:3000/landing              # scripts stripped
curl http://localhost:3000/landing                                         # scripts intact
```

## Where `detectAndOptimize()` fits (and where it doesn't)

`detectAndOptimize()` is framework-agnostic: HTML string + UA string in,
`{ isBot, botName, html }` out. It's the right tool wherever you already
have a raw HTML string in hand — a CMS-fetched page, a cached render, a
static export you're serving dynamically (see `landing.get.ts`).

It does **not** hook into Nuxt's own Vue SSR pipeline. Two things worth
knowing if you go looking for that:

- Nitro's `render:html` hook is *not* reliably reachable from
  `nuxt.config.ts`'s `hooks` field — it has to be registered from a Nitro
  plugin (`server/plugins/*.ts`) via `nitroApp.hooks.hook('render:html', ...)`.
- Even registered correctly, that hook only gives you `html.body` /
  `html.head` as separate array fragments, not one full document string.
  `detectAndOptimize()`'s ad/tracking/script-stripping still works on the
  body fragment, but the "optimized for AI crawlers" `<head>` comment never
  appears, since there's no literal `<head>` tag in that fragment to anchor
  it to.

For pages Nuxt itself renders, the middleware (bot detection + response
header) plus `useHead()` (schema) combination in this example is the
straightforward path, and it's genuinely server-rendered — no SPA caveat.

## Related docs

- [Framework Integration Guide](../../docs/framework-integration.md) — the honesty constraints for SPAs, and Vue/React/React-with-a-server recipes
- [API Reference](../../docs/api-reference.md)
