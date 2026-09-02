
<h1 align="center">ai-visibility</h1>
<p align="center">
  <b>Make your Node.js / Next.js app citable by AI models.</b><br>
  Auto-generate <code>robots.txt</code>, <code>llms.txt</code>, JSON-LD schema, and track AI crawler traffic.<br>
  Detect GPTBot, ClaudeBot, PerplexityBot & 18 other AI crawlers. Score your AI readiness. Measure brand visibility.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/ai-visibility"><img src="https://img.shields.io/npm/v/ai-visibility.svg?style=flat-square&color=blue" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/ai-visibility"><img src="https://img.shields.io/npm/dm/ai-visibility.svg?style=flat-square&color=green" alt="npm downloads"></a>
  <a href="https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/ai-visibility.svg?style=flat-square&color=yellow" alt="MIT License"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat-square" alt="TypeScript"></a>
</p>

<p align="center">
  <b>📖 Full docs:</b> <a href="https://crawlpod.com/docs">crawlpod.com/docs</a> — API reference, framework recipes, and long-form examples.
</p>

---

## What is ai-visibility?

`ai-visibility` is an **open-source Generative Engine Optimization (GEO)** toolkit for Node.js and Next.js. It makes your web app discoverable, readable, and citable by AI crawlers and LLM search engines like ChatGPT, Perplexity, Claude, and Gemini.

Instead of guessing whether GPTBot or ClaudeBot can access your site, `ai-visibility` gives you:
- **Bot detection** for 21 AI crawlers across 13 vendors
- **Auto-generated `robots.txt`** with AI-crawler-specific rules
- **Auto-generated `llms.txt`** for LLM indexing standards
- **JSON-LD schema builder** with 11 schema types
- **AI Readiness Engine** — a 6-category audit scoring your pages 0-100
- **AI Visitor Logger** — track which AI models crawl your site
- **Self-hosted Dashboard** — real-time analytics, zero infrastructure
- **Brand Visibility Measurement** — BYOK queries to OpenAI, Perplexity, Gemini, Anthropic
- **Citation Analyzer** — discover where AI engines learn about your brand
- **Competitor Analyzer** — evidence-backed reasons why competitors outrank you

---

## Why AI Visibility Matters

AI models are becoming the primary search interface. When someone asks ChatGPT *"what's the best CRM?"* or Perplexity *"how do I optimize for AI crawlers?"* — your brand either appears in the answer, or it doesn't.

**Generative Engine Optimization (GEO)** and **Answer Engine Optimization (AEO)** are the new SEO. `ai-visibility` is the first open-source toolkit that covers the full stack: technical crawlability, structured data, content scoring, competitive intelligence, and real-time monitoring.

---

## Install

```bash
npm install ai-visibility
# or: pnpm add ai-visibility / yarn add ai-visibility
```

**Requirements:** Node.js 18+

```bash
# Scaffold robots.txt, llms.txt, and framework-specific setup
npx ai-visibility init
```

---

## Quick Start

### Next.js App Router (Edge-Safe)

```typescript
// proxy.ts
import { createNextMiddleware } from 'ai-visibility/next'

export default createNextMiddleware({
  onDetect: (bot) => console.log(`${bot.name} (${bot.company}) detected`),
})

export const config = { matcher: ['/:path*'] }
```

GPTBot, ClaudeBot, PerplexityBot, and 18 other known AI crawlers now get an `x-ai-crawler` response header. `onDetect` fires safely even if async.

### Express

```typescript
import { createAIMiddleware } from 'ai-visibility/express'

app.use(createAIMiddleware({
  onDetect: (bot) => console.log(`AI crawler: ${bot.name}`),
}))
```

### Framework-Agnostic (Zero Dependencies)

```typescript
import { detectAndOptimize } from 'ai-visibility/detector'

const { isBot, botName, html } = detectAndOptimize(rawHTML, userAgent)
```

Works in any runtime: Cloudflare Workers, Deno, Nuxt, Astro, React Router — no `express` or `next` required.

