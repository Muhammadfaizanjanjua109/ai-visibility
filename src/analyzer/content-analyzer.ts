// ============================================================
// Content Analyzer
// Feature 4: Score HTML/Markdown for AI readability
// ============================================================

import * as cheerio from 'cheerio'
import type { AIReadabilityScore, AnalysisIssue, AnalyzerOptions } from '../types'

const DEFAULT_OPTIONS: Required<AnalyzerOptions> = {
    checkAnswerPlacement: true,
    checkFactDensity: true,
    checkHeadingStructure: true,
    checkEEAT: true,
    checkSnippability: true,
    checkSchema: true,
}

/**
 * ContentAnalyzer
 *
 * Analyzes HTML content and scores it for AI readability.
 * Returns an overall score (0-100) and specific, actionable issues.
 *
 * @example
 * ```ts
 * import { ContentAnalyzer } from 'ai-visibility'
 * import fs from 'fs'
 *
 * const analyzer = new ContentAnalyzer()
 * const html = fs.readFileSync('./pages/pricing.html', 'utf-8')
 * const result = await analyzer.analyze(html)
 *
 * console.log(`Score: ${result.overallScore}/100`)
 * result.issues.forEach(i => console.log(`[${i.severity}] ${i.message}`))
 * ```
 */
export class ContentAnalyzer {
    private options: Required<AnalyzerOptions>

