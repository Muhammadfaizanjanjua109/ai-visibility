// ============================================================
// Citation source classification (v0.8.0)
// Plain domain-to-type pattern matching — no AI/NLP needed, matching the
// "deliberately simple heuristics" precedent set by measure/brand-detection.ts.
// ============================================================

import type { SourceType } from '../types'

const REVIEW_SITES = ['g2.com', 'capterra.com', 'trustpilot.com', 'trustradius.com', 'getapp.com', 'softwareadvice.com']

const COMPARISON_SITES = ['versus.com', 'alternativeto.net', 'slant.co', 'stackshare.io', 'comparably.com']

// ~30 known tech/business news domains.
const NEWS_SITES = [
    'techcrunch.com',
    'theverge.com',
    'wired.com',
    'forbes.com',
    'bloomberg.com',
    'businessinsider.com',
    'cnbc.com',
    'reuters.com',
    'wsj.com',
    'nytimes.com',
    'theguardian.com',
    'bbc.com',
    'bbc.co.uk',
    'cnet.com',
    'engadget.com',
    'gizmodo.com',
    'mashable.com',
    'venturebeat.com',
    'arstechnica.com',
    'zdnet.com',
    'axios.com',
    'fastcompany.com',
    'inc.com',
    'entrepreneur.com',
    'fortune.com',
    'businesswire.com',
    'prnewswire.com',
    'marketwatch.com',
    'ft.com',
    'economist.com',
    'npr.org',
    'usatoday.com',
    'washingtonpost.com',
    'latimes.com',
]

const FORUM_SITES = ['reddit.com', 'quora.com', 'stackoverflow.com', 'news.ycombinator.com']

const SOCIAL_SITES = ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'youtube.com']

const MARKETPLACE_SITES = ['producthunt.com', 'wordpress.org']

const DOCUMENTATION_PATTERNS = [/^docs\./, /^developer\./, /^wiki/, /(^|\.)wikipedia\.org$/]

/** Lowercases and strips a leading `www.` so comparisons are consistent regardless of how the domain was captured. */
export function normalizeDomain(domain: string): string {
    return domain.trim().toLowerCase().replace(/^www\./, '')
}

function matchesSite(domain: string, sites: string[]): boolean {
    return sites.some((site) => domain === site || domain.endsWith(`.${site}`))
}

function isOwnDomain(domain: string, brandDomain: string): boolean {
    if (!brandDomain) return false
    const b = normalizeDomain(brandDomain)
    return domain === b || domain.endsWith(`.${b}`)
}

/** shopify.com is only a marketplace source in its `/app-store` path — everything else on that domain is 'other'. */
function isShopifyAppStore(domain: string, url: string | undefined): boolean {
    if (domain !== 'shopify.com' && !domain.endsWith('.shopify.com')) return false
    if (!url) return false
    try {
        return new URL(url).pathname.startsWith('/app-store')
    } catch {
        return false
    }
}

/**
 * Classifies a citation source domain by its site type. `brandDomain` (the
 * measured brand's own domain) takes priority — matched first so a brand
 * that happens to run a review/comparison-style site is still 'own-domain'.
 */
export function classifySource(domain: string, brandDomain: string, url?: string): SourceType {
    const d = normalizeDomain(domain)

    if (isOwnDomain(d, brandDomain)) return 'own-domain'
    if (matchesSite(d, REVIEW_SITES)) return 'review-site'
    if (matchesSite(d, COMPARISON_SITES)) return 'comparison-site'
    if (matchesSite(d, NEWS_SITES)) return 'news'
    if (matchesSite(d, FORUM_SITES)) return 'forum'
    if (matchesSite(d, SOCIAL_SITES)) return 'social'
    if (isShopifyAppStore(d, url)) return 'marketplace'
    if (matchesSite(d, MARKETPLACE_SITES)) return 'marketplace'
    if (DOCUMENTATION_PATTERNS.some((p) => p.test(d))) return 'documentation'

    return 'other'
}

/** Known display-name -> domain mappings, for bare-mention extraction (e.g. "according to G2" with no URL). Superset of the domain lists above, plus common aliases. */
export const KNOWN_SOURCE_NAMES: Array<{ name: string; domain: string }> = [
    { name: 'G2', domain: 'g2.com' },
    { name: 'Capterra', domain: 'capterra.com' },
    { name: 'Trustpilot', domain: 'trustpilot.com' },
    { name: 'TrustRadius', domain: 'trustradius.com' },
    { name: 'GetApp', domain: 'getapp.com' },
    { name: 'Software Advice', domain: 'softwareadvice.com' },
    { name: 'AlternativeTo', domain: 'alternativeto.net' },
    { name: 'Slant', domain: 'slant.co' },
    { name: 'StackShare', domain: 'stackshare.io' },
    { name: 'Comparably', domain: 'comparably.com' },
    { name: 'Reddit', domain: 'reddit.com' },
    { name: 'Quora', domain: 'quora.com' },
    { name: 'Stack Overflow', domain: 'stackoverflow.com' },
    { name: 'Hacker News', domain: 'news.ycombinator.com' },
    { name: 'Twitter', domain: 'twitter.com' },
    { name: 'LinkedIn', domain: 'linkedin.com' },
    { name: 'Facebook', domain: 'facebook.com' },
    { name: 'YouTube', domain: 'youtube.com' },
    { name: 'Product Hunt', domain: 'producthunt.com' },
    { name: 'WordPress', domain: 'wordpress.org' },
    { name: 'Wikipedia', domain: 'wikipedia.org' },
    { name: 'TechCrunch', domain: 'techcrunch.com' },
    { name: 'The Verge', domain: 'theverge.com' },
    { name: 'Wired', domain: 'wired.com' },
    { name: 'Forbes', domain: 'forbes.com' },
    { name: 'Bloomberg', domain: 'bloomberg.com' },
    { name: 'Business Insider', domain: 'businessinsider.com' },
    { name: 'CNBC', domain: 'cnbc.com' },
    { name: 'Reuters', domain: 'reuters.com' },
    { name: 'VentureBeat', domain: 'venturebeat.com' },
    { name: 'Ars Technica', domain: 'arstechnica.com' },
    { name: 'ZDNet', domain: 'zdnet.com' },
    { name: 'Fast Company', domain: 'fastcompany.com' },
]
