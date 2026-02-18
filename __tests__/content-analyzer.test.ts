// ============================================================
// Tests: Content Analyzer
// ============================================================

import { describe, it, expect } from 'vitest'
import { ContentAnalyzer } from '../src/analyzer/content-analyzer'

const analyzer = new ContentAnalyzer()

const GOOD_HTML = `
<html>
<head>
  <meta name="author" content="Jane Doe">
  <meta property="og:site_name" content="MyApp">
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[]}
  </script>
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"Organization","name":"MyApp"}
  </script>
</head>
<body>
  <main>
    <h1>What is AI Visibility?</h1>
    <p>AI visibility is the practice of optimizing your website so that AI models like ChatGPT and Gemini can discover, understand, and cite your content. This involves 3 key steps.</p>
    
    <h2>Why It Matters</h2>
    <p>In 2024, over 40% of web searches now involve AI-generated answers. Companies that optimize for AI visibility see 3x more citations in AI responses.</p>
    
    <h2>How to Get Started</h2>
    <p>Start by installing ai-visibility package. It takes less than 10 minutes to set up and provides immediate benefits for your AI discoverability.</p>
    
    <h3>Step 1: Install</h3>
    <p>Run npm install ai-visibility in your project directory to get started with the package.</p>
    
    <h3>Step 2: Configure</h3>
    <p>Run npx ai-visibility init to auto-generate your robots.txt and llms.txt files automatically.</p>
  </main>
  <footer>
    <a href="mailto:hello@myapp.com">Contact us</a>
    <p>Trusted by 5,000+ developers worldwide since 2023</p>
  </footer>
</body>
</html>
`

const POOR_HTML = `
<html>
<head></head>
<body>
  <h3>Some Subheading</h3>
  <p>Welcome to our amazing platform!</p>
  <h3>Another Thing</h3>
  <p>We are the best!</p>
</body>
</html>
`

describe('ContentAnalyzer', () => {
    it('scores well-structured content highly', async () => {
        const result = await analyzer.analyze(GOOD_HTML)
        expect(result.overallScore).toBeGreaterThan(60)
        expect(result.breakdown).toBeDefined()
        expect(result.issues).toBeInstanceOf(Array)
        expect(result.recommendations).toBeInstanceOf(Array)
    })

    it('scores poorly structured content low', async () => {
        const result = await analyzer.analyze(POOR_HTML)
        expect(result.overallScore).toBeLessThan(60)
    })

    it('detects missing H1', async () => {
        const result = await analyzer.analyze(POOR_HTML)
        const h1Issue = result.issues.find((i) => i.type === 'heading-structure' && i.message.includes('H1'))
        expect(h1Issue).toBeDefined()
        expect(h1Issue?.severity).toBe('high')
    })

    it('detects missing schema', async () => {
        const result = await analyzer.analyze(POOR_HTML)
        const schemaIssue = result.issues.find((i) => i.type === 'schema')
        expect(schemaIssue).toBeDefined()
    })

    it('detects missing E-E-A-T signals', async () => {
        const result = await analyzer.analyze(POOR_HTML)
        const eeatIssues = result.issues.filter((i) => i.type === 'eeat')
        expect(eeatIssues.length).toBeGreaterThan(0)
    })

    it('returns issues sorted by severity (high first)', async () => {
        const result = await analyzer.analyze(POOR_HTML)
        const severities = result.issues.map((i) => i.severity)
        const order = { high: 0, medium: 1, low: 2 }
        for (let i = 0; i < severities.length - 1; i++) {
            expect(order[severities[i]!]).toBeLessThanOrEqual(order[severities[i + 1]!])
        }
    })

    it('returns breakdown with all 6 dimensions', async () => {
        const result = await analyzer.analyze(GOOD_HTML)
        expect(result.breakdown).toHaveProperty('answerFrontLoading')
        expect(result.breakdown).toHaveProperty('factDensity')
        expect(result.breakdown).toHaveProperty('headingStructure')
        expect(result.breakdown).toHaveProperty('eeatSignals')
        expect(result.breakdown).toHaveProperty('snippability')
        expect(result.breakdown).toHaveProperty('schemaCoverage')
    })

    it('detects heading level skip', async () => {
        const html = '<html><body><h1>Title</h1><h3>Skipped H2</h3><p>Content here that is long enough to be meaningful.</p></body></html>'
        const result = await analyzer.analyze(html)
        const skipIssue = result.issues.find((i) => i.message.includes('skipped'))
        expect(skipIssue).toBeDefined()
    })

    it('respects disabled checks', async () => {
        const customAnalyzer = new ContentAnalyzer({
            checkEEAT: false,
            checkSchema: false,
        })
        const result = await customAnalyzer.analyze(POOR_HTML)
        const eeatIssues = result.issues.filter((i) => i.type === 'eeat')
        const schemaIssues = result.issues.filter((i) => i.type === 'schema')
        expect(eeatIssues).toHaveLength(0)
        expect(schemaIssues).toHaveLength(0)
    })

    it('scores are between 0 and 100', async () => {
        const result = await analyzer.analyze(GOOD_HTML)
        expect(result.overallScore).toBeGreaterThanOrEqual(0)
        expect(result.overallScore).toBeLessThanOrEqual(100)
        for (const score of Object.values(result.breakdown)) {
            expect(score).toBeGreaterThanOrEqual(0)
            expect(score).toBeLessThanOrEqual(100)
        }
    })
})
