// ============================================================
// Tests: AI Readiness Engine (ContentAnalyzer.audit / audit-engine.ts)
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { ContentAnalyzer } from '../src/analyzer/content-analyzer'
import type { AuditCategoryKey } from '../src/types'

const CATEGORY_WEIGHTS = ContentAnalyzer.CATEGORY_WEIGHTS
const analyzer = new ContentAnalyzer()

const ALL_CATEGORY_KEYS: AuditCategoryKey[] = ['crawlability', 'structure', 'entitySignals', 'citationReadiness', 'content', 'authority']

const RICH_HTML = `
<html>
<head>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Organization","name":"Acme","url":"https://acme.example","logo":"https://acme.example/logo.png","sameAs":["https://linkedin.com/company/acme","https://en.wikipedia.org/wiki/Acme"]}
  </script>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Person","name":"Jane Doe","jobTitle":"Author"}
  </script>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Product","name":"Acme Widget","offers":{"@type":"Offer","price":"49.00","priceCurrency":"USD"}}
  </script>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What is Acme?","acceptedAnswer":{"@type":"Answer","text":"Acme is a widget platform."}}]}
  </script>
  <meta property="article:modified_time" content="2026-01-01T00:00:00Z">
</head>
<body>
  <header><nav><a href="/about">About</a></nav></header>
  <main>
    <article>
      <h1>Acme Widgets is the fastest way to ship IoT hardware</h1>
      <p>Acme Widgets is a platform that helps engineering teams ship IoT hardware 40% faster, according to a 2024 study by Acme Research. <a href="https://example-authority.com/report">See the full report</a>.</p>
      <time datetime="2026-01-01">Last updated January 2026</time>

      <h2>Pricing</h2>
      <p>Our starter plan is $49/month and includes 5 devices. View <a href="/pricing">pricing</a>.</p>

      <h2>Acme vs Competitor: comparison</h2>
      <table><caption>Acme vs Competitor</caption><tr><td>Acme</td><td>Competitor</td></tr></table>

      <h2>Why teams choose us</h2>
      <p>We surveyed 400 companies for our original research and found 92% reported faster shipping. We are certified and trusted by 400 companies worldwide.</p>
      <ul><li>Fast</li><li>Reliable</li></ul>

      <h2>FAQ</h2>
      <h3>What is Acme?</h3>
      <p>Acme is a widget platform built for hardware teams, with a full engineering staff dedicated to support.</p>
    </article>
  </main>
  <footer>
    <a href="mailto:hi@acme.example">Contact</a>
    <a href="/about">About us</a>
    <a rel="author" href="/authors/jane-doe">Jane Doe</a>
  </footer>
</body>
</html>
`

const BLOCKED_META_HTML = `
<html><head><meta name="robots" content="noindex, nofollow"></head>
<body><main><h1>Blocked page</h1><p>This page is deliberately noindexed for testing purposes here.</p></main></body></html>
`

const THIN_HTML = `
<html><head></head><body><h3>Some Subheading</h3><p>Welcome to our platform!</p></body></html>
`

describe('CATEGORY_WEIGHTS', () => {
    it('sums to 1.0', () => {
        const total = CATEGORY_WEIGHTS.reduce((sum, c) => sum + c.weight, 0)
        expect(total).toBeCloseTo(1, 5)
    })

    it('covers exactly the six AuditCategoryKey values, no more no less', () => {
        const keys = CATEGORY_WEIGHTS.map((c) => c.key).sort()
        expect(keys).toEqual([...ALL_CATEGORY_KEYS].sort())
    })

    it('every entry has a label and description', () => {
        for (const c of CATEGORY_WEIGHTS) {
            expect(c.label.length).toBeGreaterThan(0)
            expect(c.description.length).toBeGreaterThan(0)
        }
    })
})

describe('ContentAnalyzer.audit — category aggregation', () => {
    it('produces all six categories, each with a 0-100 score and a non-empty checks array', async () => {
        const result = await analyzer.audit(RICH_HTML)
        expect(Object.keys(result.categories).sort()).toEqual([...ALL_CATEGORY_KEYS].sort())
        for (const key of ALL_CATEGORY_KEYS) {
            const cat = result.categories[key]
            expect(cat.score).toBeGreaterThanOrEqual(0)
            expect(cat.score).toBeLessThanOrEqual(100)
            expect(cat.checks.length).toBeGreaterThan(0)
            expect(cat.weight).toBeGreaterThan(0)
        }
    })

    it('scores rich, well-marked-up content highly overall', async () => {
        const result = await analyzer.audit(RICH_HTML)
        expect(result.overall).toBeGreaterThan(70)
    })

    it('scores thin, unmarked content low overall', async () => {
        const result = await analyzer.audit(THIN_HTML)
        expect(result.overall).toBeLessThan(50)
    })

    it('overall is the weighted average of category scores (when not hard-gated)', async () => {
        const result = await analyzer.audit(RICH_HTML)
        const expected = Math.round(
            CATEGORY_WEIGHTS.reduce((sum, c) => sum + result.categories[c.key].score * c.weight, 0)
        )
        expect(result.overall).toBe(expected)
    })

    it('sorts issues critical -> warning -> suggestion', async () => {
        const result = await analyzer.audit(THIN_HTML)
        const order = { critical: 0, warning: 1, suggestion: 2 }
        for (let i = 1; i < result.issues.length; i++) {
            expect(order[result.issues[i - 1]!.severity]).toBeLessThanOrEqual(order[result.issues[i]!.severity])
        }
    })

    it('each issue carries a score_impact equal to 100 minus its check score', async () => {
        const result = await analyzer.audit(THIN_HTML)
        expect(result.issues.length).toBeGreaterThan(0)
        for (const issue of result.issues) {
            const check = Object.values(result.categories)
                .flatMap((c) => c.checks)
                .find((c) => c.id === issue.id)
            expect(check).toBeDefined()
            expect(issue.score_impact).toBe(100 - check!.score)
        }
    })
})

