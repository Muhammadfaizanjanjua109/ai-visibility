# API Reference

Complete reference for all exported classes, functions, and types in `ai-visibility`.

---

## Middleware: AI Bot Detection & Optimization

### `createAIMiddleware(config?)`

Express middleware that detects AI crawlers and attaches bot information to requests.

```typescript
import { createAIMiddleware } from 'ai-visibility'
import express from 'express'

const app = express()
app.use(createAIMiddleware({
  additionalBots: ['CustomBot'], // Track custom bots beyond the 15 known ones
  ignoreBots: ['CCBot'],          // Exclude specific bots from tracking
  verbose: true                    // Log bot detections to console
}))

app.get('/', (req, res) => {
  if (req.isAIBot) {
    console.log(`Bot detected: ${req.aiBotInfo?.name}`)
  }
  res.send('<h1>Hello</h1>')
})
```

**Parameters:**
- `config.additionalBots?` — Array of custom bot User-Agent strings to detect (merged with the 15 known bots)
- `config.ignoreBots?` — Array of bot names to exclude from detection (e.g., `'CCBot'`)
- `config.verbose?` — Log detections to console (default: `false`)

**Express augmentation:**
After calling this middleware, the following properties are available on `req`:
- `req.isAIBot: boolean` — True if the current request is from a known AI crawler
- `req.aiBotInfo?: BotInfo` — Metadata about the detected bot (see `BotInfo` type below)

---

### `optimizeResponseForAI(options?)`

Express middleware that optimizes HTML responses for AI bots. Must be used **after** `createAIMiddleware()`.

```typescript
app.use(createAIMiddleware())
app.use(optimizeResponseForAI({
  stripJs: true,          // Remove <script> tags (except JSON-LD)
  removeAds: true,        // Remove ad elements
  removeTracking: true,   // Remove tracking pixels
  simplifyNav: false,     // Simplify navigation (default: false)
  structureContent: false // Front-load main content (default: false)
}))
```

**Parameters:**
- `stripJs?` — Remove all `<script>` tags except `type="application/ld+json"` (default: `true`)
- `removeAds?` — Remove elements with ad-related classes/IDs and `<ins>` tags (default: `true`)
- `removeTracking?` — Remove tracking pixels, analytics scripts, and event handlers (default: `true`)
- `simplifyNav?` — Convert `<nav>` to plain text links (default: `false`)
- `structureContent?` — Front-load main content above navigation (default: `false`)

**Behavior:**
Only affects responses for AI bots (when `req.isAIBot` is true). For human visitors, responses pass through unchanged. Preserves JSON-LD schema markup even when `stripJs` is enabled.

---

## Classes & Methods

### `AIBotDetector`

Detect AI crawlers from User-Agent strings.

```typescript
import { AIBotDetector } from 'ai-visibility'

const detector = new AIBotDetector({
  additionalBots: ['CustomBot'],
  ignoreBots: ['CCBot']
})

// Detect a bot
const bot = detector.detect('Mozilla/5.0 (compatible; GPTBot/1.0; +https://...)')
if (bot) {
  console.log(bot.name)    // "GPTBot"
  console.log(bot.company) // "OpenAI"
  console.log(bot.purpose) // "training"
}

// List all known bots
const names = detector.getBotNames()
// ["GPTBot", "ClaudeBot", "PerplexityBot", ...]
```

**Methods:**
- `detect(userAgent: string): BotInfo | null`
  - Returns bot info if the User-Agent matches a known AI crawler, `null` otherwise
  - Case-insensitive matching

- `getBotNames(): string[]`
  - Returns array of all tracked bot names (includes additional custom bots)

---

### `RobotsGenerator`

Generate `robots.txt` files optimized for AI crawlers.

```typescript
import { RobotsGenerator } from 'ai-visibility'
import fs from 'fs'

// Allow all known AI crawlers (recommended)
const txt1 = RobotsGenerator.allowAll({
  sitemapUrl: 'https://example.com/sitemap.xml'
})

// Block all training bots (GPTBot, ClaudeBot), allow search bots
const txt2 = RobotsGenerator.blockTraining({
  sitemapUrl: 'https://example.com/sitemap.xml'
})

// Full control
const gen = new RobotsGenerator({
  allowAI: ['GPTBot', 'ClaudeBot'],      // Bots to explicitly allow
  blockAI: ['CCBot'],                    // Bots to explicitly block
  disallow: ['/admin', '/api'],          // URLs to disallow for all bots
  sitemapUrl: 'https://example.com/sitemap.xml',
  crawlDelay: 1                          // Crawl delay in seconds
})
const txt3 = gen.generate()

fs.writeFileSync('./public/robots.txt', txt3)
```

