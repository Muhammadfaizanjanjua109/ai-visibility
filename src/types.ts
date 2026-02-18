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

// ---- Analyzer ----

export interface AnalysisIssue {
    type:
    | 'answer-placement'
    | 'fact-density'
    | 'heading-structure'
    | 'eeat'
    | 'snippability'
    | 'schema'
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