describe('ContentAnalyzer.audit — crawlability hard gate', () => {
    it('zeroes the overall score when <meta name="robots"> blocks indexing, while categories keep their own scores', async () => {
        const result = await analyzer.audit(BLOCKED_META_HTML)
        expect(result.overall).toBe(0)
        expect(result.categories.structure.score).toBeGreaterThan(0)
        const blockIssue = result.issues.find((i) => i.id === 'crawl-robots-ai-access')
        expect(blockIssue?.severity).toBe('critical')
    })

    it('zeroes the overall score when robots.txt blocks every known AI crawler', async () => {
        const result = await analyzer.audit(RICH_HTML, { robotsTxt: 'User-agent: *\nDisallow: /\n' })
        expect(result.overall).toBe(0)
    })

    it('does not hard-gate when robots.txt only blocks some crawlers', async () => {
        const result = await analyzer.audit(RICH_HTML, { robotsTxt: 'User-agent: GPTBot\nDisallow: /\n\nUser-agent: *\nAllow: /\n' })
        expect(result.overall).toBeGreaterThan(0)
        const issue = result.issues.find((i) => i.id === 'crawl-robots-ai-access')
        expect(issue?.severity).toBe('warning')
    })

    it('does not hard-gate a normal, unblocked page', async () => {
        const result = await analyzer.audit(RICH_HTML, { robotsTxt: 'User-agent: *\nAllow: /\n' })
        expect(result.overall).toBeGreaterThan(0)
    })
})

describe('ContentAnalyzer.audit — entity signal checks', () => {
    it('gives full marks for a complete Organization schema', async () => {
        const result = await analyzer.audit(RICH_HTML)
        const check = result.categories.entitySignals.checks.find((c) => c.id === 'entity-organization-schema')
        expect(check?.score).toBe(100)
    })

    it('flags a critical issue when Organization schema is missing entirely', async () => {
        const result = await analyzer.audit(THIN_HTML)
        const issue = result.issues.find((i) => i.id === 'entity-organization-schema')
        expect(issue?.severity).toBe('critical')
        expect(issue?.title).toContain('No Organization schema found')
    })

    it('treats product/pricing checks as not-applicable (score 100, no issue) when the page has no commercial signals', async () => {
        const nonCommercialHtml = '<html><body><main><h1>A blog post about hiking</h1><p>Hiking is a great outdoor activity for all fitness levels and ages.</p></main></body></html>'
        const result = await analyzer.audit(nonCommercialHtml)
        const productIssue = result.issues.find((i) => i.id === 'entity-product-relationships')
        const pricingIssue = result.issues.find((i) => i.id === 'entity-pricing-machine-readable')
        expect(productIssue).toBeUndefined()
        expect(pricingIssue).toBeUndefined()
    })

    it('flags a critical issue for pricing text with no Offer schema', async () => {
        const html = '<html><body><main><h1>Pricing</h1><p>Our plan costs $99 per month with no contract required at all.</p></main></body></html>'
        const result = await analyzer.audit(html)
        const issue = result.issues.find((i) => i.id === 'entity-pricing-machine-readable')
        expect(issue?.severity).toBe('critical')
    })
})

describe('ContentAnalyzer.audit — backward compatibility (score/dimensions)', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('exposes the old flat `score` mirroring `overall`', async () => {
        const result = await analyzer.audit(RICH_HTML)
        expect(result.score).toBe(result.overall)
    })

    it('exposes `dimensions` with the old seven AIReadabilityScore keys', async () => {
        const result = await analyzer.audit(RICH_HTML)
        expect(Object.keys(result.dimensions).sort()).toEqual(
            ['answerFrontLoading', 'crawlerAccessibility', 'eeatSignals', 'factDensity', 'headingStructure', 'schemaCoverage', 'snippability'].sort()
        )
        for (const value of Object.values(result.dimensions)) {
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThanOrEqual(100)
        }
    })

    it('warns once on first access to `score`, not on subsequent accesses', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const result = await analyzer.audit(RICH_HTML)
        expect(warn).not.toHaveBeenCalled()
        // eslint-disable-next-line no-unused-expressions
        result.score
        expect(warn).toHaveBeenCalledTimes(1)
        // eslint-disable-next-line no-unused-expressions
        result.score
        expect(warn).toHaveBeenCalledTimes(1)
    })

    it('warns once on first access to `dimensions`, independently of `score`', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const result = await analyzer.audit(RICH_HTML)
        // eslint-disable-next-line no-unused-expressions
        result.dimensions
        expect(warn).toHaveBeenCalledTimes(1)
        // eslint-disable-next-line no-unused-expressions
        result.score
        expect(warn).toHaveBeenCalledTimes(2)
    })

    it('does not include `score`/`dimensions` in JSON.stringify output (non-enumerable) so serializing a result never warns', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const result = await analyzer.audit(RICH_HTML)
        const json = JSON.parse(JSON.stringify(result))
        expect(json).not.toHaveProperty('score')
        expect(json).not.toHaveProperty('dimensions')
        expect(json).toHaveProperty('overall')
        expect(json).toHaveProperty('categories')
        expect(json).toHaveProperty('issues')
        expect(warn).not.toHaveBeenCalled()
    })
})