---

## CLI Commands

```bash
# AI Readiness Audit — score your site across 6 categories
npx ai-visibility audit <url>
npx ai-visibility audit --dir ./dist          # local build directory
npx ai-visibility audit --json                # machine-readable output
npx ai-visibility audit --verbose             # every check, not just top issues
npx ai-visibility audit --fail-under 70       # CI gate: exit 1 if score < 70

# Shorthand for CI
npx ai-visibility lint                        # audit --dir . --fail-under 50

# Generate config files
npx ai-visibility robots --preset allow-all   # allow-all | block-training | block-all
npx ai-visibility llms --site-name "My Site"

# Brand Visibility Measurement (BYOK — keys never stored or proxied)
npx ai-visibility discover --brand "Acme CRM" --category "CRM software" --competitors "HubSpot,Pipedrive"
npx ai-visibility measure --brand "Acme CRM" --category "CRM software" --competitors "HubSpot,Pipedrive" --runs 3 --json > report.json

# v0.8.0: Know WHY you're invisible
npx ai-visibility citations --domain acmecrm.com --from report.json
npx ai-visibility compare --from report.json
npx ai-visibility report --domain acmecrm.com --url https://acmecrm.com --brand "Acme CRM" --category "CRM software" --competitors "HubSpot,Pipedrive"
# ^ full pipeline: audit + discover + measure + citations + compare

# Dashboard logs
npx ai-visibility logs --summary

# Setup
npx ai-visibility init
```

Set API keys via `CRAWLPOD_OPENAI_KEY`, `CRAWLPOD_PERPLEXITY_KEY`, `CRAWLPOD_GEMINI_KEY`, `CRAWLPOD_ANTHROPIC_KEY` or `crawlpod.config.js`.

---

## Package Exports (Tree-Shakeable)

Import only what you need. Zero-dependency subpaths work in Edge Middleware, Cloudflare Workers, and Deno.

| Import | Contains | Runtime deps | Edge-safe |
|--------|----------|-------------|:---------:|
| `ai-visibility` | Everything (barrel) | all | ❌ |
| `ai-visibility/detector` | `AIBotDetector`, `HTMLOptimizer`, `detectAndOptimize()` | **none** | ✅ |
| `ai-visibility/schema` | `SchemaBuilder` (11 schema types) | **none**¹ | ✅ |
| `ai-visibility/generators` | `RobotsGenerator`, `LLMSTextGenerator` | **none** | ✅ |
| `ai-visibility/express` | `createAIMiddleware`, `AIVisitorLogger` | `express` (peer) | ❌ |
| `ai-visibility/next` | `createNextMiddleware` | `next` (peer) | ✅ |
| `ai-visibility/engines` | `OpenAIAdapter`, `PerplexityAdapter`, `GeminiAdapter`, `AnthropicAdapter` | **none** | ✅ |
| `ai-visibility/prompts` | `PromptDiscovery` (template-based prompt clusters) | **none** | ✅ |
| `ai-visibility/measure` | `MeasurementEngine` (BYOK, statistical sampling) | **none** | ✅ |
| `ai-visibility/citations` | `CitationAnalyzer` — where AI learns about you | **none** | ✅ |
| `ai-visibility/competitor` | `CompetitorAnalyzer` — why competitors win | **none** | ✅ |

¹ `SchemaBuilder.fromHTML()` lazily loads `cheerio` on first call. The subpath itself is dependency-free.

---

## What's Included

### 🤖 AI Bot Detection (`ai-visibility/detector`)
- `AIBotDetector` — detect 21 AI crawlers across 13 vendors from any User-Agent string
- `HTMLOptimizer` — strip scripts, ads, and tracking pixels; serve clean semantic HTML to bots
- `detectAndOptimize()` — HTML + UA in, `{ isBot, botName, html }` out
- `AI_CRAWLERS` registry — verified against vendor documentation, published as `dist/crawlers.json`

