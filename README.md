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
| Know if I'm doing it right | Content analyzer / `npx ai-visibility audit <url>` | AI Readiness score across 6 categories + specific fixes |
| Gate CI on AI-readiness | `npx ai-visibility lint` | Non-zero exit code below a threshold |
| Know if AI engines actually mention my brand | `npx ai-visibility measure` (BYOK) | Brand-vs-competitor visibility with confidence intervals |
| Know where AI engines learn about my brand | `npx ai-visibility citations` | Citation source breakdown (own domain vs. review sites, news, forums, etc.) |
| Know why a competitor beats me | `npx ai-visibility compare` | Ranked, evidence-backed reasons + action items |
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

## CLI

```bash
npx ai-visibility audit <url>              # AI Readiness score across 6 categories: crawlability, structure, entity signals, citation readiness, content, authority
npx ai-visibility audit --dir ./dist       # score a local build directory instead
npx ai-visibility audit <url> --json       # machine-readable output: full categories, checks, and issues
npx ai-visibility audit <url> --verbose    # print every individual check with its score, not just top issues
npx ai-visibility audit <url> --fail-under 70   # exit 1 if any score is below 70 — CI gate

npx ai-visibility lint                     # shorthand: audit --dir . --fail-under 50, for CI/build steps

npx ai-visibility robots --preset block-training   # allow-all | block-training | block-all
npx ai-visibility llms --site-name "My Site"

npx ai-visibility discover --brand "Acme CRM" --category "CRM software" --competitors "HubSpot,Pipedrive"
npx ai-visibility measure --brand "Acme CRM" --category "CRM software" --competitors "HubSpot,Pipedrive" --runs 3 --json > report.json

npx ai-visibility citations --domain acmecrm.com --from report.json     # where does AI learn about you?
npx ai-visibility compare --from report.json                            # why is HubSpot winning?
npx ai-visibility report --domain acmecrm.com --url https://acmecrm.com --brand "Acme CRM" --category "CRM software" --competitors "HubSpot,Pipedrive"
# ^ full pipeline in one run: audit + discover + measure + citations + compare

npx ai-visibility init                     # scaffold robots.txt, llms.txt, framework-specific instructions
npx ai-visibility logs --summary           # if you're using AIVisitorLogger
```

`audit` prints an AI Readiness report: an overall score, a bar per
category, and a "WHY YOU MAY BE INVISIBLE TO AI" list of the top issues
(critical ● / warning ▲ / suggestion ○), sorted worst-first. A hard AI-crawler
block (noindex, or robots.txt disallowing every known AI crawler) zeroes
the overall score regardless of every other category. Every command prints
a one-line, dimmed CrawlPod footer — pass `--quiet`/`-q` to suppress it.
See [docs/scoring.md](./docs/scoring.md) for what `audit`/`lint` actually
score and why those weights, and [docs/api-reference.md](./docs/api-reference.md)
for the full flag reference.

`discover` generates AI-search prompt clusters for a brand/category
(template-based, no API keys needed). `measure` queries your own configured
AI engines (OpenAI, Perplexity, Gemini, Anthropic — BYOK, keys never stored
or proxied) with those prompts, repeated `--runs` times each for statistical
rigor, and reports brand-vs-competitor visibility with confidence intervals.
Set `CRAWLPOD_OPENAI_KEY`/`CRAWLPOD_PERPLEXITY_KEY`/`CRAWLPOD_GEMINI_KEY`/`CRAWLPOD_ANTHROPIC_KEY`
or add a `crawlpod.config.js` — see [docs/measurement.md](./docs/measurement.md)
for the full config precedence, prompt templates, and statistics formulas.

`citations` analyzes a `MeasurementReport`'s raw AI responses to show
*where* AI engines learn about your brand — your own domain vs. review
sites, comparison sites, news, forums, social, documentation, and
marketplaces — plus which third-party sources cite your competitors but
never you. `compare` explains *why* each competitor outranks you: up to
seven evidence-backed reasons (citation gap, prompt-cluster coverage,
recommendation rate, per-engine blind spots, listing position, missing
comparison content, review/social proof), each with a concrete action item,
ranked by impact. Both accept `--from <file>` to reuse a previously saved
`measure --json` report instead of re-querying engines (saves API credits)
— `citations` still needs `--domain` either way. `report` runs the entire
pipeline — `audit` (if you pass a URL or `--dir`) + `discover` + `measure`
+ `citations` + `compare` — in one combined report.

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
| `ai-visibility/engines` | `OpenAIAdapter`, `PerplexityAdapter`, `GeminiAdapter`, `AnthropicAdapter` (BYOK) | **none** | ✅ |
| `ai-visibility/prompts` | `PromptDiscovery` | **none** | ✅ |
| `ai-visibility/measure` | `MeasurementEngine` | **none** | ✅ |
| `ai-visibility/citations` | `CitationAnalyzer` | **none** | ✅ |
| `ai-visibility/competitor` | `CompetitorAnalyzer` | **none** | ✅ |

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

