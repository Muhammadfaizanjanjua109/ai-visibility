// ============================================================
// AI Readiness Engine (v0.6.0)
// Scores HTML across six weighted categories (crawlability, structure,
// entity signals, citation readiness, content, authority), each made up of
// named checks, and produces a structured issue list. See docs/scoring.md.
//
// Deliberately independent of content-analyzer.ts's `analyze()` — that
// method and its `AIReadabilityScore` return type are kept unchanged for
// backward compatibility. `runAudit()` re-parses the HTML with its own
// `cheerio.load()` call and runs its own checks; the only code shared with
// `analyze()` is `isBlockedInRobotsTxt` (imported from ./robots-block, not
// content-analyzer.ts, to avoid a circular import — content-analyzer.ts
// imports `runAudit` from this file for `ContentAnalyzer.audit()`).
// ============================================================

import * as cheerio from 'cheerio'
import type { CheerioAPI } from 'cheerio'
import type {
    AnalysisContext,
    AuditCategoryKey,
    AuditCheckResult,
    AuditIssue,
    AuditResult,
    AuditSeverity,
} from '../types'
import { AI_CRAWLERS } from '../data/crawlers'
import { CATEGORY_WEIGHTS } from './scoring-weights'
import { isBlockedInRobotsTxt } from './robots-block'

interface IssueDetails {
    severity: AuditSeverity
    title: string
    description: string
    impact: string
}

interface CheckOutcome {
    score: number
    issue?: IssueDetails
}

interface CheckDef {
    id: string
    label: string
    category: AuditCategoryKey
    run: ($: CheerioAPI, ctx: AnalysisContext) => CheckOutcome
}

// ---- Shared helpers ----

/** Parses every JSON-LD script tag, flattening `@graph` arrays. Malformed JSON is silently skipped — schema *validity* isn't this engine's job. */
function collectJsonLd($: CheerioAPI): Record<string, unknown>[] {
    const nodes: Record<string, unknown>[] = []
    $('script[type="application/ld+json"]').each((_, el) => {
        let parsed: unknown
        try {
            parsed = JSON.parse($(el).html() ?? '')
        } catch {
            return
        }
        const items = Array.isArray(parsed) ? parsed : [parsed]
        for (const item of items) {
            if (item && typeof item === 'object') {
                const graph = (item as Record<string, unknown>)['@graph']
                if (Array.isArray(graph)) {
                    nodes.push(...graph.filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === 'object'))
                } else {
                    nodes.push(item as Record<string, unknown>)
                }
            }
        }
    })
    return nodes
}

function findSchemaType(jsonLd: Record<string, unknown>[], type: string): Record<string, unknown> | undefined {
    return jsonLd.find((n) => {
        const t = n['@type']
        return t === type || (Array.isArray(t) && t.includes(type))
    })
}

interface CrawlBlockInfo {
    isNoindex: boolean
    metaRobots: string
    blockedBots: string[]
    fullyBlocked: boolean
}

/**
 * Detects an outright AI-crawler block: `<meta name="robots">`
 * noindex/none, or a robots.txt that disallows every known AI crawler.
 * Used both by the `crawl-robots-ai-access` check (for its own score) and
 * by `runAudit` (to decide whether to hard-gate the overall score to 0).
 */
function analyzeCrawlBlock($: CheerioAPI, ctx: AnalysisContext): CrawlBlockInfo {
    const metaRobots = $('meta[name="robots"]').attr('content')?.toLowerCase() ?? ''
    const isNoindex = /\bnoindex\b/.test(metaRobots) || /\bnone\b/.test(metaRobots)
    const blockedBots = ctx.robotsTxt
        ? AI_CRAWLERS.filter((bot) => isBlockedInRobotsTxt(ctx.robotsTxt!, bot.name)).map((bot) => bot.name)
        : []
    const fullyBlocked = isNoindex || (blockedBots.length > 0 && blockedBots.length === AI_CRAWLERS.length)
    return { isNoindex, metaRobots, blockedBots, fullyBlocked }
}

const TRUST_SIGNAL_PATTERNS = [
    /years?\s+(?:of\s+)?experience/i,
    /certified|certification/i,
    /award|recognized/i,
    /published|featured in/i,
    /trusted by|used by/i,
    /\d+\s*(?:k|,000)?\s*(?:users|customers|companies)/i,
]

const AUTHOR_TEXT_PATTERN = /written by|by [A-Z][a-z]+ [A-Z][a-z]+/i

// ---- Checks ----

