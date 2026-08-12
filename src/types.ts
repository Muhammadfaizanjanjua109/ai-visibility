// ============================================================
// Shared TypeScript types for ai-visibility
// ============================================================

// ---- Middleware ----

export interface AIOptimizationOptions {
    /** Remove <script> tags (except JSON-LD schema) */
    stripJs?: boolean
    /** Remove ad-related elements */
    removeAds?: boolean
    /** Remove tracking pixels and analytics */
    removeTracking?: boolean
    /** Simplify navigation to text links */
    simplifyNav?: boolean
    /** Front-load main content */
    structureContent?: boolean
}

export interface AIMiddlewareConfig {
    /** Optimization flags applied to AI bot responses */
    optimizations?: AIOptimizationOptions
    /** Custom list of bot user-agent strings to detect (merged with defaults) */
    additionalBots?: string[]
    /** Bots to explicitly ignore/not optimize for */
    ignoreBots?: string[]
    /** Enable verbose logging */
    verbose?: boolean
}

export interface BotInfo {
    name: string
    company: string
    userAgentPattern: string
    purpose: 'training' | 'search' | 'indexing' | 'unknown'
    /**
     * Whether this entry's user-agent token has been confirmed against the
     * vendor's own published documentation (not a third-party/SEO-blog list).
     * Undefined for user-supplied custom bots, where verification doesn't apply.
     */
    verified?: boolean
    /** Vendor (or best available) documentation URL this entry was checked against. */
    sourceUrl?: string
    /** ISO 8601 date this entry was last checked against `sourceUrl`. */
    lastChecked?: string
}

// ---- Generators ----

export interface RobotsConfig {
    /** AI crawlers to explicitly allow */
    allowAI?: string[]
    /** AI crawlers to explicitly block */
    blockAI?: string[]
    /** Paths to disallow for all bots */
    disallow?: string[]
    /** Your sitemap URL */
    sitemapUrl?: string
    /** Crawl delay in seconds (optional) */
    crawlDelay?: number
}

export interface LLMSPage {
    url: string
    title: string
    /** Optional manual summary. If omitted, will be auto-generated from content */
    summary?: string
    /** Page priority (high | medium | low) */
    priority?: 'high' | 'medium' | 'low'
}

export interface LLMSConfig {
    siteName: string
    description: string
    baseUrl?: string
    pages: LLMSPage[]
    /** Contact/author info */
    contact?: {
        email?: string
        twitter?: string
        github?: string
    }
    /** Auto-fetch summaries from live URLs */
    autoSummarize?: boolean
}

// ---- Schema ----

export interface FAQItem {
    q: string
    a: string
}

