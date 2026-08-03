import { detectAndOptimize } from 'ai-visibility/detector'

// detectAndOptimize() fits naturally wherever you already have a raw HTML
// string in hand — a page fetched from a CMS, a cached render, a static
// export you're serving dynamically. It does NOT hook into Nuxt's own Vue
// SSR pipeline: Nitro's `render:html` hook only exposes body/head as
// separate fragments (no full `<head>` tag to inject the optimizer's
// AI-friendly comment into), and it isn't reliably reachable from
// nuxt.config.ts's `hooks` field at all — it has to be registered from a
// Nitro plugin (`server/plugins/*.ts`) using `nitroApp.hooks.hook(...)`.
// For a page Nuxt itself renders, use the middleware + useHead() approach
// in app/app.vue instead.
const RAW_HTML = `<!doctype html>
<html>
<head><title>Landing</title></head>
<body>
<script src="/analytics.js"></script>
<h1>Welcome</h1>
</body>
</html>`

export default defineEventHandler((event) => {
  const userAgent = getHeader(event, 'user-agent') ?? ''
  const { isBot, botName, html } = detectAndOptimize(RAW_HTML, userAgent)

  setResponseHeader(event, 'content-type', 'text/html')
  if (isBot) setResponseHeader(event, 'x-ai-crawler', botName ?? '')

  return html
})