**Crawlers tracked:** GPTBot, OAI-SearchBot, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User, Googlebot, Google-Extended, Bingbot, Amazonbot, Amzn-SearchBot, Amzn-User, Meta-ExternalAgent, Applebot, Bytespider, YouBot, Cohere-ai, Diffbot, CommonCrawl (CCBot), and more.

### 🔖 JSON-LD Schema Builder (`ai-visibility/schema`)
`SchemaBuilder` covers 11 schema.org types:
- `faqPage()` — Q&A extraction for AI models
- `product()` — with offers & aggregate ratings
- `article()` — blog posts, guides, documentation
- `organization()` — E-E-A-T trust signals
- `person()` — author bios
- `website()` — with SearchAction/sitelinks
- `softwareApplication()` — SaaS tools
- `breadcrumbList()` — navigation structure
- `definedTerm()` / `definedTermSet()` — glossary content
- `offer()` — pricing & availability
- `aggregateRating()` — review scores

### 🛡️ robots.txt & llms.txt Generators (`ai-visibility/generators`)
- `RobotsGenerator` — three presets: `allowAll()`, `blockTraining()`, `blockAll()`
- `LLMSTextGenerator` — generates `llms.txt` for the emerging LLM-indexing standard
- Group-precedence parser for bot-specific `Allow`/`Disallow` rules

### 🔍 AI Readiness Engine (`ContentAnalyzer`)
Scores HTML across **6 weighted categories** (30 checks total):

| Category | Weight | What It Checks |
|----------|--------|----------------|
| **Crawlability** | 20% | Meta robots, robots.txt blocks, llms.txt presence, response time |
| **Structure** | 20% | Heading hierarchy (H1→H2→H3), semantic HTML, snippable sections |
| **Entity Signals** | 20% | Author info, organization markup, contact details, E-E-A-T |
| **Citation Readiness** | 15% | Answer front-loading, fact density, verifiable claims |
| **Content** | 15% | Substantive paragraphs per section, self-contained snippets |
| **Authority** | 10% | Trust signals, credentials, press mentions, customer counts |

**Hard gate:** A full AI-crawler block (`noindex` or robots.txt disallowing all AI bots) zeroes the overall score regardless of other categories.

### 📊 AI Visitor Logger & Dashboard (`ai-visibility/express`)
- `AIVisitorLogger` — log and query AI crawler visits with `getStats()` and `getLogs()`
- `Dashboard` / `createDashboard()` — self-hosted vanilla HTML/CSS analytics (45KB, no React/Vue bloat)
- Real-time tracking of which AI models visit, what they crawl, and response metrics

### 🧪 Brand Visibility Measurement (`ai-visibility/measure` + `engines` + `prompts`)
- **BYOK adapters** — query OpenAI, Perplexity, Gemini, Anthropic directly (keys never stored or proxied)
- **PromptDiscovery** — template-based generation of 26+ prompts per brand/category (no API call needed)
- **MeasurementEngine** — repeated sampling with 95% confidence intervals for mention rate, recommend rate, citation rate, and average position

### 🎯 Citation Analyzer — v0.8.0 (`ai-visibility/citations`)
Mines `MeasurementReport` raw responses to show **where** AI engines learn about your brand:
- Source classification: own domain, review sites, comparison sites, news, forums, social, documentation, marketplaces
- Domain vs. third-party coverage split
- Sources that cite competitors but never you

### ⚔️ Competitor Analyzer — v0.8.0 (`ai-visibility/competitor`)
Evidence-backed `GapReason`s for why each competitor outranks you:
1. **Citation gap** — they appear in sources you don't
2. **Prompt-cluster coverage** — they dominate more query types
3. **Recommendation rate** — AI recommends them more often
4. **Per-engine blind spots** — you're invisible on specific platforms
5. **Listing position** — they rank higher when both appear
6. **Missing comparison content** — no "vs" or comparison pages
7. **Review/social proof** — stronger third-party validation