    constructor(options: AnalyzerOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options }
    }

    /**
     * Analyze HTML content and return an AI readability score.
     */
    async analyze(html: string): Promise<AIReadabilityScore> {
        const $ = cheerio.load(html)
        const issues: AnalysisIssue[] = []
        const breakdown: AIReadabilityScore['breakdown'] = {
            answerFrontLoading: 0,
            factDensity: 0,
            headingStructure: 0,
            eeatSignals: 0,
            snippability: 0,
            schemaCoverage: 0,
        }

        if (this.options.checkAnswerPlacement) {
            const result = this.checkAnswerFrontLoading($)
            breakdown.answerFrontLoading = result.score
            issues.push(...result.issues)
        } else {
            breakdown.answerFrontLoading = 100
        }

        if (this.options.checkFactDensity) {
            const result = this.checkFactDensity($)
            breakdown.factDensity = result.score
            issues.push(...result.issues)
        } else {
            breakdown.factDensity = 100
        }

        if (this.options.checkHeadingStructure) {
            const result = this.checkHeadingStructure($)
            breakdown.headingStructure = result.score
            issues.push(...result.issues)
        } else {
            breakdown.headingStructure = 100
        }

        if (this.options.checkEEAT) {
            const result = this.checkEEAT($)
            breakdown.eeatSignals = result.score
            issues.push(...result.issues)
        } else {
            breakdown.eeatSignals = 100
        }

        if (this.options.checkSnippability) {
            const result = this.checkSnippability($)
            breakdown.snippability = result.score
            issues.push(...result.issues)
        } else {
            breakdown.snippability = 100
        }

        if (this.options.checkSchema) {
            const result = this.checkSchemaCoverage($)
            breakdown.schemaCoverage = result.score
            issues.push(...result.issues)
        } else {
            breakdown.schemaCoverage = 100
        }

        // Weighted average (answer placement and schema are most important)
        const weights = {
            answerFrontLoading: 0.25,
            factDensity: 0.15,
            headingStructure: 0.15,
            eeatSignals: 0.20,
            snippability: 0.10,
            schemaCoverage: 0.15,
        }

        const overallScore = Math.round(
            Object.entries(breakdown).reduce((sum, [key, score]) => {
                return sum + score * (weights[key as keyof typeof weights] ?? 0)
            }, 0)
        )

        const recommendations = this.generateRecommendations(breakdown)

        return {
            overallScore,
            breakdown,
            issues: issues.sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 }
                return order[a.severity] - order[b.severity]
            }),
            recommendations,
        }
    }

    // ---- Individual Checks ----

    private checkAnswerFrontLoading($: cheerio.CheerioAPI): { score: number; issues: AnalysisIssue[] } {
        const issues: AnalysisIssue[] = []
        const h1 = $('h1').first()

        if (!h1.length) {
            issues.push({
                type: 'answer-placement',
                severity: 'high',
                message: 'No H1 tag found on the page',
                fix: 'Add a clear, descriptive H1 tag that states what this page is about',
            })
            return { score: 0, issues }
        }

        // Find the first paragraph in the main content area
        const mainContent = $('main, article, [role="main"], .content, #content').first()
        const firstP = mainContent.length
            ? mainContent.find('p').first()
            : $('h1').first().nextAll('p').first()

        const firstPText = firstP.text().trim()

        if (!firstPText || firstPText.length < 30) {
            issues.push({
                type: 'answer-placement',
                severity: 'high',
                message: 'No substantive paragraph found after H1',
                fix: 'Add a clear, direct answer or description in the first paragraph immediately after your H1',
            })
            return { score: 20, issues }
        }

        // Check if the first paragraph directly answers the H1
        const h1Text = h1.text().toLowerCase()
        const answerWords = ['is', 'are', 'helps', 'provides', 'enables', 'allows', 'lets', 'gives', 'makes']
        const hasDirectAnswer = answerWords.some((w) => firstPText.toLowerCase().includes(w))

        // Check if answer is within first 20% of total content
        const allText = $('body').text()
        const firstPPosition = allText.indexOf(firstPText.slice(0, 50))
        const positionRatio = firstPPosition / allText.length

        if (!hasDirectAnswer) {
            issues.push({
                type: 'answer-placement',
                severity: 'medium',
                message: 'First paragraph may not directly answer the page topic',
                fix: `Start with a direct statement like "This page covers..." or "${h1Text} is..."`,
            })
            return { score: 55, issues }
        }

        if (positionRatio > 0.2) {
            issues.push({
                type: 'answer-placement',
                severity: 'medium',
                message: 'Main answer appears too far down the page',
                fix: 'Move the key answer/description to the very top of the page content',
            })
            return { score: 65, issues }
        }

        return { score: 95, issues }
    }

    private checkFactDensity($: cheerio.CheerioAPI): { score: number; issues: AnalysisIssue[] } {
        const issues: AnalysisIssue[] = []
        const paragraphs = $('p')
        let totalWords = 0
        let verifiableFacts = 0

        paragraphs.each((_, el) => {
            const text = $(el).text()
            const words = text.split(/\s+/).filter(Boolean).length
            totalWords += words

            // Heuristic: numbers, percentages, dates, named entities
            const facts = (
                text.match(
                    /\b\d+(?:\.\d+)?%|\b\d{4}\b|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|thousand|k|m|b)?\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi
                ) ?? []
            ).length
            verifiableFacts += facts
        })

        if (totalWords === 0) {
            return { score: 0, issues: [{ type: 'fact-density', severity: 'high', message: 'No paragraph content found', fix: 'Add substantive text content to the page' }] }
        }

        const factsPerHundred = (verifiableFacts / totalWords) * 100

        if (factsPerHundred < 2) {
            issues.push({
                type: 'fact-density',
                severity: 'high',
                message: `Very low fact density: ${factsPerHundred.toFixed(1)} facts per 100 words (target: 4-6)`,
                fix: 'Add specific numbers, dates, statistics, or measurable claims to support your content',
            })
            return { score: 25, issues }
        }

        if (factsPerHundred < 4) {
            issues.push({
                type: 'fact-density',
                severity: 'medium',
                message: `Below-target fact density: ${factsPerHundred.toFixed(1)} facts per 100 words (target: 4-6)`,
                fix: 'Include more specific data points, percentages, or concrete examples',
            })
            return { score: 60, issues }
        }

        if (factsPerHundred > 10) {
            issues.push({
                type: 'fact-density',
                severity: 'low',
                message: 'Very high fact density — content may feel dense or list-heavy',
                fix: 'Add explanatory prose between data points to improve readability',
            })
            return { score: 75, issues }
        }

        return { score: 95, issues }
    }

    private checkHeadingStructure($: cheerio.CheerioAPI): { score: number; issues: AnalysisIssue[] } {
        const issues: AnalysisIssue[] = []
        let score = 100

        const h1Count = $('h1').length
        const h2s = $('h2')
        const h3s = $('h3')

        // Must have exactly one H1
        if (h1Count === 0) {
            issues.push({ type: 'heading-structure', severity: 'high', message: 'Missing H1 tag', fix: 'Add exactly one H1 tag as the main page title' })
            score -= 40
        } else if (h1Count > 1) {
            issues.push({ type: 'heading-structure', severity: 'medium', message: `Multiple H1 tags found (${h1Count})`, fix: 'Use only one H1 per page. Demote additional H1s to H2' })
            score -= 20
        }

        // Check H3 without H2
        if (h3s.length > 0 && h2s.length === 0) {
            issues.push({ type: 'heading-structure', severity: 'medium', message: 'H3 tags used without any H2 tags', fix: 'Add H2 headings to create proper hierarchy: H1 → H2 → H3' })
            score -= 20
        }

        // Check for skipped levels (H1 → H3 without H2)
        let lastLevel = 1
        $('h1, h2, h3, h4').each((_, el) => {
            const level = parseInt(el.tagName.replace('h', ''), 10)
            if (level > lastLevel + 1) {
                issues.push({
                    type: 'heading-structure',
                    severity: 'low',
                    message: `Heading level skipped: H${lastLevel} → H${level}`,
                    fix: `Add an H${lastLevel + 1} between your H${lastLevel} and H${level}`,
                })
                score -= 10
            }
            lastLevel = level
        })

        // Check for empty headings
        $('h1, h2, h3').each((_, el) => {
            if (!$(el).text().trim()) {
                issues.push({ type: 'heading-structure', severity: 'medium', message: 'Empty heading tag found', fix: 'Remove or fill empty heading tags' })
                score -= 10
            }
        })

        return { score: Math.max(0, score), issues }
    }

    private checkEEAT($: cheerio.CheerioAPI): { score: number; issues: AnalysisIssue[] } {
        const issues: AnalysisIssue[] = []
        let score = 0
        const MAX = 100

        // Author info (25 pts)
        const hasAuthor =
            $('[itemtype*="Person"], [itemprop="author"], meta[name="author"], .author, [rel="author"]').length > 0 ||
            $('body').text().match(/written by|by [A-Z][a-z]+ [A-Z][a-z]+/i) !== null

        if (hasAuthor) {
            score += 25
        } else {
            issues.push({
                type: 'eeat',
                severity: 'medium',
                message: 'No author information detected',
                fix: 'Add author name with a link to their bio or use schema.org Person markup',
            })
        }

        // Organization info (25 pts)
        const hasOrg =
            $('[itemtype*="Organization"], [itemprop="publisher"]').length > 0 ||
            $('meta[property="og:site_name"]').length > 0

        if (hasOrg) {
            score += 25
        } else {
            issues.push({
                type: 'eeat',
                severity: 'low',
                message: 'No organization/publisher markup found',
                fix: 'Add Organization schema or og:site_name meta tag',
            })
        }

        // Contact info (25 pts)
        const hasContact =
            $('a[href^="mailto:"], a[href^="tel:"], [role="contentinfo"], footer').length > 0

        if (hasContact) {
            score += 25
        } else {
            issues.push({
                type: 'eeat',
                severity: 'medium',
                message: 'No contact information found',
                fix: 'Add email, phone, or contact page link — AI models use this as a trust signal',
            })
        }

        // Trust signals (25 pts)
        const bodyText = $('body').text()
        const trustSignals = [
            /years?\s+(?:of\s+)?experience/i,
            /certified|certification/i,
            /award|recognized/i,
            /published|featured in/i,
            /trusted by|used by/i,
            /\d+\s*(?:k|,000)?\s*(?:users|customers|companies)/i,
        ]

        const hasTrustSignals = trustSignals.some((pattern) => pattern.test(bodyText))

        if (hasTrustSignals) {
            score += 25
        } else {
            issues.push({
                type: 'eeat',
                severity: 'low',
                message: 'No expertise/trust signals detected',
                fix: 'Add credentials, years of experience, customer counts, or press mentions',
            })
        }

        return { score: Math.min(score, MAX), issues }
    }

    private checkSnippability($: cheerio.CheerioAPI): { score: number; issues: AnalysisIssue[] } {
        const issues: AnalysisIssue[] = []
        const headings = $('h2, h3')

        if (headings.length === 0) {
            issues.push({
                type: 'snippability',
                severity: 'medium',
                message: 'No H2/H3 subheadings found',
                fix: 'Break content into sections with descriptive H2/H3 headings so AI can extract individual sections',
            })
            return { score: 30, issues }
        }

        let snippableCount = 0
        let totalChecked = 0

        headings.each((_, el) => {
            totalChecked++
            const nextEl = $(el).next()
            const nextText = nextEl.text().trim()

            // A section is "snippable" if it has a substantive paragraph following it
            if (nextText.length >= 80) {
                snippableCount++
            } else {
                issues.push({
                    type: 'snippability',
                    severity: 'low',
                    message: `Section "${$(el).text().trim()}" has insufficient content below it`,
                    fix: 'Add at least 2-3 sentences of context below each heading so the section can stand alone',
                })
            }
        })

        const ratio = snippableCount / Math.max(totalChecked, 1)
        const score = Math.round(ratio * 100)

        return { score, issues }
    }

    private checkSchemaCoverage($: cheerio.CheerioAPI): { score: number; issues: AnalysisIssue[] } {
        const issues: AnalysisIssue[] = []
        const schemaScripts = $('script[type="application/ld+json"]')

        if (schemaScripts.length === 0) {
            issues.push({
                type: 'schema',
                severity: 'high',
                message: 'No JSON-LD structured data found',
                fix: 'Add JSON-LD schema markup using SchemaBuilder from ai-visibility',
            })
            return { score: 0, issues }
        }

        let validSchemas = 0
        schemaScripts.each((_, el) => {
            try {
                const json = JSON.parse($(el).html() ?? '')
                if (json['@context'] && json['@type']) validSchemas++
            } catch {
                issues.push({
                    type: 'schema',
                    severity: 'medium',
                    message: 'Invalid JSON-LD schema found (parse error)',
                    fix: 'Validate your JSON-LD using schema.org validator or use SchemaBuilder',
                })
            }
        })

        if (validSchemas === 0) {
            return { score: 10, issues }
        }

        // Check for recommended schema types
        const schemaText = $('script[type="application/ld+json"]').text()
        const hasFAQ = schemaText.includes('"FAQPage"')
        const hasOrg = schemaText.includes('"Organization"')

        if (!hasFAQ) {
            issues.push({
                type: 'schema',
                severity: 'low',
                message: 'No FAQPage schema found',
                fix: 'Add FAQ schema to help AI models extract Q&A content from your page',
            })
        }

        if (!hasOrg) {
            issues.push({
                type: 'schema',
                severity: 'low',
                message: 'No Organization schema found',
                fix: 'Add Organization schema to establish E-E-A-T signals for AI models',
            })
        }

        const score = hasFAQ && hasOrg ? 100 : hasFAQ || hasOrg ? 75 : 50
        return { score, issues }
    }

    // ---- Recommendations ----

    private generateRecommendations(breakdown: AIReadabilityScore['breakdown']): string[] {
        const recs: string[] = []

        if (breakdown.answerFrontLoading < 70) {
            recs.push('📌 Front-load your answers: AI models prioritize content in the first 20% of a section')
        }
        if (breakdown.factDensity < 60) {
            recs.push('📊 Add more data: Include specific numbers, dates, and statistics to improve citability')
        }
        if (breakdown.headingStructure < 80) {
            recs.push('🏗️ Fix heading hierarchy: Use H1 → H2 → H3 consistently for better content parsing')
        }
        if (breakdown.eeatSignals < 60) {
            recs.push('🏆 Boost E-E-A-T: Add author credentials, company info, and trust signals')
        }
        if (breakdown.snippability < 70) {
            recs.push('✂️ Improve snippability: Each section should be self-contained and informative')
        }
        if (breakdown.schemaCoverage < 50) {
            recs.push('🔖 Add structured data: Use SchemaBuilder to add JSON-LD markup for AI understanding')
        }

        if (recs.length === 0) {
            recs.push('✅ Great job! Your content is well-optimized for AI visibility')
        }

        return recs
    }
}