**Constructor options:**
- `allowAI?: string[]` — Bot names to allow (default: all 15 known bots)
- `blockAI?: string[]` — Bot names to block (takes precedence over `allowAI`)
- `disallow?: string[]` — URL paths to disallow (default: `['/admin', '/api', '/private', '/_next', '/static']`)
- `sitemapUrl?: string` — Sitemap URL to include in robots.txt
- `crawlDelay?: number` — Crawl delay in seconds

**Methods:**
- `generate(): string` — Returns full robots.txt content

**Static Methods:**
- `allowAll(options?): string` — Allow all 15 known AI crawlers
- `blockTraining(options?): string` — Block training bots (GPTBot, ClaudeBot, etc.), allow search bots

---

### `LLMSTextGenerator`

Generate `llms.txt` files (2026 standard for LLM indexing).

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
    { url: '/docs', title: 'Documentation' }
  ],
  contact: { email: 'hello@myapp.com', github: 'myapp' },
  autoSummarize: false  // Set to true to fetch & auto-generate summaries
})

const content = await gen.generate()
fs.writeFileSync('./public/llms.txt', content)
```

**Constructor options:**
- `siteName` (required) — Your site/app name
- `description` (required) — Brief site description
- `baseUrl?` — Base URL for page links (required if `autoSummarize: true`)
- `pages` (required) — Array of pages with `{ url, title, summary?, priority? }`
- `contact?` — Contact info: `{ email?, twitter?, github? }`
- `autoSummarize?` — Fetch live URLs and auto-generate summaries (default: `false`, adds 1-5s per page)

**Methods:**
- `async generate(): Promise<string>` — Returns full llms.txt content
  - Pages sorted by priority (high → medium → low)
  - If `autoSummarize: true`, fetches each page and extracts first paragraph

- `static minimal(config: LLMSConfig): string` — Synchronous version without summaries
  - Outputs simple `- [Title](URL)` list

---

### `SchemaBuilder`

Generate JSON-LD schema markup for AI and search engine optimization.

```typescript
import { SchemaBuilder } from 'ai-visibility'

// FAQ Schema
const faq = SchemaBuilder.faq([
  { q: 'What is this?', a: 'It makes your site visible to AI.' },
  { q: 'How much?', a: 'Free!' }
])

// Product Schema
const product = SchemaBuilder.product({
  name: 'MyApp Pro',
  description: 'Professional tier',
  price: 29,
  currency: 'USD',
  features: ['Feature A', 'Feature B'],
  availability: 'InStock',
  author: { name: 'Jane Doe', jobTitle: 'Founder' }
})

// Article Schema
const article = SchemaBuilder.article({
  headline: 'How to Optimize for AI',
  author: 'John Smith',
  publisher: 'My Blog',
  publishedDate: '2026-02-18'
})

// Organization Schema
const org = SchemaBuilder.organization({
  name: 'MyCompany',
  url: 'https://mycompany.com',
  logo: 'https://mycompany.com/logo.png',
  description: 'We make AI-visible software',
  email: 'hello@mycompany.com',
  address: { street: '123 Main St', city: 'Boston', country: 'USA' }
})

// Person Schema
const person = SchemaBuilder.person({
  name: 'Jane Doe',
  jobTitle: 'Founder',
  url: 'https://janedoe.com',
  email: 'jane@mycompany.com',
  worksFor: 'MyCompany'
})

// Auto-detect from HTML
const detectedSchema = SchemaBuilder.fromHTML(htmlContent)

// Convert to HTML <script> tag
const scriptTag = SchemaBuilder.toScriptTag(faq)
// <script type="application/ld+json">{"@context":"https://schema.org",...}</script>

// Multiple schemas in one tag
const multiTag = SchemaBuilder.toScriptTagMultiple([faq, product])
```

**Static Methods:**

| Method | Returns |
|--------|---------|
| `faq(items: FAQItem[])` | FAQ schema |
| `product(data: ProductSchemaData)` | Product schema with Offer |
| `article(data: ArticleSchemaData)` | Article schema |
| `organization(data: OrganizationSchemaData)` | Organization schema |
| `person(data: PersonSchemaData)` | Person schema |
| `fromHTML(html: string, hints?: {author?, publisher?})` | Auto-detected schema (FAQPage, Product, or Article) |
| `toScriptTag(schema)` | HTML `<script>` tag with JSON-LD |
| `toScriptTagMultiple(schemas: SchemaObject[])` | Single `<script>` tag with multiple schemas |

---

### `ContentAnalyzer`

Analyze HTML for AI readability and get actionable improvement recommendations.

```typescript
import { ContentAnalyzer } from 'ai-visibility'
import fs from 'fs'