const CHECKS: CheckDef[] = [
    // -- CRAWLABILITY --
    {
        id: 'crawl-robots-ai-access',
        label: 'Robots.txt AI crawler access',
        category: 'crawlability',
        run: ($, ctx) => {
            const block = analyzeCrawlBlock($, ctx)
            if (block.isNoindex) {
                return {
                    score: 0,
                    issue: {
                        severity: 'critical',
                        title: 'Page blocks AI crawlers via <meta name="robots">',
                        description: `content="${block.metaRobots}" tells every crawler, including AI crawlers, not to index this page.`,
                        impact: 'AI systems cannot discover, retrieve, or cite this page at all.',
                    },
                }
            }
            if (block.blockedBots.length > 0) {
                const allKnown = block.blockedBots.length === AI_CRAWLERS.length
                return {
                    score: allKnown ? 0 : Math.max(0, 100 - block.blockedBots.length * 15),
                    issue: {
                        severity: allKnown ? 'critical' : 'warning',
                        title: `robots.txt blocks ${block.blockedBots.length} AI crawler(s)`,
                        description: `Blocked: ${block.blockedBots.join(', ')}.`,
                        impact: 'Blocked crawlers cannot fetch this page to reference or cite it.',
                    },
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'crawl-llms-txt',
        label: 'llms.txt presence and validity',
        category: 'crawlability',
        run: (_$, ctx) => {
            if (ctx.hasLlmsTxt === undefined) return { score: 100 }
            if (!ctx.hasLlmsTxt) {
                return {
                    score: 40,
                    issue: {
                        severity: 'suggestion',
                        title: 'No llms.txt found',
                        description: 'llms.txt lets AI systems find your key pages without crawling the whole site.',
                        impact: 'Slower, less reliable discovery of your most important pages.',
                    },
                }
            }
            if (ctx.llmsTxtContent !== undefined) {
                const looksValid = /^#\s+\S/m.test(ctx.llmsTxtContent) && /\[.+\]\(.+\)/.test(ctx.llmsTxtContent)
                if (!looksValid) {
                    return {
                        score: 60,
                        issue: {
                            severity: 'suggestion',
                            title: 'llms.txt found but may not follow the expected format',
                            description: 'llms.txt should start with a top-level "# " heading and include markdown links to key pages.',
                            impact: 'AI systems may not parse this file correctly.',
                        },
                    }
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'crawl-ai-txt',
        label: 'ai.txt presence',
        category: 'crawlability',
        run: (_$, ctx) => {
            if (ctx.hasAiTxt === undefined) return { score: 100 }
            if (!ctx.hasAiTxt) {
                return {
                    score: 70,
                    issue: {
                        severity: 'suggestion',
                        title: 'No ai.txt found',
                        description: 'ai.txt is an emerging convention for declaring AI usage permissions.',
                        impact: 'Not yet a major discovery signal, but low-cost to add.',
                    },
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'crawl-sitemap',
        label: 'Sitemap discoverability',
        category: 'crawlability',
        run: (_$, ctx) => {
            if (ctx.hasSitemap === undefined) return { score: 100 }
            if (!ctx.hasSitemap) {
                return {
                    score: 50,
                    issue: {
                        severity: 'warning',
                        title: 'No sitemap.xml discoverable',
                        description: 'No sitemap.xml was found and robots.txt does not reference one.',
                        impact: "AI crawlers and search engines may miss pages that aren't well linked internally.",
                    },
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'crawl-response-time',
        label: 'Crawler response time',
        category: 'crawlability',
        run: (_$, ctx) => {
            if (ctx.responseTimeMs === undefined) return { score: 100 }
            if (ctx.responseTimeMs > 3000) {
                return {
                    score: 30,
                    issue: {
                        severity: 'warning',
                        title: 'Slow response time',
                        description: `The page took ${ctx.responseTimeMs}ms to respond.`,
                        impact: 'Slow or timing-out responses cause crawlers to give up or deprioritize the page.',
                    },
                }
            }
            if (ctx.responseTimeMs > 1200) {
                return {
                    score: 70,
                    issue: {
                        severity: 'suggestion',
                        title: 'Response time could be faster',
                        description: `The page took ${ctx.responseTimeMs}ms to respond.`,
                        impact: 'Crawlers budget limited time per page; slower pages get crawled less often.',
                    },
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'crawl-js-dependency',
        label: 'JavaScript dependency for content access',
        category: 'crawlability',
        run: ($) => {
            const bodyText = $('body').clone().find('script, style, noscript').remove().end().text().replace(/\s+/g, ' ').trim()
            const scriptCount = $('script').length
            const looksLikeSpaRoot = $('#root, #app, #__next, [data-reactroot]').length > 0
            if (bodyText.length < 200 && (looksLikeSpaRoot || scriptCount > 5)) {
                return {
                    score: 20,
                    issue: {
                        severity: 'warning',
                        title: 'Content appears to require JavaScript to render',
                        description: 'Very little text is present in the raw HTML relative to the number of scripts on the page.',
                        impact: 'Most AI crawlers do not execute JavaScript, so they see an empty or near-empty page.',
                    },
                }
            }
            return { score: 100 }
        },
    },

    // -- STRUCTURE --
    {
        id: 'struct-heading-hierarchy',
        label: 'Heading hierarchy quality',
        category: 'structure',
        run: ($) => {
            const h1Count = $('h1').length
            if (h1Count === 0) {
                return {
                    score: 20,
                    issue: {
                        severity: 'warning',
                        title: 'Missing H1 tag',
                        description: 'The page has no H1.',
                        impact: "AI systems use the H1 to understand the page's primary topic.",
                    },
                }
            }
            if (h1Count > 1) {
                return {
                    score: 70,
                    issue: {
                        severity: 'suggestion',
                        title: `Multiple H1 tags found (${h1Count})`,
                        description: 'Pages should have exactly one H1.',
                        impact: 'Ambiguous primary-topic signal.',
                    },
                }
            }
            let skipped = false
            let lastLevel = 1
            $('h1, h2, h3, h4').each((_, el) => {
                const level = parseInt(el.tagName.replace('h', ''), 10)
                if (level > lastLevel + 1) skipped = true
                lastLevel = level
            })
            if (skipped) {
                return {
                    score: 75,
                    issue: {
                        severity: 'suggestion',
                        title: 'Heading levels are skipped',
                        description: 'One or more heading levels jump (e.g. H1 to H3) without the level in between.',
                        impact: 'Breaks the machine-readable outline of the page.',
                    },
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'struct-semantic-html',
        label: 'Semantic HTML usage',
        category: 'structure',
        run: ($) => {
            const landmarks = ['main', 'article', 'nav', 'header', 'footer', 'section'].filter((tag) => $(tag).length > 0)
            const score = Math.round((landmarks.length / 6) * 100)
            if (landmarks.length <= 2) {
                return {
                    score,
                    issue: {
                        severity: 'warning',
                        title: 'Few semantic HTML landmarks',
                        description: `Found: ${landmarks.join(', ') || 'none'}.`,
                        impact: 'Semantic tags help AI systems distinguish real content from navigation/boilerplate.',
                    },
                }
            }
            if (landmarks.length <= 4) {
                return {
                    score,
                    issue: {
                        severity: 'suggestion',
                        title: 'Limited semantic HTML landmarks',
                        description: `Found: ${landmarks.join(', ')}.`,
                        impact: 'A few more landmark elements would make content boundaries clearer.',
                    },
                }
            }
            return { score }
        },
    },
    {
        id: 'struct-content-noise-ratio',
        label: 'Content-to-noise ratio',
        category: 'structure',
        run: ($) => {
            const mainText = $('main, article, [role="main"]').first().text().trim()
            const bodyText = $('body').text().trim()
            const contentText = mainText || bodyText
            const noiseText = $('nav, footer, aside, [class*="ad"], [class*="advert"]').text().trim()
            if (contentText.length === 0) {
                return {
                    score: 0,
                    issue: {
                        severity: 'warning',
                        title: 'No main content found',
                        description: 'No text content was found in the page body.',
                        impact: 'Nothing for an AI system to extract or cite.',
                    },
                }
            }
            const score = Math.round((contentText.length / (contentText.length + noiseText.length)) * 100)
            if (score < 60) {
                return {
                    score,
                    issue: {
                        severity: 'warning',
                        title: 'Low content-to-noise ratio',
                        description: 'Navigation, footer, and ad-related text make up a large share of the page relative to main content.',
                        impact: "AI systems may struggle to isolate your actual content from boilerplate.",
                    },
                }
            }
            return { score }
        },
    },
    {
        // Category is 'answerPlacement', not 'structure', despite the
        // 'struct-' id prefix: the id is left alone deliberately so
        // downstream consumers keyed on check ids keep resolving across the
        // v3 reweight. See CATEGORY_WEIGHTS for why it moved.
        id: 'struct-answer-frontloading',
        label: 'Answer front-loading',
        category: 'answerPlacement',
        run: ($) => {
            const h1 = $('h1').first()
            if (!h1.length) {
                return {
                    score: 0,
                    issue: {
                        severity: 'warning',
                        title: 'No H1 tag found',
                        description: "Without an H1 there's no clear top-level statement of the page's topic.",
                        impact: 'AI systems rely on the H1 + first paragraph to quickly judge relevance.',
                    },
                }
            }
            const mainContent = $('main, article, [role="main"], .content, #content').first()
            const firstP = mainContent.length ? mainContent.find('p').first() : h1.nextAll('p').first()
            const firstPText = firstP.text().trim()
            if (!firstPText || firstPText.length < 30) {
                return {
                    score: 20,
                    issue: {
                        severity: 'warning',
                        title: 'No substantive paragraph found after H1',
                        description: "The page doesn't open with a direct answer or description.",
                        impact: 'AI systems weight opening content most heavily when deciding whether to cite a page.',
                    },
                }
            }
            const answerWords = ['is', 'are', 'helps', 'provides', 'enables', 'allows', 'lets', 'gives', 'makes']
            const hasDirectAnswer = answerWords.some((w) => firstPText.toLowerCase().includes(w))
            if (!hasDirectAnswer) {
                return {
                    score: 55,
                    issue: {
                        severity: 'warning',
                        title: 'First paragraph may not directly answer the page topic',
                        description: "The opening paragraph doesn't read as a direct statement or definition.",
                        impact: 'AI systems may skip past the opening looking for a clearer answer.',
                    },
                }
            }
            const allText = $('body').text()
            const positionRatio = allText.indexOf(firstPText.slice(0, 50)) / allText.length
            if (positionRatio > 0.2) {
                return {
                    score: 65,
                    issue: {
                        severity: 'suggestion',
                        title: 'Main answer appears too far down the page',
                        description: "The first substantive paragraph starts after the first 20% of the page's text.",
                        impact: 'Content buried below the fold is less likely to be used for quick-answer citations.',
                    },
                }
            }
            return { score: 95 }
        },
    },
    {
        id: 'struct-faq-howto',
        label: 'FAQ/How-to structured patterns',
        category: 'structure',
        run: ($) => {
            const jsonLd = collectJsonLd($)
            if (findSchemaType(jsonLd, 'FAQPage') || findSchemaType(jsonLd, 'HowTo')) return { score: 100 }
            const hasFAQHeading = $('h1, h2, h3').filter((_, el) => /faq|frequently asked questions/i.test($(el).text())).length > 0
            const hasHowToHeading = $('h1, h2, h3').filter((_, el) => /^step\s*\d/i.test($(el).text().trim())).length > 0
            if (hasFAQHeading || hasHowToHeading) {
                return {
                    score: 70,
                    issue: {
                        severity: 'suggestion',
                        title: 'FAQ/How-to content found but not marked up with schema',
                        description: 'The page has FAQ- or how-to-style content but no FAQPage/HowTo structured data.',
                        impact: "AI systems can't as reliably parse Q&A or step-by-step content without explicit markup.",
                    },
                }
            }
            return {
                score: 50,
                issue: {
                    severity: 'suggestion',
                    title: 'No FAQ or How-to structured content detected',
                    description: 'An FAQ section with FAQPage schema is one of the highest-leverage additions for AI citation.',
                    impact: 'Missed opportunity for direct-answer citations.',
                },
            }
        },
    },

    // -- ENTITY SIGNALS --
    {
        id: 'entity-organization-schema',
        label: 'Organization schema completeness',
        category: 'entitySignals',
        run: ($) => {
            const org = findSchemaType(collectJsonLd($), 'Organization')
            if (!org) {
                return {
                    score: 0,
                    issue: {
                        severity: 'critical',
                        title: 'No Organization schema found',
                        description: 'No JSON-LD Organization entity was found on the page.',
                        impact: "AI systems can't reliably resolve which company/brand this content belongs to.",
                    },
                }
            }
            const fields = ['name', 'url', 'logo']
            const present = fields.filter((f) => org[f])
            const score = Math.round((present.length / fields.length) * 100)
            if (score < 100) {
                return {
                    score,
                    issue: {
                        severity: 'suggestion',
                        title: 'Organization schema is incomplete',
                        description: `Missing: ${fields.filter((f) => !org[f]).join(', ')}.`,
                        impact: "Incomplete entity data weakens AI systems' confidence linking content to your brand.",
                    },
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'entity-person-schema',
        label: 'Person/Author schema (E-E-A-T)',
        category: 'entitySignals',
        run: ($) => {
            const person = findSchemaType(collectJsonLd($), 'Person')
            if (person) return { score: 100 }
            const hasTextualAuthor = AUTHOR_TEXT_PATTERN.test($('body').text()) || $('[itemprop="author"], [rel="author"], .author').length > 0
            if (hasTextualAuthor) {
                return {
                    score: 55,
                    issue: {
                        severity: 'warning',
                        title: 'Author present but not marked up with Person schema',
                        description: 'An author byline was found in the text/HTML, but no structured Person data.',
                        impact: "AI systems can extract the author's name but can't verify credentials or link to a bio reliably.",
                    },
                }
            }
            return {
                score: 0,
                issue: {
                    severity: 'warning',
                    title: 'No author/Person schema or byline found',
                    description: 'No author information was detected on the page.',
                    impact: 'Content without an identifiable author is a weaker E-E-A-T signal.',
                },
            }
        },
    },
    {
        id: 'entity-product-relationships',
        label: 'Product/Service entity relationships',
        category: 'entitySignals',
        run: ($) => {
            const jsonLd = collectJsonLd($)
            const hasProductSchema = Boolean(findSchemaType(jsonLd, 'Product') || findSchemaType(jsonLd, 'Service') || findSchemaType(jsonLd, 'SoftwareApplication'))
            if (hasProductSchema) return { score: 100 }
            const bodyText = $('body').text()
            const looksCommercial = /\$\s?\d|pricing|buy now|add to cart|subscribe|free trial/i.test(bodyText)
            if (looksCommercial) {
                return {
                    score: 0,
                    issue: {
                        severity: 'critical',
                        title: 'No Product entity relationships',
                        description: 'The page reads like a product/pricing page but has no Product/Service/SoftwareApplication schema.',
                        impact: "AI shopping and comparison surfaces can't reliably represent what you sell.",
                    },
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'entity-sameas-links',
        label: 'sameAs links',
        category: 'entitySignals',
        run: ($) => {
            const jsonLd = collectJsonLd($)
            const sameAsCount = jsonLd.reduce((sum, n) => sum + (Array.isArray(n['sameAs']) ? (n['sameAs'] as unknown[]).length : 0), 0)
            if (sameAsCount > 0) return { score: 100 }
            const socialLinks = $('a[href*="linkedin.com"], a[href*="twitter.com"], a[href*="x.com"], a[href*="wikipedia.org"], a[href*="wikidata.org"], a[href*="facebook.com"], a[href*="instagram.com"], a[href*="github.com"]').length
            if (socialLinks > 0) {
                return {
                    score: 60,
                    issue: {
                        severity: 'suggestion',
                        title: 'Social profile links found but not in sameAs schema',
                        description: "Social/profile links exist on the page but aren't declared via schema.org sameAs.",
                        impact: "AI systems can't confidently connect your entity to its social profiles.",
                    },
                }
            }
            return {
                score: 20,
                issue: {
                    severity: 'suggestion',
                    title: 'No sameAs links to social profiles',
                    description: 'Add sameAs links (LinkedIn, Twitter/X, Wikipedia, Wikidata, etc.) to your Organization/Person schema.',
                    impact: 'Weaker entity disambiguation for AI knowledge graphs.',
                },
            }
        },
    },
    {
        id: 'entity-pricing-machine-readable',
        label: 'Pricing machine-readability',
        category: 'entitySignals',
        run: ($) => {
            const bodyText = $('body').text()
            const hasPricingText = /\$\s?\d+(\.\d{2})?|USD|pricing/i.test(bodyText)
            if (!hasPricingText) return { score: 100 }
            const jsonLd = collectJsonLd($)
            const hasOfferSchema = jsonLd.some((n) => n['offers'] || n['@type'] === 'Offer' || n['price'])
            if (hasOfferSchema) return { score: 100 }
            return {
                score: 0,
                issue: {
                    severity: 'critical',
                    title: 'Pricing not machine-readable',
                    description: 'Pricing text was found on the page but no schema.org Offer/price markup exists.',
                    impact: "AI shopping assistants and comparison tools can't reliably extract your prices.",
                },
            }
        },
    },

    // -- CITATION READINESS --
    {
        id: 'citation-fact-density',
        label: 'Fact density and verifiability',
        category: 'citationReadiness',
        run: ($) => {
            let totalWords = 0
            let verifiableFacts = 0
            $('p').each((_, el) => {
                const text = $(el).text()
                totalWords += text.split(/\s+/).filter(Boolean).length
                verifiableFacts += (
                    text.match(/\b\d+(?:\.\d+)?%|\b\d{4}\b|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|thousand|k|m|b)?\b|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/gi) ?? []
                ).length
            })
            if (totalWords === 0) {
                return {
                    score: 0,
                    issue: {
                        severity: 'warning',
                        title: 'No paragraph content found',
                        description: 'The page has no substantive paragraph text to evaluate.',
                        impact: 'Nothing for an AI system to extract or cite.',
                    },
                }
            }
            const factsPerHundred = (verifiableFacts / totalWords) * 100
            if (factsPerHundred < 2) {
                return {
                    score: 25,
                    issue: {
                        severity: 'warning',
                        title: 'Very low fact density',
                        description: `${factsPerHundred.toFixed(1)} facts per 100 words (target: 4-6).`,
                        impact: 'Content light on concrete numbers/dates is less likely to be cited for factual queries.',
                    },
                }
            }
            if (factsPerHundred < 4) {
                return {
                    score: 60,
                    issue: {
                        severity: 'suggestion',
                        title: 'Below-target fact density',
                        description: `${factsPerHundred.toFixed(1)} facts per 100 words (target: 4-6).`,
                        impact: 'More specific data points would strengthen citability.',
                    },
                }
            }
            return { score: 95 }
        },
    },
    {
        id: 'citation-stats-sourced',
        label: 'Statistics with sources',
        category: 'citationReadiness',
        run: ($) => {
            let statMentions = 0
            let sourcedMentions = 0
            $('p').each((_, el) => {
                const text = $(el).text()
                const stats = (text.match(/\b\d+(?:\.\d+)?%|\b\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion|thousand)\b/gi) ?? []).length
                if (stats === 0) return
                statMentions += stats
                const isSourced = /according to|source:|\[\d+\]|study by|research (?:from|by)/i.test(text) || $(el).find('cite, sup a, a[href]').length > 0
                if (isSourced) sourcedMentions += stats
            })
            if (statMentions === 0) return { score: 100 }
            const score = Math.round((sourcedMentions / statMentions) * 100)
            if (score < 50) {
                return {
                    score,
                    issue: {
                        severity: 'warning',
                        title: 'Statistics lack cited sources',
                        description: `${sourcedMentions}/${statMentions} statistic mentions reference a source.`,
                        impact: 'Unsourced statistics are less likely to be trusted and cited by AI systems.',
                    },
                }
            }
            return { score }
        },
    },
    {
        id: 'citation-unique-data',
        label: 'Unique data/research presence',
        category: 'citationReadiness',
        run: ($) => {
            const bodyText = $('body').text()
            const hasOriginalResearch = /our (?:research|study|survey|analysis|data)|we (?:surveyed|analyzed|studied)|proprietary data|original research/i.test(bodyText)
            if (hasOriginalResearch) return { score: 100 }
            return {
                score: 40,
                issue: {
                    severity: 'suggestion',
                    title: 'No unique data or original research detected',
                    description: 'Content built on your own research, surveys, or proprietary data is more likely to be cited than content that restates common knowledge.',
                    impact: 'Lower differentiation as a citation source versus competitors.',
                },
            }
        },
    },
    {
        id: 'citation-comparison-content',
        label: 'Comparison content availability',
        category: 'citationReadiness',
        run: ($) => {
            const hasComparisonTable = $('table').filter((_, el) => /vs\.?|comparison|compare/i.test($(el).text())).length > 0
            const hasComparisonHeading = $('h1, h2, h3').filter((_, el) => /\bvs\.?\b|comparison|alternatives?/i.test($(el).text())).length > 0
            if (hasComparisonTable || hasComparisonHeading) return { score: 100 }
            return {
                score: 30,
                issue: {
                    severity: 'warning',
                    title: 'No comparison content detected',
                    description: 'No comparison table or "X vs Y"/"alternatives" section was found.',
                    impact: 'AI systems frequently field comparison queries; pages without comparison content are less likely to be cited for them.',
                },
            }
        },
    },
    {
        id: 'citation-external-references',
        label: 'External authoritative references',
        category: 'citationReadiness',
        run: ($) => {
            const external = $('main a[href^="http"], article a[href^="http"], p a[href^="http"]').length
            if (external === 0) {
                return {
                    score: 20,
                    issue: {
                        severity: 'suggestion',
                        title: 'No external authoritative references found',
                        description: "The page doesn't link out to any external sources.",
                        impact: 'Outbound citations to authoritative sources are a trust signal AI systems weigh when evaluating content.',
                    },
                }
            }
            if (external < 3) {
                return {
                    score: 60,
                    issue: {
                        severity: 'suggestion',
                        title: 'Few external references',
                        description: `Only ${external} outbound link(s) to external sources.`,
                        impact: 'More external citations strengthen perceived authority.',
                    },
                }
            }
            return { score: 100 }
        },
    },

    // -- CONTENT --
    {
        id: 'content-snippability',
        label: 'Snippability',
        category: 'content',
        run: ($) => {
            const headings = $('h2, h3')
            if (headings.length === 0) {
                return {
                    score: 30,
                    issue: {
                        severity: 'warning',
                        title: 'No H2/H3 subheadings found',
                        description: 'The page has no subheadings to break content into extractable sections.',
                        impact: 'AI systems extract answers section by section; a page with none is harder to snippet from.',
                    },
                }
            }
            let snippable = 0
            headings.each((_, el) => {
                if ($(el).next().text().trim().length >= 80) snippable++
            })
            const score = Math.round((snippable / headings.length) * 100)
            if (score < 70) {
                return {
                    score,
                    issue: {
                        severity: 'warning',
                        title: 'Some sections are too thin to stand alone',
                        description: `${headings.length - snippable}/${headings.length} section(s) have insufficient content directly below their heading.`,
                        impact: "Thin sections can't be extracted as a self-contained answer.",
                    },
                }
            }
            return { score }
        },
    },
    {
        id: 'content-topical-depth',
        label: 'Topical depth and coverage',
        category: 'content',
        run: ($) => {
            const wordCount = $('body').text().replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
            const sectionCount = $('h2').length
            if (wordCount < 300) {
                return {
                    score: 30,
                    issue: {
                        severity: 'suggestion',
                        title: 'Thin content',
                        description: `Only ~${wordCount} words on the page.`,
                        impact: "Short pages rarely have enough depth to be a preferred citation over more thorough sources.",
                    },
                }
            }
            if (sectionCount < 2 && wordCount < 800) {
                return {
                    score: 60,
                    issue: {
                        severity: 'suggestion',
                        title: 'Limited topical coverage',
                        description: 'The page covers few distinct subtopics (few H2 sections).',
                        impact: 'AI systems favor sources that cover a topic comprehensively.',
                    },
                }
            }
            return { score: 100 }
        },
    },
    {
        id: 'content-freshness',
        label: 'Content freshness signals',
        category: 'content',
        run: ($) => {
            const hasTimeTag = $('time[datetime]').length > 0
            const hasMetaModified = $('meta[property="article:modified_time"], meta[property="article:published_time"]').length > 0
            const hasTextDate = /\b(?:last updated|updated on|published on|published:)\b/i.test($('body').text())
            if (hasTimeTag || hasMetaModified || hasTextDate) return { score: 100 }
            return {
                score: 40,
                issue: {
                    severity: 'suggestion',
                    title: 'Missing last-updated dates on content',
                    description: 'No publish/update date signal was found (no <time datetime>, article:modified_time meta, or "Last updated" text).',
                    impact: 'AI systems weight content freshness; undated content may be treated as stale or unverifiable in age.',
                },
            }
        },
    },
    {
        id: 'content-multi-format',
        label: 'Multi-format support',
        category: 'content',
        run: ($) => {
            const hasList = $('ul, ol').length > 0
            const hasTable = $('table').length > 0
            const hasProse = $('p').length > 0
            const formats = [hasList, hasTable, hasProse].filter(Boolean).length
            const score = Math.round((formats / 3) * 100)
            if (formats < 2) {
                return {
                    score,
                    issue: {
                        severity: 'suggestion',
                        title: 'Single content format only',
                        description: 'The page relies on only one content format (e.g. prose only, no lists or tables).',
                        impact: 'Different query types (comparisons, steps, definitions) are best answered by different formats; variety improves snippability.',
                    },
                }
            }
            return { score }
        },
    },

    // -- AUTHORITY --
    {
        id: 'authority-author-attribution',
        label: 'Author attribution presence and quality',
        category: 'authority',
        run: ($) => {
            const hasAuthorLink = $('[rel="author"], .author a, [itemprop="author"] a').length > 0
            if (hasAuthorLink) return { score: 100 }
            const hasAuthorText = AUTHOR_TEXT_PATTERN.test($('body').text())
            if (hasAuthorText) {
                return {
                    score: 55,
                    issue: {
                        severity: 'warning',
                        title: 'Weak author attribution',
                        description: "An author byline exists but doesn't link to a bio/author page.",
                        impact: "AI systems can't verify the author's expertise without a linked profile.",
                    },
                }
            }
            return {
                score: 0,
                issue: {
                    severity: 'warning',
                    title: 'No author attribution found',
                    description: 'No author byline or author link was found.',
                    impact: 'Anonymous content is weighted lower for E-E-A-T-sensitive citations.',
                },
            }
        },
    },
    {
        id: 'authority-about-team',
        label: 'About page / team page signals',
        category: 'authority',
        run: ($) => {
            const hasAboutLink = $('a').filter((_, el) => /about|team|our story/i.test($(el).text()) || /\/about|\/team/i.test($(el).attr('href') ?? '')).length > 0
            if (hasAboutLink) return { score: 100 }
            return {
                score: 40,
                issue: {
                    severity: 'suggestion',
                    title: 'No About/Team page link found',
                    description: 'No link to an About or Team page was found from this page.',
                    impact: 'About/team pages are a common trust signal both AI systems and users use to verify who is behind the content.',
                },
            }
        },
    },
    {
        id: 'authority-contact-info',
        label: 'Contact information availability',
        category: 'authority',
        run: ($) => {
            const hasContact = $('a[href^="mailto:"], a[href^="tel:"], [role="contentinfo"], footer').length > 0
            if (hasContact) return { score: 100 }
            return {
                score: 0,
                issue: {
                    severity: 'warning',
                    title: 'No contact information found',
                    description: 'No email, phone, or contact page link was found.',
                    impact: 'Contact info is a trust signal AI systems use to gauge legitimacy.',
                },
            }
        },
    },
    {
        id: 'authority-trust-signals',
        label: 'Trust signals',
        category: 'authority',
        run: ($) => {
            const bodyText = $('body').text()
            const hasTrust = TRUST_SIGNAL_PATTERNS.some((p) => p.test(bodyText))
            if (hasTrust) return { score: 100 }
            return {
                score: 30,
                issue: {
                    severity: 'suggestion',
                    title: 'No expertise/trust signals detected',
                    description: 'No credentials, years of experience, customer counts, or press mentions were found.',
                    impact: "Trust signals help AI systems corroborate claims made in the content.",
                },
            }
        },
    },
    {
        id: 'authority-external-mention-readiness',
        label: 'External mention readiness',
        category: 'authority',
        run: ($) => {
            const bodyText = $('body').text()
            const claims = (bodyText.match(/\b\d+(?:\.\d+)?%|\$\d+(?:,\d{3})*(?:\.\d+)?\s*(?:million|billion)?\b/gi) ?? []).length
            if (claims === 0) return { score: 100 }
            const attributedQuotes = $('blockquote[cite], q[cite]').length + (bodyText.match(/according to [A-Z]/g) ?? []).length
            const score = Math.round(Math.min(1, attributedQuotes / Math.max(1, Math.ceil(claims / 3))) * 100)
            if (score < 40) {
                return {
                    score,
                    issue: {
                        severity: 'warning',
                        title: 'Very few externally verifiable claims',
                        description: 'The page makes quantitative claims without attributing them to a verifiable source.',
                        impact: 'AI systems are less likely to repeat or cite claims that read as unverifiable.',
                    },
                }
            }
            return { score }
        },
    },
]

// ---- Legacy backward-compat mapping ----

/**
 * Approximates the old `AIReadabilityScore.breakdown` shape from the new
 * checks. Not a mathematically identical replay of the old dimensions
 * (those checks no longer exist standalone) — a documented, best-effort
 * mapping so old `dimensions` consumers keep working. See docs/scoring.md.
 */
function buildLegacyDimensions(checksById: Map<string, number>): Record<string, number> {
    const get = (id: string): number => checksById.get(id) ?? 100
    const avg = (...ids: string[]): number => Math.round(ids.reduce((sum, id) => sum + get(id), 0) / ids.length)

    return {
        answerFrontLoading: get('struct-answer-frontloading'),
        factDensity: get('citation-fact-density'),
        headingStructure: get('struct-heading-hierarchy'),
        eeatSignals: avg('authority-author-attribution', 'entity-organization-schema', 'authority-contact-info', 'authority-trust-signals'),
        snippability: get('content-snippability'),
        schemaCoverage: avg('entity-organization-schema', 'entity-person-schema', 'struct-faq-howto'),
        crawlerAccessibility: avg('crawl-robots-ai-access', 'crawl-llms-txt'),
    }
}

const warnedScoreAccess = new WeakSet<object>()
const warnedDimensionsAccess = new WeakSet<object>()

/**
 * `score`/`dimensions` are deliberately non-enumerable: they must still work
 * when a consumer reads `result.score`/`result.dimensions` by name (that's
 * the whole backward-compat point), but staying out of `Object.keys` /
 * `JSON.stringify` means the CLI's own `--json` serialization of an
 * `AuditResult` doesn't "access" them and spuriously trigger the
 * deprecation warning on every normal run — only real external reads of
 * the deprecated fields do.
 */
function attachLegacyAccessors(core: { overall: number; categories: AuditResult['categories']; issues: AuditIssue[] }, legacyScore: number, legacyDimensions: Record<string, number>): AuditResult {
    Object.defineProperty(core, 'score', {
        enumerable: false,
        get() {
            if (!warnedScoreAccess.has(core)) {
                warnedScoreAccess.add(core)
                console.warn('[ai-visibility] AuditResult.score is deprecated — use .overall instead.')
            }
            return legacyScore
        },
    })
    Object.defineProperty(core, 'dimensions', {
        enumerable: false,
        get() {
            if (!warnedDimensionsAccess.has(core)) {
                warnedDimensionsAccess.add(core)
                console.warn('[ai-visibility] AuditResult.dimensions is deprecated — use .categories instead.')
            }
            return legacyDimensions
        },
    })
    return core as AuditResult
}

// ---- Orchestration ----

export function runAudit(html: string, context: AnalysisContext = {}): AuditResult {
    const $ = cheerio.load(html)

    const checksById = new Map<string, number>()
    const issues: AuditIssue[] = []
    const categoryChecks: Record<AuditCategoryKey, AuditCheckResult[]> = {
        crawlability: [],
        answerPlacement: [],
        citationReadiness: [],
        entitySignals: [],
        structure: [],
        content: [],
        authority: [],
    }

    for (const check of CHECKS) {
        const outcome = check.run($, context)
        checksById.set(check.id, outcome.score)
        categoryChecks[check.category].push({ id: check.id, label: check.label, score: outcome.score })
        if (outcome.issue) {
            issues.push({
                id: check.id,
                category: check.category,
                severity: outcome.issue.severity,
                title: outcome.issue.title,
                description: outcome.issue.description,
                impact: outcome.issue.impact,
                score_impact: Math.round(100 - outcome.score),
            })
        }
    }

    const categories = {} as AuditResult['categories']
    for (const cw of CATEGORY_WEIGHTS) {
        const checks = categoryChecks[cw.key]
        const score = checks.length > 0 ? Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length) : 100
        categories[cw.key] = { key: cw.key, label: cw.label, weight: cw.weight, score, checks }
    }

    let overall = Math.round(CATEGORY_WEIGHTS.reduce((sum, cw) => sum + categories[cw.key].score * cw.weight, 0))

    const block = analyzeCrawlBlock($, context)
    if (block.fullyBlocked) overall = 0

    const severityOrder: Record<AuditSeverity, number> = { critical: 0, warning: 1, suggestion: 2 }
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.score_impact - a.score_impact)

    const dimensions = buildLegacyDimensions(checksById)

    return attachLegacyAccessors({ overall, categories, issues }, overall, dimensions)
}
