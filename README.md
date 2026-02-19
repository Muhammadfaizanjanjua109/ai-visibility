# ai-visibility

> **Make your web app citable by AI models.**  
> Automatic schema, bot optimization, and AI readiness scoring for Node.js apps.

[![npm version](https://img.shields.io/npm/v/@Muhammadfaizanjunjua109/ai-visibility.svg)](https://www.npmjs.com/package/@Muhammadfaizanjanjua109/ai-visibility)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-available-brightgreen)](https://github.com/Muhammadfaizanjunjua109/ai-visibility/packages)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

---

## Why?

AI models like ChatGPT, Gemini, and Perplexity are increasingly the first place people go for answers. If your site isn't optimized for AI crawlers, you're invisible to them.

**`ai-visibility` solves this in < 10 minutes.**

| Need | Solution | Output |
|------|----------|--------|
| AI bots can access my site | Middleware | Clean, JS-free HTML for AI crawlers |
| Tell AI bots my content exists | `robots.txt` + `llms.txt` | Auto-generated config files |
| Help AI understand my content | Schema injection | Auto-generated JSON-LD markup |
| Know if I'm doing it right | Content analyzer | Score + specific fixes |
| Track AI crawler visits | Visitor logger | Log of all AI crawler activity |
| Get started quickly | CLI tool | 1 command to set up everything |

---

## Quick Start

```bash
npm install @Muhammadfaizanjunjua109/ai-visibility
npx ai-visibility init
```

That's it. You now have:
- ✅ `public/robots.txt` — AI crawlers allowed
- ✅ `public/llms.txt` — Content index for LLMs
- ✅ Middleware instructions for your framework

---

## Installation

```bash
npm install @Muhammadfaizanjunjua109/ai-visibility
# or
pnpm add @Muhammadfaizanjunjua109/ai-visibility
# or
yarn add @Muhammadfaizanjunjua109/ai-visibility
```

**Also available on:**
- [npm](https://www.npmjs.com/package/@Muhammadfaizanjunjua109/ai-visibility)
- [GitHub Packages](https://github.com/Muhammadfaizanjunjua109/ai-visibility/packages)

**Requirements:** Node.js 18+

---

## Features

### 1. AI Crawler Middleware

Detects AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) and serves them optimized HTML — no JS, no ads, clean semantic structure.

```typescript
import express from 'express'
import { createAIMiddleware, optimizeResponseForAI } from 'ai-visibility'

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

**Next.js:**
```typescript
// middleware.ts
import { createAIMiddleware } from 'ai-visibility'
export const middleware = createAIMiddleware()
export const config = { matcher: ['/:path*'] }
```

**Detected crawlers:** GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Bingbot, CCBot, YouBot, Cohere, Meta, Apple, Diffbot, Bytespider + custom.

---

### 2. Config File Generation

#### robots.txt

```typescript
import { RobotsGenerator } from 'ai-visibility'
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
import { LLMSTextGenerator } from 'ai-visibility'
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

### 3. Schema Builder (JSON-LD)

```typescript
import { SchemaBuilder } from 'ai-visibility'

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

// Article Schema
const articleSchema = SchemaBuilder.article({
  headline: 'How to Optimize for AI Visibility',
  author: 'John Smith',
  publisher: 'TechBlog',
  publishedDate: '2026-02-18',
})

// Auto-detect from HTML
const schema = SchemaBuilder.fromHTML(htmlContent)

// Render as <script> tag
const tag = SchemaBuilder.toScriptTag(faqSchema)
// <script type="application/ld+json">...</script>
```

**Next.js usage:**
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

### 4. Content Analyzer

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

### 5. AI Visitor Logger

Track which AI crawlers visit your site, what they crawl, and how often.

```typescript
import express from 'express'
import { AIVisitorLogger } from 'ai-visibility'

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
  CrawlerLog,
} from 'ai-visibility'
```

---

## vs. Alternatives

| Feature | Semrush | Ahrefs | ai-seo | **ai-visibility** |
|---------|---------|--------|--------|-------------------|
| AI Visibility Tracking | ⏳ | ⏳ | ❌ | ✅ |
| Bot Middleware | ❌ | ❌ | ❌ | ✅ |
| llms.txt Generation | ❌ | ❌ | ❌ | ✅ |
| AI Content Analyzer | ❌ | ❌ | Basic | ✅ AI-specific |
| Schema Generator | Manual | Manual | Basic | ✅ Auto |
| Crawler Monitor | ❌ | ❌ | ❌ | ✅ |
| CLI Tool | ❌ | ❌ | ❌ | ✅ |
| Open Source | ❌ | ❌ | ✅ | ✅ |
| Free | No | No | ✅ | ✅ |
| Setup Time | Hours | Hours | 30min | **10 min** |

---

## Roadmap

- **v0.1.0** ✅ Middleware, robots.txt, schema, basic CLI
- **v0.1.1** ✅ CI/CD workflows, dual-registry publishing, comprehensive docs & examples
  - Full [API Reference](./docs/api-reference.md)
  - [Troubleshooting Guide](./docs/troubleshooting.md)
  - [Performance Benchmarks](./docs/performance.md)
  - Framework examples: [Next.js](./examples/nextjs-app), [Nuxt](./examples/nuxt-app), [SvelteKit](./examples/sveltekit-app)
  - GitHub Actions CI/CD with coverage reports
- **v0.2.0** 🔄 Expand test coverage (CLI, logger, llms.txt), add more framework examples
- **v1.0.0** 🔜 Stable API, additional framework examples (Express, Remix), analytics dashboard
- **v2.0.0** 🔮 Cloud analytics, realtime crawler monitoring, custom scoring models

---

## Documentation

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
git clone https://github.com/Muhammadfaizanjunjua109/ai-visibility
cd ai-visibility
npm install
npm run dev
npm test
```

---

## License

MIT © 2026