const analyzer = new ContentAnalyzer({
  checkAnswerPlacement: true,      // Check if answer is front-loaded
  checkFactDensity: true,          // Check fact density
  checkHeadingStructure: true,     // Check H1/H2/H3 hierarchy
  checkEEAT: true,                 // Check author/org signals
  checkSnippability: true,         // Check if content is snippable
  checkSchema: true                // Check JSON-LD markup
})

const html = fs.readFileSync('./pages/pricing.html', 'utf-8')
const result = await analyzer.analyze(html)

console.log(`Score: ${result.overallScore}/100`)
// Score: 78/100

console.log(result.breakdown)
// {
//   answerFrontLoading: 85,
//   factDensity: 60,
//   headingStructure: 95,
//   eeatSignals: 70,
//   snippability: 80,
//   schemaCoverage: 50
// }

// Get specific issues
result.issues.forEach(issue => {
  console.log(`[${issue.severity}] ${issue.type}: ${issue.message}`)
  console.log(`Fix: ${issue.fix}`)
})
```

**Scoring breakdown (weights):**
- **Answer Front-Loading** (25%) — Is the main answer in the first 20% of content?
- **E-E-A-T Signals** (20%) — Author, organization, contact, trust signals present?
- **Fact Density** (15%) — 4-6 verifiable facts per 100 words?
- **Heading Structure** (15%) — Proper H1 → H2 → H3 hierarchy?
- **Schema Coverage** (15%) — JSON-LD markup present and valid?
- **Snippability** (10%) — Can each section stand alone as a snippet?

**Constructor options:**
- `checkAnswerPlacement?` — Enable answer front-loading check (default: `true`)
- `checkFactDensity?` — Enable fact density check (default: `true`)
- `checkHeadingStructure?` — Enable heading check (default: `true`)
- `checkEEAT?` — Enable E-E-A-T signal check (default: `true`)
- `checkSnippability?` — Enable snippability check (default: `true`)
- `checkSchema?` — Enable schema coverage check (default: `true`)

**Methods:**
- `async analyze(html: string): Promise<AIReadabilityScore>` — Analyze HTML and return score + issues

---

### `AIVisitorLogger`

Track and analyze AI crawler visits to your site.

```typescript
import { AIVisitorLogger } from 'ai-visibility'
import express from 'express'

const app = express()
const logger = new AIVisitorLogger({
  storage: 'both',                        // 'file' | 'memory' | 'both'
  logFilePath: './logs/ai-crawlers.json', // default: ./logs/ai-crawler.json
  trackCrawlers: ['GPTBot', 'ClaudeBot'], // default: all known bots
  maxMemoryEntries: 1000                  // default: 1000
})

// Attach middleware
app.use(logger.middleware())

// Query logs programmatically
const stats = logger.getStats(7) // Last 7 days
console.log(stats)
// {
//   GPTBot: {
//     totalVisits: 42,
//     uniqueUrlCount: 15,
//     lastSeen: '2026-02-19T10:30:00Z',
//     avgResponseTimeMs: 245,
//     successRate: 100,
//     successCount: 42,
//     botName: 'GPTBot',
//     company: 'OpenAI'
//   },
//   ...
// }

// Filter logs
const gptLogs = logger.getLogs({
  botName: 'GPTBot',
  days: 7,
  url: '/pricing'
})

// Clear all logs
logger.clearLogs()

// Manual logging (non-Express)
logger.log({
  botName: 'GPTBot',
  company: 'OpenAI',
  url: '/pricing',
  method: 'GET',
  timestamp: new Date().toISOString(),
  statusCode: 200,
  responseTimeMs: 145,
  userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.0)',
  ip: '1.2.3.4'
})
```

**Constructor options:**
- `storage?` — Storage backend: `'file'` | `'memory'` | `'both'` (default: `'both'`)
- `logFilePath?` — Path to JSON log file (default: `./logs/ai-crawler.json`)
- `trackCrawlers?` — Array of bot names to track (default: all 15 known bots)
- `maxMemoryEntries?` — Max entries to keep in memory (default: `1000`)

**Methods:**
- `middleware(): ExpressMiddleware` — Express middleware that logs all AI crawler requests
- `log(entry: CrawlerLog): void` — Manually log a crawler visit
- `getLogs(filter?: {botName?, days?, url?}): CrawlerLog[]` — Retrieve filtered logs
- `getStats(days?: number): Record<string, BotStatsSerialized>` — Aggregated statistics per bot
- `clearLogs(): void` — Delete all in-memory and file logs

---

## Types

### Middleware Types

```typescript
interface AIMiddlewareConfig {
  optimizations?: AIOptimizationOptions
  additionalBots?: string[]
  ignoreBots?: string[]
  verbose?: boolean
}

interface AIOptimizationOptions {
  stripJs?: boolean
  removeAds?: boolean
  removeTracking?: boolean
  simplifyNav?: boolean
  structureContent?: boolean
}