export interface ProductSchemaData {
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

export interface ArticleSchemaData {
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

export interface OrganizationSchemaData {
    name: string
    url?: string
    logo?: string
    description?: string
    email?: string
    phone?: string
    address?: {
        street?: string
        city?: string
        country?: string
    }
    sameAs?: string[]
}

export interface PersonSchemaData {
    name: string
    jobTitle?: string
    url?: string
    image?: string
    email?: string
    sameAs?: string[]
    worksFor?: string
    description?: string
}

export interface WebSiteSchemaData {
    name: string
    url: string
    description?: string
    /** Sitelinks searchbox. Omit if the site has no search. */
    searchAction?: {
        /** Full URL template, e.g. 'https://example.com/search?q={search_term_string}' */
        urlTemplate: string
        queryInput?: string
    }
}

export interface SoftwareApplicationSchemaData {
    name: string
    description: string
    url: string
    applicationCategory?: string
    operatingSystem?: string
    offers?: OfferSchemaData
    aggregateRating?: AggregateRatingSchemaData
}

export interface BreadcrumbItem {
    name: string
    /** Absolute URL, or relative path when `baseUrl` is passed to breadcrumbList() */
    url: string
}

export interface BreadcrumbListOptions {
    /** Resolves relative `url` values in breadcrumb items against this base */
    baseUrl?: string
}

export interface DefinedTermSchemaData {
    name: string
    description: string
    url?: string
    /** URL of the DefinedTermSet (e.g. glossary index page) this term belongs to */
    inDefinedTermSet?: string
}

export interface DefinedTermSetSchemaData {
    name: string
    url: string
    description?: string
}

export interface OfferSchemaData {
    price: number
    priceCurrency?: string
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
    url?: string
    priceValidUntil?: string
}

export interface AggregateRatingSchemaData {
    ratingValue: number
    reviewCount?: number
    ratingCount?: number
    bestRating?: number
    worstRating?: number
}

// ---- Analyzer ----

export interface AnalysisIssue {
    type:
    | 'answer-placement'
    | 'fact-density'
    | 'heading-structure'
    | 'eeat'
    | 'snippability'
    | 'schema'
    | 'crawler-accessibility'
    | 'meta'
    severity: 'high' | 'medium' | 'low'
    message: string
    fix: string
}

export interface AIReadabilityScore {
    overallScore: number
    breakdown: {
        answerFrontLoading: number
        factDensity: number
        headingStructure: number
        eeatSignals: number
        snippability: number
        schemaCoverage: number
        crawlerAccessibility: number
    }
    issues: AnalysisIssue[]
    recommendations: string[]
}

export interface AnalyzerOptions {
    checkAnswerPlacement?: boolean
    checkFactDensity?: boolean
    checkHeadingStructure?: boolean
    checkEEAT?: boolean
    checkSnippability?: boolean
    checkSchema?: boolean
    checkCrawlerAccessibility?: boolean
}

/**
 * Optional site context for the crawlerAccessibility dimension. Without it,
 * that dimension can only check the page's own <meta name="robots"> tag —
 * passing robots.txt content and llms.txt presence (as `audit <url>` and
 * `audit --dir` both do) lets it check AI-crawler-specific rules too.
 *
 * Also consumed by the AI Readiness Engine (`ContentAnalyzer.audit()`) —
 * the additional optional fields below feed CRAWLABILITY checks that need
 * more than the page's own HTML (llms.txt content, ai.txt/sitemap
 * presence, response time). All are best-effort/optional: `undefined`
 * means "not checked", never "checked and absent" — the checks that use
 * them treat `undefined` as neutral (no penalty) rather than a failure.
 */
export interface AnalysisContext {
    /** Raw robots.txt content for the site being analyzed, if known. */
    robotsTxt?: string
    /** Whether an llms.txt file was found for the site being analyzed. */
    hasLlmsTxt?: boolean
    /** Raw llms.txt content, if fetched — enables a validity check beyond mere presence. */
    llmsTxtContent?: string
    /** Whether an ai.txt file was found for the site being analyzed. */
    hasAiTxt?: boolean
    /** Whether a sitemap was found (sitemap.xml, or a `Sitemap:` line in robots.txt). */
    hasSitemap?: boolean
    /** Time in milliseconds the page took to respond, if the page was fetched live. */
    responseTimeMs?: number
}

/** One entry of the published, fixed GEO scoring weights (see `SCORING_WEIGHTS`). */
export interface ScoringDimension {
    key: keyof AIReadabilityScore['breakdown']
    label: string
    weight: number
    description: string
}

// ---- AI Readiness Engine (v0.6.0) ----

/** The six top-level AI Readiness categories. See `CATEGORY_WEIGHTS` for weights/descriptions. */
export type AuditCategoryKey =
    | 'crawlability'
    | 'structure'
    | 'entitySignals'
    | 'citationReadiness'
    | 'content'
    | 'authority'

/** One entry of the published, fixed AI Readiness category weights (see `CATEGORY_WEIGHTS`). */
export interface AuditCategoryWeight {
    key: AuditCategoryKey
    label: string
    weight: number
    description: string
}

export type AuditSeverity = 'critical' | 'warning' | 'suggestion'

/**
 * A single failed (or partially failed) check, surfaced to explain *why* a
 * score is what it is. `score_impact` is how many of the check's own 0-100
 * points were lost (not category- or overall-weighted) — a rough "how bad
 * is this one thing" number for sorting/display.
 */
export interface AuditIssue {
    id: string
    category: AuditCategoryKey
    severity: AuditSeverity
    title: string
    description: string
    impact: string
    score_impact: number
}

/** One check's 0-100 subscore within a category. */
export interface AuditCheckResult {
    id: string
    label: string
    score: number
}

export interface CategoryResult {
    key: AuditCategoryKey
    label: string
    weight: number
    /** Equal-weighted average of this category's check scores. */
    score: number
    checks: AuditCheckResult[]
}

/**
 * Result of `ContentAnalyzer.audit()` — the AI Readiness Engine. Replaces
 * the flat 7-dimension `AIReadabilityScore` with six weighted categories,
 * each broken into named checks, plus a structured issue list.
 *
 * `score` and `dimensions` are kept for backward compatibility with
 * consumers of the old `AIReadabilityScore` shape (`score` mirrors
 * `overall`; `dimensions` is derived from the new checks — see
 * docs/scoring.md for the mapping). Both are deprecated: accessing either
 * logs a one-time `console.warn` pointing at `overall`/`categories`.
 */
export interface AuditResult {
    overall: number
    categories: Record<AuditCategoryKey, CategoryResult>
    issues: AuditIssue[]
    /** @deprecated Use `overall` instead. */
    score: number
    /** @deprecated Use `categories` instead. */
    dimensions: Record<string, number>
}

// ---- Monitor ----

export interface CrawlerLog {
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

export interface BotStatsSerialized {
    botName: string
    company: string
    totalVisits: number
    uniqueUrlCount: number
    lastSeen: string
    avgResponseTimeMs: number
    successRate: number
    successCount: number
}

export interface LoggerConfig {
    /** Where to store logs: 'file' | 'memory' | 'both' */
    storage?: 'file' | 'memory' | 'both'
    /** Path to log file (default: ./logs/ai-crawler.json) */
    logFilePath?: string
    /** Specific crawlers to track (default: all known AI crawlers) */
    trackCrawlers?: string[]
    /** Max log entries to keep in memory */
    maxMemoryEntries?: number
}

// ---- Express augmentation ----
declare global {
    namespace Express {
        interface Request {
            isAIBot?: boolean
            aiBotInfo?: BotInfo
        }
    }
}