// BYOK AI engine querying + measurement (see docs/measurement.md):
import { OpenAIAdapter } from 'ai-visibility/engines'
import { PromptDiscovery } from 'ai-visibility/prompts'
import { MeasurementEngine } from 'ai-visibility/measure'

// Citation source breakdown + competitor gap analysis, both built on a MeasurementReport:
import { CitationAnalyzer } from 'ai-visibility/citations'
import { CompetitorAnalyzer } from 'ai-visibility/competitor'
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

**`ai-visibility/engines`** (zero dependencies, native `fetch` only — BYOK, keys never stored or proxied):
- `OpenAIAdapter`, `PerplexityAdapter`, `GeminiAdapter`, `AnthropicAdapter` — each implements `EngineAdapter.query(prompt, options?)`, normalizing that provider's response (text, extracted citations, latency) into a common `EngineResponse` shape

**`ai-visibility/prompts`** (zero dependencies):
- `PromptDiscovery` — template-based AI-search prompt generation for a brand/category (`discovery`/`comparison`/`commercial`/`problem`/`recommendation` clusters), no AI call needed

**`ai-visibility/measure`** (zero dependencies):
- `MeasurementEngine` — queries configured engines with repeated sampling and reports brand-vs-competitor visibility (mention rate, recommend rate, citation rate) with 95% confidence intervals — see [docs/measurement.md](./docs/measurement.md)

**`ai-visibility/citations`** (zero dependencies):
- `CitationAnalyzer` — analyzes a `MeasurementReport`'s raw responses to extract and classify citation sources (own domain / review-site / comparison-site / news / forum / social / documentation / marketplace / other), reporting domain vs. third-party coverage and which sources cite competitors but never the brand
- `classifySource`, `extractSourceRefs`, and the rest of the extraction/classification helpers, for building custom citation tooling

**`ai-visibility/competitor`** (zero dependencies):
- `CompetitorAnalyzer` — explains why each competitor outranks the brand: up to seven evidence-backed `GapReason`s (citation gap, prompt-cluster coverage, recommendation rate, per-engine blind spots, listing position, missing comparison content, review/social proof), each with `impact`/`evidence`/`actionable`, ranked by impact — every reason is derived from the measurement data, never fabricated
- `detectGapReasons`, `classifyImpactByRatio`, `classifyImpactByPercentGap`, for building on the same logic directly

**Root barrel only** (also re-exports everything above):
- `ContentAnalyzer` — the AI Readiness Engine. `audit()` scores HTML across 6 weighted categories (crawlability, structure, entity signals, citation readiness, content, authority) with structured, severity-ranked issues; fixed published weights via `ContentAnalyzer.CATEGORY_WEIGHTS` — see [docs/scoring.md](./docs/scoring.md). The original flat 7-dimension `analyze()` (`ContentAnalyzer.SCORING_WEIGHTS`) is still exported, unchanged, for existing consumers.
- `Dashboard`, `createDashboard()` — self-hosted analytics dashboard, no infrastructure or data collection
- CLI (`npx ai-visibility audit | lint | discover | measure | citations | compare | report | init | analyze | generate | robots | llms | logs`) — see [CLI](#cli) above

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
| AI Content Analyzer | ❌ | ❌ | Basic | ✅ 6-category AI Readiness Engine, published weights |
| CI Gate (`audit`/`lint --fail-under`) | ❌ | ❌ | ❌ | ✅ |
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
- **v0.5.0** ✅ `audit`/`lint` CLI commands, 7-dimension GEO scoring with fixed published weights (+ published `scoring-weights.json`), `robots.txt` block-all preset, top-level `robots`/`llms` CLI aliases, semantic HTML stripping, `llms-full.txt`/`llms-small.txt`, `ai.txt`, sitemap/MDX auto-discovery, crawler webhooks
- **v0.6.0** ✅ AI Readiness Engine: `ContentAnalyzer.audit()` restructures scoring into 6 weighted categories (crawlability, structure, entity signals, citation readiness, content, authority) with structured, severity-ranked issues; hard-gate to 0 on a full AI-crawler block; reformatted `audit`/`lint` CLI output (`--verbose`, richer `--json`); `scoring-weights.json` schemaVersion 2 with `legacy_dimensions`. The old `analyze()`/`SCORING_WEIGHTS` flat 7-dimension API is unchanged and still exported.
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
- **[AI Readiness Scoring Guide](./docs/scoring.md)** — the 6 category weights and rationale, the deprecated 7-dimension legacy shape, and how to consume `scoring-weights.json` from another surface
- **[Roadmap Decisions](./docs/roadmap-decisions.md)** — assessed-but-deferred items (`ai.txt`, crawler IP verification) and why
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