interface BotInfo {
  name: string
  company: string
  userAgentPattern: string
  purpose: 'training' | 'search' | 'indexing' | 'unknown'
}
```

### Generator Types

```typescript
interface RobotsConfig {
  allowAI?: string[]
  blockAI?: string[]
  disallow?: string[]
  sitemapUrl?: string
  crawlDelay?: number
}

interface LLMSConfig {
  siteName: string
  description: string
  baseUrl?: string
  pages: LLMSPage[]
  contact?: { email?: string; twitter?: string; github?: string }
  autoSummarize?: boolean
}

interface LLMSPage {
  url: string
  title: string
  summary?: string
  priority?: 'high' | 'medium' | 'low'
}
```

### Schema Types

```typescript
interface FAQItem {
  q: string
  a: string
}

interface ProductSchemaData {
  name: string
  description?: string
  price: number
  currency?: string
  features?: string[]
  url?: string
  image?: string
  brand?: string
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
  author?: { name: string; jobTitle?: string }
}

interface ArticleSchemaData {
  headline: string
  description?: string
  author?: string
  publisher?: string
  publishedDate?: string
  modifiedDate?: string
  url?: string
  image?: string
  keywords?: string[]
}

interface OrganizationSchemaData {
  name: string
  url?: string
  logo?: string
  description?: string
  email?: string
  phone?: string
  address?: { street?: string; city?: string; country?: string }
  sameAs?: string[]
}

interface PersonSchemaData {
  name: string
  jobTitle?: string
  url?: string
  image?: string
  email?: string
  sameAs?: string[]
  worksFor?: string
  description?: string
}
```

### Analyzer Types

```typescript
interface AnalyzerOptions {
  checkAnswerPlacement?: boolean
  checkFactDensity?: boolean
  checkHeadingStructure?: boolean
  checkEEAT?: boolean
  checkSnippability?: boolean
  checkSchema?: boolean
}

interface AIReadabilityScore {
  overallScore: number
  breakdown: {
    answerFrontLoading: number
    factDensity: number
    headingStructure: number
    eeatSignals: number
    snippability: number
    schemaCoverage: number
  }
  issues: AnalysisIssue[]
  recommendations: string[]
}

interface AnalysisIssue {
  type: 'answer-placement' | 'fact-density' | 'heading-structure' | 'eeat' | 'snippability' | 'schema' | 'meta'
  severity: 'high' | 'medium' | 'low'
  message: string
  fix: string
}
```

### Monitor Types

```typescript
interface LoggerConfig {
  storage?: 'file' | 'memory' | 'both'
  logFilePath?: string
  trackCrawlers?: string[]
  maxMemoryEntries?: number
}

interface CrawlerLog {
  botName: string
  company: string
  url: string
  method: string
  timestamp: string
  statusCode: number
  responseTimeMs: number
  userAgent: string
  ip?: string
}

interface BotStatsSerialized {
  botName: string
  company: string
  totalVisits: number
  uniqueUrlCount: number
  lastSeen: string
  avgResponseTimeMs: number
  successRate: number
  successCount: number
}
```

---

## Known AI Crawlers (15 total)

| Bot Name | Company | Purpose | User-Agent Pattern |
|----------|---------|---------|-----------------|
| GPTBot | OpenAI | training | `GPTBot` |
| ChatGPT-User | OpenAI | search | `ChatGPT-User` |
| ClaudeBot | Anthropic | training | `ClaudeBot` |
| Claude-Web | Anthropic | search | `Claude-Web` |
| PerplexityBot | Perplexity AI | search | `PerplexityBot` |
| Google-Extended | Google | training | `Google-Extended` |
| Googlebot | Google | indexing | `Googlebot` |
| Bingbot | Microsoft | indexing | `Bingbot` |
| CCBot | Common Crawl | training | `CCBot` |
| YouBot | You.com | search | `YouBot` |
| cohere-ai | Cohere | training | `cohere-ai` |
| meta-externalagent | Meta | training | `meta-externalagent` |
| Applebot-Extended | Apple | training | `Applebot-Extended` |
| Diffbot | Diffbot | indexing | `Diffbot` |
| Bytespider | ByteDance | training | `Bytespider` |

---

## TypeScript Support

All types are exported and fully compatible with TypeScript 5.0+:

```typescript
import type {
  AIMiddlewareConfig,
  AIOptimizationOptions,
  BotInfo,
  RobotsConfig,
  LLMSConfig,
  LLMSPage,
  FAQItem,
  ProductSchemaData,
  ArticleSchemaData,
  OrganizationSchemaData,
  PersonSchemaData,
  AnalyzerOptions,
  AIReadabilityScore,
  AnalysisIssue,
  LoggerConfig,
  CrawlerLog,
  BotStatsSerialized,
} from 'ai-visibility'
```
