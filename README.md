# ai-visibility

> **Make your web app citable by AI models.**  
> Automatic schema, bot optimization, and AI readiness scoring for Node.js and Next.js apps.

[![npm version](https://img.shields.io/npm/v/ai-visibility.svg)](https://www.npmjs.com/package/ai-visibility)
[![npm downloads](https://img.shields.io/npm/dm/ai-visibility.svg)](https://www.npmjs.com/package/ai-visibility)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

**📖 Full documentation: [crawlpod.com/docs](https://crawlpod.com/docs)** — API reference, per-framework recipes, and long-form examples. This README covers what the package does, install, a working quickstart, and everything it exports; the site has the depth.

---

## Why?

AI models like ChatGPT, Gemini, and Perplexity are increasingly the first place people go for answers. If your site isn't optimized for AI crawlers, you're invisible to them.

**`ai-visibility` solves this in < 10 minutes.**

| Need | Solution | Output |
|------|----------|--------|
| AI bots can access my site | Middleware (Express or Next.js) | Clean, JS-free HTML for AI crawlers |
| Tell AI bots my content exists | `robots.txt` + `llms.txt` | Auto-generated config files |
| Help AI understand my content | Schema injection | Auto-generated JSON-LD markup (11 schema types) |
| Know if I'm doing it right | Content analyzer | Score + specific fixes |
| Track AI crawler visits | Visitor logger | Log of all AI crawler activity |
| Monitor AI activity visually | Free Dashboard | Real-time analytics & insights |
| Get started quickly | CLI tool | 1 command to set up everything |

Works with **Node.js**, **Next.js** (App Router), **Express**, and — for what's actually possible without a server — **Nuxt, Vue, and React** too. See [Framework Support](#framework-support) below.

---

## Install

```bash
npm install ai-visibility
# or: pnpm add ai-visibility / yarn add ai-visibility
```

**Requirements:** Node.js 18+

```bash
# Optional: scaffold robots.txt, llms.txt, and framework-specific middleware instructions
npx ai-visibility init
```

---

## Quickstart

A complete, working example — Next.js detecting AI crawlers and marking the response, copy-pasteable into `proxy.ts` (or `middleware.ts` on Next.js < 16):

```typescript
// proxy.ts
import { createNextMiddleware } from 'ai-visibility/next'

export default createNextMiddleware({
  onDetect: (bot) => console.log(`${bot.name} (${bot.company}) detected`),
})

export const config = { matcher: ['/:path*'] }
```

That's it — GPTBot, ClaudeBot, PerplexityBot, and 18 other known AI crawlers now get an `x-ai-crawler` response header, and `onDetect` fires (safely, even if it's `async`) whenever one hits your site. For Express, or for a framework-agnostic version with no request/response objects at all, see [Package Exports](#package-exports) below and the full recipes at [crawlpod.com/docs/recipes](https://crawlpod.com/docs/recipes).

---

## Package Exports

`ai-visibility` ships as subpaths in addition to the root barrel, so you only bundle what you actually use. This matters most for **Next.js Edge Middleware, Cloudflare Workers, and Deno** — the detector, schema builder, and generators have **zero runtime dependencies** and run anywhere.

| Import | Contains | Runtime deps | Edge-safe |
|---|---|---|:---:|
| `ai-visibility` | Everything (barrel) | all | ❌ |
| `ai-visibility/detector` | `AIBotDetector`, `HTMLOptimizer`, `detectAndOptimize()`, bot registry | **none** | ✅ |
| `ai-visibility/schema` | `SchemaBuilder` | **none**¹ | ✅¹ |
| `ai-visibility/generators` | `RobotsGenerator`, `LLMSTextGenerator` | **none** | ✅ |
| `ai-visibility/express` | `createAIMiddleware`, `optimizeResponseForAI`, `AIVisitorLogger` | `express` (optional peer) | ❌ Node only |
| `ai-visibility/next` | `createNextMiddleware` (+ `detectAndOptimize`, re-exported for convenience) | `next` (optional peer) | ✅ |

¹ Every `SchemaBuilder` method is dependency-free except `fromHTML()`, which lazily loads `cheerio` on first call — importing `ai-visibility/schema` never pulls it in unless you actually call `fromHTML()`.

```typescript
// Edge-safe, zero dependencies — works in any runtime, any framework:
import { AIBotDetector, detectAndOptimize } from 'ai-visibility/detector'
import { SchemaBuilder } from 'ai-visibility/schema'
import { RobotsGenerator, LLMSTextGenerator } from 'ai-visibility/generators'

// Node-only:
import { createAIMiddleware, AIVisitorLogger } from 'ai-visibility/express'

// Next.js specifically (edge-safe):
import { createNextMiddleware } from 'ai-visibility/next'
```

---

## Framework Support

| Framework | Has a server? | What works |
|---|---|---|
| Node.js / Express | Yes | Full integration |
| Next.js (App Router) | Yes | Full integration — native `proxy.ts`/`middleware.ts` support |
| Nuxt (Nitro) / React Router (framework mode) / Remix / Astro (server) / TanStack Start | Yes | Full integration via the framework-agnostic exports |
| Vue SPA / React SPA (Vite, no server) | No | Build-time `robots.txt`/`llms.txt` generation + build-time JSON-LD only |

A SPA with no server genuinely can't run this package's middleware or bot
detection — there's no request to detect a crawler on. See the
[Framework Integration Guide](./docs/framework-integration.md) for the full
story on Nuxt, Vue, and React, including runnable examples for each in
[`examples/`](./examples), and [crawlpod.com/docs/recipes](https://crawlpod.com/docs/recipes) for Next.js and Express.

---

## What's included

Every export, one line each — see [crawlpod.com/docs/api-reference](https://crawlpod.com/docs/api-reference) or [docs/api-reference.md](./docs/api-reference.md) for full signatures.

**`ai-visibility/detector`** (zero dependencies, edge-safe):
- `AIBotDetector` — detects AI crawlers from a User-Agent string
- `HTMLOptimizer` — strips scripts/ads/tracking pixels from HTML for bot responses
- `detectAndOptimize()` — the two above combined: HTML + UA string in, `{ isBot, botName, html }` out
- `AI_CRAWLERS`, `detectBot()`, `getUnverifiedBots()` — the crawler registry itself (see below)

**`ai-visibility/schema`** (zero dependencies except lazy `fromHTML()`):
- `SchemaBuilder` — JSON-LD builder covering FAQPage, Product, Article, Organization, Person, WebSite, SoftwareApplication, BreadcrumbList, DefinedTerm/DefinedTermSet, Offer, and AggregateRating, plus `fromHTML()` auto-detection and `toScriptTag()`/`toScriptTagMultiple()` rendering

**`ai-visibility/generators`** (zero dependencies):
- `RobotsGenerator` — generates `robots.txt`, explicitly allowing/blocking specific AI crawlers
- `LLMSTextGenerator` — generates `llms.txt` (the emerging LLM-indexing standard)

**`ai-visibility/express`** (Node only, `express` optional peer):
- `createAIMiddleware()`, `optimizeResponseForAI()` — detect bots and serve them optimized HTML
- `AIVisitorLogger` — logs and queries AI crawler visits (`getStats()`, `getLogs()`)

**`ai-visibility/next`** (edge-safe, `next` optional peer):
- `createNextMiddleware()` — `proxy.ts`/`middleware.ts` helper; `onDetect` may be `async`, safely kept alive via `event.waitUntil()`

**Root barrel only** (also re-exports everything above):
- `ContentAnalyzer` — scores HTML for AI readability (answer front-loading, fact density, heading structure, E-E-A-T, snippability, schema coverage) with specific fixes
- `Dashboard`, `createDashboard()` — self-hosted analytics dashboard, no infrastructure or data collection
- CLI (`npx ai-visibility init | analyze | generate | logs`) — scaffolding and inspection commands

### Crawler registry

`AI_CRAWLERS` covers 21 crawlers across 13 vendors (OpenAI, Anthropic, Perplexity, Google, Microsoft, Common Crawl, Amazon, Meta, Apple, ByteDance, You.com, Cohere, Diffbot). 17 are verified against the vendor's own documentation (source URL + check date recorded per entry); Bytespider is explicitly flagged `verified: false` since no official ByteDance documentation exists at all; the remaining three predate this audit and are flagged as such via `getUnverifiedBots()`. The same data is published as plain JSON at `dist/crawlers.json` for other tooling to consume at build time. See the [Crawler Registry Guide](./docs/crawler-registry.md) for the verification methodology, the re-verification checklist, and the consumption pattern.

### Using JSON-LD with React/JSX

`toScriptTag()`/`toScriptTagMultiple()` return a complete `<script>…</script>` HTML string for raw-template injection — not what React's `dangerouslySetInnerHTML` expects (the tag's *contents*, not the tag itself). In React/Next.js, use the plain object the builders return instead:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(SchemaBuilder.product({ name: 'Pro', price: 29 })) }}
/>
```

---

## vs. Alternatives

| Feature | Semrush | Ahrefs | ai-seo | **ai-visibility** |
|---------|---------|--------|--------|-------------------|
| AI Visibility Tracking | ⏳ | ⏳ | ❌ | ✅ |
| Bot Middleware (Express + Next.js) | ❌ | ❌ | ❌ | ✅ |
| Edge-safe / zero-dependency core | ❌ | ❌ | ❌ | ✅ |
| llms.txt Generation | ❌ | ❌ | ❌ | ✅ |
| AI Content Analyzer | ❌ | ❌ | Basic | ✅ AI-specific |
| Schema Generator | Manual | Manual | Basic | ✅ Auto, 11 types |
| Crawler Monitor | ❌ | ❌ | ❌ | ✅ |
| **Analytics Dashboard** | ⏳ | ⏳ | ❌ | ✅ Self-hosted |
| CLI Tool | ❌ | ❌ | ❌ | ✅ |
| Open Source | ❌ | ❌ | ✅ | ✅ |
| Free | No | No | ✅ | ✅ |
| Setup Time | Hours | Hours | 30min | **10 min** |

---

## Roadmap

- **v0.1.0** ✅ Middleware, robots.txt, schema, basic CLI
- **v0.2.0** ✅ Free tier dashboard with real-time analytics
- **v0.3.0** ✅ `/_next` robots.txt fix, edge-safe subpath exports, native Next.js middleware, six new schema builders
- **v0.4.0** ✅ Vendor-verified crawler registry (+ published `crawlers.json`), complete subpath type exports, safe async `onDetect`, CI-checked examples
- **v1.0.0** 🔮 Stable API, analytics leaderboard, community directory
- **v2.0.0** 🔮 Cloud analytics, realtime monitoring, custom scoring models

Upgrading between versions? See [CHANGELOG.md](./CHANGELOG.md) — every release documents breaking changes and migration steps inline.

---

## Documentation

**[crawlpod.com/docs](https://crawlpod.com/docs)** is the primary documentation site:

- [Overview & quickstart](https://crawlpod.com/docs)
- [API reference](https://crawlpod.com/docs/api-reference) — every export, signature, and option
- [Recipes](https://crawlpod.com/docs/recipes) — Next.js and Express, in depth

Not yet on the site — covered here in the repo instead:

- **[Framework Integration Guide](./docs/framework-integration.md)** — Nuxt, Vue, React (SPA and server) recipes, and what's honestly possible in each
- **[Crawler Registry Guide](./docs/crawler-registry.md)** — verification methodology, re-verification checklist, multi-surface sharing
- **[Troubleshooting Guide](./docs/troubleshooting.md)** — common issues and solutions
- **[Performance Guide](./docs/performance.md)** — benchmarks and optimization tips
- **[Dashboard Guide](./DASHBOARD_GUIDE.md)** — the free-tier analytics dashboard in depth
- **[docs/api-reference.md](./docs/api-reference.md)** — the same API reference as the site, versioned with the repo

---

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

```bash
git clone https://github.com/Muhammadfaizanjanjua109/ai-visibility
cd ai-visibility
npm install
npm run dev
npm test
```

---

## License

MIT © 2026