Every reason includes `impact`, `evidence`, and a concrete `actionable` step. Nothing is fabricated when data doesn't support it.

---

## Framework Support

| Framework | Server? | What Works |
|-----------|---------|------------|
| **Node.js / Express** | Yes | Full integration — middleware, logger, dashboard |
| **Next.js (App Router)** | Yes | Native `proxy.ts` / `middleware.ts` support, edge-safe |
| **Nuxt (Nitro)** | Yes | Full integration via framework-agnostic exports |
| **React Router (framework)** | Yes | Full integration |
| **Remix / Astro (server)** | Yes | Full integration |
| **Vue SPA / React SPA (Vite)** | No | Build-time `robots.txt`/`llms.txt` + build-time JSON-LD only |

See [docs/framework-integration.md](https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/framework-integration.md) and [crawlpod.com/docs/recipes](https://crawlpod.com/docs/recipes) for runnable examples.

---

## How the AI Readiness Score Works

The **AI Readiness Score** (0-100) is computed from 30 checks across 6 categories with fixed, published weights:

```
overall = (crawlability × 0.20) + (structure × 0.20) + (entitySignals × 0.20)
        + (citationReadiness × 0.15) + (content × 0.15) + (authority × 0.10)
```

Each failed check produces a structured `AuditIssue`:
- `critical` ● — blocks AI citation (e.g., `noindex`, missing H1)
- `warning` ▲ — significantly reduces visibility (e.g., no schema, low fact density)
- `suggestion` ○ — incremental improvement (e.g., add FAQ schema, boost E-E-A-T)

See [docs/scoring.md](https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/scoring.md) for the full check list, weight rationale, and consumption pattern for `dist/scoring-weights.json`.

---

## Changelog

### v0.8.0 — "Know Why You're Invisible" (2026-08-12)
- **New:** `ai-visibility/citations` — `CitationAnalyzer.analyze()` extracts and classifies citation sources from measurement data
- **New:** `ai-visibility/competitor` — `CompetitorAnalyzer.analyze()` generates up to 7 ranked, evidence-backed gap reasons per competitor
- **New CLI:** `citations`, `compare`, `report` commands
- **New:** `--from <file>` flag on all three new commands — reuse saved `measure --json` reports without re-spending API credits
- **Tests:** 293 tests (up from 219)

### v0.7.0 — "Measure What Matters" (2026-08-12)
- **New:** `ai-visibility/engines`, `/prompts`, `/measure` — BYOK adapters + statistical brand visibility measurement
- **New CLI:** `discover`, `measure` commands

### v0.6.0 — "Lighthouse for AI Search" (2026-08-12)
- **New:** `ContentAnalyzer.audit()` — 6-category AI Readiness Engine replacing the flat score
- **New CLI:** `audit`, `lint` commands with `--verbose`, `--json`, `--fail-under`

See [CHANGELOG.md](https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/CHANGELOG.md) for full history.

---

## Related Projects

| Project | Description |
|---------|-------------|
| [ai-visibility-python](https://github.com/Muhammadfaizanjanjua109/ai-visibility-python) | Python port for Django, Flask, FastAPI |


---

## Contributing

- 🐛 [Report bugs](https://github.com/Muhammadfaizanjanjua109/ai-visibility/issues)
- 💡 [Request features](https://github.com/Muhammadfaizanjanjua109/ai-visibility/discussions)
- 🔀 [Submit PRs](https://github.com/Muhammadfaizanjanjua109/ai-visibility/pulls)

Read [CONTRIBUTING.md](https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/CONTRIBUTING.md) and [DEVELOPMENT.md](https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/DEVELOPMENT.md).

---

## License

[MIT](https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/LICENSE) © [Muhammad Faizan Janjua](https://github.com/Muhammadfaizanjanjua109)

<p align="center">
  <i>Built for developers who believe AI visibility should be open, measurable, and actionable.</i><br>
  <b>⭐ Star this repo if it helps — it fuels the open-source GEO ecosystem.</b>
</p>
