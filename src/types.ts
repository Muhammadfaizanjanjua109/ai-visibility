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
 */
export interface AnalysisContext {
    /** Raw robots.txt content for the site being analyzed, if known. */
    robotsTxt?: string
    /** Whether an llms.txt file was found for the site being analyzed. */
    hasLlmsTxt?: boolean
}

/** One entry of the published, fixed GEO scoring weights (see `SCORING_WEIGHTS`). */
export interface ScoringDimension {
    key: keyof AIReadabilityScore['breakdown']
    label: string
    weight: number
    description: string
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
