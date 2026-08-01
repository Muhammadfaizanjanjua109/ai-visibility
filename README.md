# ai-visibility

> **Make your web app citable by AI models.**  
> Automatic schema, bot optimization, and AI readiness scoring for Node.js and Next.js apps.

[![npm version](https://img.shields.io/npm/v/ai-visibility.svg)](https://www.npmjs.com/package/ai-visibility)
[![npm downloads](https://img.shields.io/npm/dm/ai-visibility.svg)](https://www.npmjs.com/package/ai-visibility)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

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

---

## Quick Start

```bash
npm install ai-visibility
npx ai-visibility init
```

That's it. You now have:
- ✅ `public/robots.txt` — AI crawlers allowed
- ✅ `public/llms.txt` — Content index for LLMs
- ✅ Middleware instructions for your framework

---

## Installation

```bash
npm install ai-visibility
# or
pnpm add ai-visibility
# or
yarn add ai-visibility
```

**Requirements:** Node.js 18+

---

## Package Exports

As of **0.3.0**, `ai-visibility` ships as subpaths in addition to the root barrel, so you only bundle what you actually use. This matters most for **Next.js Edge Middleware, Cloudflare Workers, and Deno** — the detector, schema builder, and generators have **zero runtime dependencies** and run anywhere.

| Import | Contains | Runtime deps | Edge-safe |
|---|---|---|:---:|
| `ai-visibility` | Everything (barrel) — unchanged from 0.2.x | all | ❌ |
| `ai-visibility/detector` | `AIBotDetector`, `HTMLOptimizer`, bot registry | **none** | ✅ |
| `ai-visibility/schema` | `SchemaBuilder` | **none**¹ | ✅¹ |
| `ai-visibility/generators` | `RobotsGenerator`, `LLMSTextGenerator` | **none** | ✅ |
| `ai-visibility/express` | `createAIMiddleware`, `optimizeResponseForAI`, `AIVisitorLogger` | `express` (optional peer) | ❌ Node only |
| `ai-visibility/next` | `createNextMiddleware`, `detectAndOptimize` | `next` (optional peer) | ✅ |

¹ Every `SchemaBuilder` method is dependency-free except `fromHTML()`, which lazily loads `cheerio` on first call (dynamic `import()`, not a static one) — so importing `ai-visibility/schema` never pulls it in unless you actually call `fromHTML()`.

The root `ai-visibility` import still re-exports everything, so **0.2.x code keeps working with no changes**. Subpaths are opt-in for people who want a smaller, edge-safe bundle.

```typescript
// Edge-safe, zero dependencies:
import { AIBotDetector } from 'ai-visibility/detector'
import { SchemaBuilder } from 'ai-visibility/schema'
import { RobotsGenerator, LLMSTextGenerator } from 'ai-visibility/generators'

// Node-only:
import { createAIMiddleware, AIVisitorLogger } from 'ai-visibility/express'

// Next.js (edge-safe):
import { createNextMiddleware, detectAndOptimize } from 'ai-visibility/next'
```

---

## Features

### 1. Next.js Middleware

Detects AI crawlers in App Router `middleware.ts` — edge-safe, no Node built-ins, no `next` hard dependency (it's an optional peer).

```typescript
// middleware.ts
import { createNextMiddleware } from 'ai-visibility/next'

export const middleware = createNextMiddleware({
  // Mark bot requests with a header (default: 'x-ai-crawler')
  onDetect: (bot) => console.log(`${bot.name} (${bot.company}) detected`),

  // Optionally rewrite bot requests to an alternate, AI-optimized route
  // rewrite: '/ai-landing',
})

export const config = { matcher: ['/:path*'] }
```

For a framework-agnostic version that transforms HTML directly (any runtime, no request/response objects):

```typescript
import { detectAndOptimize } from 'ai-visibility/next'

const { isBot, botName, html } = detectAndOptimize(rawHtml, userAgent, {
  stripJs: true,
  removeAds: true,
})
```

---

### 2. Express Middleware

Detects AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) and serves them optimized HTML — no JS, no ads, clean semantic structure.

```typescript
import express from 'express'
import { createAIMiddleware, optimizeResponseForAI } from 'ai-visibility/express'

const app = express()

// Step 1: Detect AI bots
app.use(createAIMiddleware({ verbose: true }))

// Step 2: Optimize HTML responses for AI bots
app.use(optimizeResponseForAI({
  stripJs: true,       // Remove <script> tags (keeps JSON-LD)
  removeAds: true,     // Remove ad elements
  removeTracking: true // Remove tracking pixels
}))
```

**Detected crawlers:** GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot, CCBot, YouBot, Cohere, Meta, Apple, Diffbot, Bytespider + custom.

---

### 3. Config File Generation

#### robots.txt

By default, `RobotsGenerator` disallows nothing beyond what you explicitly pass — it doesn't assume any framework's internal paths. Pass your own `disallow` list if you need one.

```typescript
import { RobotsGenerator } from 'ai-visibility/generators'
import fs from 'fs'

// Allow all AI crawlers (recommended)
fs.writeFileSync('./public/robots.txt', RobotsGenerator.allowAll({
  sitemapUrl: 'https://mysite.com/sitemap.xml'
}))

// Or block training bots, allow search bots
fs.writeFileSync('./public/robots.txt', RobotsGenerator.blockTraining())

// Or full control
const gen = new RobotsGenerator({
  allowAI: ['GPTBot', 'ClaudeBot', 'PerplexityBot'],
  blockAI: ['CCBot'],
  disallow: ['/admin', '/api'],
  sitemapUrl: 'https://mysite.com/sitemap.xml',
})
fs.writeFileSync('./public/robots.txt', gen.generate())
```

#### llms.txt (2026 Standard)

```typescript
import { LLMSTextGenerator } from 'ai-visibility/generators'
import fs from 'fs'

const gen = new LLMSTextGenerator({
  siteName: 'MyApp',
  description: 'The best Node.js framework for AI',
  baseUrl: 'https://myapp.com',
  pages: [
    { url: '/product', title: 'Product', priority: 'high' },
    { url: '/pricing', title: 'Pricing', summary: 'Plans from $29/month' },
    { url: '/docs', title: 'Documentation' },
  ],
  contact: { email: 'hello@myapp.com', github: 'myapp' }
})

const content = await gen.generate()
fs.writeFileSync('./public/llms.txt', content)
```

---

### 4. Schema Builder (JSON-LD)

`SchemaBuilder` covers 11 schema.org types:

| Type | Method | Notes |
|---|---|---|
| FAQPage | `faq()` | |
| Product | `product()` | |
| Article | `article()` | |
| Organization | `organization()` | |
| Person | `person()` | |
| WebSite | `website()` | Optional `SearchAction` / sitelinks searchbox |
| SoftwareApplication | `softwareApplication()` | Reuses `offer()` / `aggregateRating()` when passed |
| BreadcrumbList | `breadcrumbList()` | Accepts absolute URLs, or relative paths + `baseUrl` |
| DefinedTerm / DefinedTermSet | `definedTerm()` / `definedTermSet()` | Glossary pages — a strong GEO citation surface |
| Offer | `offer()` | Nested node (no `@context`) — embed in Product/SoftwareApplication |
| AggregateRating | `aggregateRating()` | Nested node (no `@context`) |

Plus auto-detection from raw HTML via `fromHTML()`.

```typescript
import { SchemaBuilder } from 'ai-visibility/schema'

// FAQ Schema
const faqSchema = SchemaBuilder.faq([
  { q: 'What does your product do?', a: 'It optimizes your site for AI visibility.' },
  { q: 'How much does it cost?', a: 'Free and open-source.' },
])

// Product Schema
const productSchema = SchemaBuilder.product({
  name: 'MyApp Pro',
  price: 29,
  currency: 'USD',
  features: ['AI optimization', 'Schema generation', 'Crawler monitoring'],
  author: { name: 'Jane Doe', jobTitle: 'Founder' }
})

// WebSite + SearchAction
const websiteSchema = SchemaBuilder.website({
  name: 'MyApp',
  url: 'https://myapp.com',
  searchAction: { urlTemplate: 'https://myapp.com/search?q={search_term_string}' },
})

// SoftwareApplication, reusing the Offer builder
const appSchema = SchemaBuilder.softwareApplication({
  name: 'MyApp',
  description: 'AI visibility tooling',
  url: 'https://myapp.com',
  offers: { price: 29, priceCurrency: 'USD', availability: 'InStock' },
  aggregateRating: { ratingValue: 4.8, ratingCount: 120 },
})

// Auto-detect from HTML — async: lazily loads `cheerio` on first call
const schema = await SchemaBuilder.fromHTML(htmlContent)

// Render as <script> tag (for raw HTML template injection — see JSX note below)
const tag = SchemaBuilder.toScriptTag(faqSchema)
// <script type="application/ld+json">...</script>
```

#### Using with React/JSX

`toScriptTag()` / `toScriptTagMultiple()` return a **complete `<script>…</script>` HTML string**, meant for raw-template injection (e.g. an Express view or a plain HTML string you write to a file). That doesn't fit React, where `dangerouslySetInnerHTML` expects the tag's *contents*, not the tag itself.

In React/Next.js, use the plain object the builders return instead:

```tsx
export default function PricingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(SchemaBuilder.product({ name: 'Pro', price: 29 }))
        }}
      />
      <h1>Pricing</h1>
    </>
  )
}
```

---

### 5. Content Analyzer

Score your pages for AI readability and get specific, actionable fixes.

```typescript
import { ContentAnalyzer } from 'ai-visibility'
import fs from 'fs'

const analyzer = new ContentAnalyzer()
const html = fs.readFileSync('./pages/pricing.html', 'utf-8')
const result = await analyzer.analyze(html)

console.log(`Score: ${result.overallScore}/100`)
// Score: 85/100

console.log(result.breakdown)
// {
//   answerFrontLoading: 95,
//   factDensity: 70,
//   headingStructure: 100,
//   eeatSignals: 75,
//   snippability: 80,
//   schemaCoverage: 50
// }

result.issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.message}`)
  console.log(`  Fix: ${issue.fix}`)
})
```

**What it checks:**
- **Answer front-loading** — Is the answer in the first 20% of content?
- **Fact density** — 4-6 verifiable facts per 100 words
- **Heading structure** — Proper H1 → H2 → H3 hierarchy
- **E-E-A-T signals** — Author, organization, contact, trust signals
- **Snippability** — Can each section stand alone?
- **Schema coverage** — JSON-LD markup present and valid?

---

### 6. AI Visitor Logger

Track which AI crawlers visit your site, what they crawl, and how often.

```typescript
import express from 'express'
import { AIVisitorLogger } from 'ai-visibility/express'

const app = express()
const logger = new AIVisitorLogger({ storage: 'both' })

app.use(logger.middleware())

// Query logs programmatically
const stats = logger.getStats(7) // Last 7 days
// {
//   GPTBot: { totalVisits: 12, successRate: 100, lastSeen: '...' },
//   ClaudeBot: { totalVisits: 8, successRate: 100, lastSeen: '...' }
// }

const gptLogs = logger.getLogs({ botName: 'GPTBot', days: 7 })
```

---

### 7. Free Tier Dashboard

Monitor AI crawler activity with a beautiful, self-hosted dashboard. No infrastructure costs, no data collection — everything runs locally.

```typescript
import express from 'express'
import { AIVisitorLogger, createDashboard } from 'ai-visibility'

const app = express()
const logger = new AIVisitorLogger({ storage: 'file' })

app.use(logger.middleware())

// Serve the dashboard
app.get('/admin/ai-visibility', (req, res) => {
  // Optionally add authentication
  // if (!req.user?.isAdmin) return res.status(403).send('Unauthorized')

  const stats = logger.getStats(30)      // Last 30 days
  const logs = logger.getLogs({ days: 30 })

  const dashboard = createDashboard()
  res.send(dashboard.render(stats, logs))
})
```

**Dashboard Features:**
- 📊 **AI Readiness Score** (0-100) based on crawler activity
- 🌍 **Real-time Crawler Tracking** — See which AI models (Claude, ChatGPT, Gemini, Perplexity) visited
- 📄 **Page-level Analytics** — Which content AI models crawl most
- ⚡ **Performance Metrics** — Response times and success rates
- 📝 **Activity Log** — Recent crawler visits with details
- 💾 **Self-hosted** — Zero infrastructure costs, data stays on your server
- 🎨 **Lightweight** — Vanilla HTML/CSS (45KB), no frameworks

**Framework Support:**
- [Next.js 13+](./examples/nextjs-dashboard)
- [Vue 3 / Nuxt 3](./examples/vue-dashboard)
- [Vanilla Node.js/Express](./examples/vanilla-dashboard)

**Full documentation:** [Dashboard Guide](./DASHBOARD_GUIDE.md)

---

## CLI

```bash
# Initialize project
npx ai-visibility init
npx ai-visibility init --site-name "MyApp" --site-url "https://myapp.com"
npx ai-visibility init --block-training  # Block training bots

# Analyze content
npx ai-visibility analyze --dir ./pages
npx ai-visibility analyze --file ./pages/pricing.html
npx ai-visibility analyze --dir ./pages --min-score 80  # Only show failing pages
npx ai-visibility analyze --json  # Machine-readable output

# Generate files
npx ai-visibility generate robots --out ./public/robots.txt
npx ai-visibility generate llms --site-name "MyApp" --base-url "https://myapp.com"
npx ai-visibility generate schema --type faq
npx ai-visibility generate schema --type product --name "MyApp Pro" --price 29

# View crawler logs
npx ai-visibility logs --summary
npx ai-visibility logs --crawler GPTBot --days 7
npx ai-visibility logs --json
```

---

## TypeScript Support

Full type safety out of the box:

```typescript
import type {
  AIMiddlewareConfig,
  AIReadabilityScore,
  AnalysisIssue,
  RobotsConfig,
  LLMSConfig,
  FAQItem,
  ProductSchemaData,
  WebSiteSchemaData,
  SoftwareApplicationSchemaData,
  BreadcrumbItem,
  DefinedTermSchemaData,
  OfferSchemaData,
  AggregateRatingSchemaData,
  CrawlerLog,
} from 'ai-visibility'
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

## Upgrading to 0.3.0

- **`robots.txt` bug fix:** `RobotsGenerator`'s default `disallow` list used to include `/_next`, `/admin`, `/api`, `/private`, `/static` — meaning every Next.js site using the defaults was telling AI crawlers not to fetch its own JS/CSS chunks. The default is now empty; pass your own `disallow` list explicitly if you need one. **If you're on 0.2.x and used the defaults, regenerate your `robots.txt`.**
- **Subpath exports added** (`ai-visibility/detector`, `/schema`, `/generators`, `/express`, `/next`) — all opt-in. The root `ai-visibility` barrel is unchanged; 0.2.x code keeps working with no changes.
- **`SchemaBuilder.fromHTML()` is now `async`** (it lazily loads `cheerio` instead of requiring it statically). If you called it without `await`, add one.
- **Next.js support added** via `ai-visibility/next` (`createNextMiddleware`, `detectAndOptimize`) — previously the middleware only worked with Express.
- Six new schema builders: `website()`, `softwareApplication()`, `breadcrumbList()`, `definedTerm()` / `definedTermSet()`, `offer()`, `aggregateRating()`.

---

## Roadmap

- **v0.1.0** ✅ Middleware, robots.txt, schema, basic CLI
- **v0.1.1** ✅ CI/CD workflows, dual-registry publishing, comprehensive docs & examples
- **v0.2.0** ✅ Free tier dashboard with real-time analytics
  - Self-hosted HTML/CSS dashboard (no frameworks)
  - Real-time AI crawler tracking & readiness scoring
  - Framework integrations: [Next.js](./examples/nextjs-dashboard), [Vue/Nuxt](./examples/vue-dashboard), [Vanilla Node.js](./examples/vanilla-dashboard)
  - [Dashboard Guide](./DASHBOARD_GUIDE.md) with API docs & examples
  - Fixed GitHub Actions dual-registry publishing
- **v0.3.0** ✅ `/_next` robots.txt fix, edge-safe subpath exports, native Next.js middleware, six new schema builders
- **v1.0.0** 🔮 Stable API, analytics leaderboard, community directory
- **v2.0.0** 🔮 Cloud analytics, realtime monitoring, custom scoring models

---

## Documentation

- **[Dashboard Guide](./DASHBOARD_GUIDE.md)** — Free tier analytics dashboard with real-time AI crawler tracking
- **[API Reference](./docs/api-reference.md)** — Complete API documentation with all types and methods
- **[Troubleshooting Guide](./docs/troubleshooting.md)** — Common issues and solutions
- **[Performance Guide](./docs/performance.md)** — Benchmarks and optimization tips

## Framework Examples

- **[Next.js](./examples/nextjs-app)** — Integration with Next.js 13+
- **[Nuxt](./examples/nuxt-app)** — Integration with Nuxt 3
- **[SvelteKit](./examples/sveltekit-app)** — Integration with SvelteKit

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./docs/contributing.md) first.

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
