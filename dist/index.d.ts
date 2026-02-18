import { Request, Response, NextFunction } from 'express';

interface AIOptimizationOptions {
    /** Remove <script> tags (except JSON-LD schema) */
    stripJs?: boolean;
    /** Remove ad-related elements */
    removeAds?: boolean;
    /** Remove tracking pixels and analytics */
    removeTracking?: boolean;
    /** Simplify navigation to text links */
    simplifyNav?: boolean;
    /** Front-load main content */
    structureContent?: boolean;
}
interface AIMiddlewareConfig {
    /** Optimization flags applied to AI bot responses */
    optimizations?: AIOptimizationOptions;
    /** Custom list of bot user-agent strings to detect (merged with defaults) */
    additionalBots?: string[];
    /** Bots to explicitly ignore/not optimize for */
    ignoreBots?: string[];
    /** Enable verbose logging */
    verbose?: boolean;
}
interface BotInfo {
    name: string;
    company: string;
    userAgentPattern: string;
    purpose: 'training' | 'search' | 'indexing' | 'unknown';
}
interface RobotsConfig {
    /** AI crawlers to explicitly allow */
    allowAI?: string[];
    /** AI crawlers to explicitly block */
    blockAI?: string[];
    /** Paths to disallow for all bots */
    disallow?: string[];
    /** Your sitemap URL */
    sitemapUrl?: string;
    /** Crawl delay in seconds (optional) */
    crawlDelay?: number;
}
interface LLMSPage {
    url: string;
    title: string;
    /** Optional manual summary. If omitted, will be auto-generated from content */
    summary?: string;
    /** Page priority (high | medium | low) */
    priority?: 'high' | 'medium' | 'low';
}
interface LLMSConfig {
    siteName: string;
    description: string;
    baseUrl?: string;
    pages: LLMSPage[];
    /** Contact/author info */
    contact?: {
        email?: string;
        twitter?: string;
        github?: string;
    };
    /** Auto-fetch summaries from live URLs */
    autoSummarize?: boolean;
}
interface FAQItem {
    q: string;
    a: string;
}
interface ProductSchemaData {
    name: string;
    description?: string;
    price: number;
    currency?: string;
    features?: string[];
    url?: string;
    image?: string;
    brand?: string;
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    author?: {
        name: string;
        jobTitle?: string;
    };
}
interface ArticleSchemaData {
    headline: string;
    description?: string;
    author?: string;
    publisher?: string;
    publishedDate?: string;
    modifiedDate?: string;
    url?: string;
    image?: string;
    keywords?: string[];
}
interface OrganizationSchemaData {
    name: string;
    url?: string;
    logo?: string;
    description?: string;
    email?: string;
    phone?: string;
    address?: {
        street?: string;
        city?: string;
        country?: string;
    };
    sameAs?: string[];
}
interface PersonSchemaData {
    name: string;
    jobTitle?: string;
    url?: string;
    image?: string;
    email?: string;
    sameAs?: string[];
    worksFor?: string;
    description?: string;
}
interface AnalysisIssue {
    type: 'answer-placement' | 'fact-density' | 'heading-structure' | 'eeat' | 'snippability' | 'schema' | 'meta';
    severity: 'high' | 'medium' | 'low';
    message: string;
    fix: string;
}
interface AIReadabilityScore {
    overallScore: number;
    breakdown: {
        answerFrontLoading: number;
        factDensity: number;
        headingStructure: number;
        eeatSignals: number;
        snippability: number;
        schemaCoverage: number;
    };
    issues: AnalysisIssue[];
    recommendations: string[];
}
interface AnalyzerOptions {
    checkAnswerPlacement?: boolean;
    checkFactDensity?: boolean;
    checkHeadingStructure?: boolean;
    checkEEAT?: boolean;
    checkSnippability?: boolean;
    checkSchema?: boolean;
}
interface CrawlerLog {
    botName: string;
    company: string;
    url: string;
    method: string;
    timestamp: string;
    statusCode: number;
    responseTimeMs: number;
    userAgent: string;
    ip?: string;
}
interface LoggerConfig {
    /** Where to store logs: 'file' | 'memory' | 'both' */
    storage?: 'file' | 'memory' | 'both';
    /** Path to log file (default: ./logs/ai-crawler.json) */
    logFilePath?: string;
    /** Specific crawlers to track (default: all known AI crawlers) */
    trackCrawlers?: string[];
    /** Max log entries to keep in memory */
    maxMemoryEntries?: number;
}
declare global {
    namespace Express {
        interface Request {
            isAIBot?: boolean;
            aiBotInfo?: BotInfo;
        }
    }
}

declare class AIBotDetector {
    private additionalBots;
    private ignoreBots;
    constructor(config?: Pick<AIMiddlewareConfig, 'additionalBots' | 'ignoreBots'>);
    /**
     * Detect if the given User-Agent belongs to an AI crawler.
     * Returns BotInfo if detected, null otherwise.
     */
    detect(userAgent: string): BotInfo | null;
    /** Get all tracked bot names */
    getBotNames(): string[];
}
/**
 * createAIMiddleware
 *
 * Detects AI crawlers and attaches bot info to the request object.
 * Combine with optimizeResponseForAI() to serve optimized HTML.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createAIMiddleware, optimizeResponseForAI } from 'ai-visibility'
 *
 * const app = express()
 * app.use(createAIMiddleware())
 * app.use(optimizeResponseForAI())
 * ```
 */
declare function createAIMiddleware(config?: AIMiddlewareConfig): (req: Request, _res: Response, next: NextFunction) => void;
/**
 * optimizeResponseForAI
 *
 * Intercepts HTML responses for AI bots and strips unnecessary content.
 * Must be used AFTER createAIMiddleware().
 *
 * @example
 * ```ts
 * app.use(createAIMiddleware())
 * app.use(optimizeResponseForAI({ stripJs: true, removeAds: true }))
 * ```
 */
declare function optimizeResponseForAI(options?: AIOptimizationOptions): (req: Request, res: Response, next: NextFunction) => void;

/**
 * RobotsGenerator
 *
 * Generates a robots.txt file that explicitly allows AI crawlers
 * and optionally blocks specific ones (e.g., training bots).
 *
 * @example
 * ```ts
 * import { RobotsGenerator } from 'ai-visibility'
 * import fs from 'fs'
 *
 * const gen = new RobotsGenerator({
 *   allowAI: ['GPTBot', 'ClaudeBot', 'PerplexityBot'],
 *   blockAI: ['CCBot'],
 *   disallow: ['/admin', '/api'],
 *   sitemapUrl: 'https://mysite.com/sitemap.xml',
 * })
 *
 * fs.writeFileSync('./public/robots.txt', gen.generate())
 * ```
 */
declare class RobotsGenerator {
    private config;
    constructor(config?: RobotsConfig);
    /**
     * Generate the robots.txt content as a string.
     */
    generate(): string;
    /**
     * Returns a pre-built robots.txt that allows ALL known AI crawlers.
     * Good for quick setup with zero configuration.
     */
    static allowAll(options?: Partial<Pick<RobotsConfig, 'disallow' | 'sitemapUrl'>>): string;
    /**
     * Returns a robots.txt that blocks training bots (CCBot, GPTBot, etc.)
     * but allows search/indexing bots.
     */
    static blockTraining(options?: Partial<Pick<RobotsConfig, 'disallow' | 'sitemapUrl'>>): string;
}

/**
 * LLMSTextGenerator
 *
 * Generates an llms.txt file — a plain-text index of your site
 * designed specifically for Large Language Models to understand
 * your content without crawling every page.
 *
 * @example
 * ```ts
 * import { LLMSTextGenerator } from 'ai-visibility'
 * import fs from 'fs'
 *
 * const gen = new LLMSTextGenerator({
 *   siteName: 'MyApp',
 *   description: 'The best Node.js framework for AI',
 *   baseUrl: 'https://myapp.com',
 *   pages: [
 *     { url: '/product', title: 'Product', priority: 'high' },
 *     { url: '/pricing', title: 'Pricing', summary: '$29/month for Pro plan' },
 *     { url: '/docs', title: 'Documentation' },
 *   ],
 * })
 *
 * const content = await gen.generate()
 * fs.writeFileSync('./public/llms.txt', content)
 * ```
 */
declare class LLMSTextGenerator {
    private config;
    constructor(config: LLMSConfig);
    /**
     * Generate the llms.txt content.
     * If autoSummarize is true and a page has no summary, it will attempt
     * to fetch the page and extract the first meaningful paragraph.
     */
    generate(): Promise<string>;
    private appendPage;
    private resolveUrl;
    /**
     * Attempt to fetch a live URL and extract its first meaningful paragraph.
     * Falls back gracefully if fetch fails.
     */
    private fetchSummary;
    /**
     * Generate a minimal llms.txt with just URLs and titles.
     * Useful for large sites where you don't want summaries.
     */
    static minimal(config: LLMSConfig): string;
}

type SchemaObject = Record<string, unknown>;
/**
 * SchemaBuilder
 *
 * Generates valid JSON-LD structured data (schema.org) for AI and search engines.
 * Supports FAQ, Product, Article, Organization, Person schemas.
 * Can auto-detect schema type from raw HTML.
 *
 * @example
 * ```ts
 * import { SchemaBuilder } from 'ai-visibility'
 *
 * // Manual FAQ schema
 * const schema = SchemaBuilder.faq([
 *   { q: 'What is this?', a: 'An AI visibility tool.' },
 * ])
 *
 * // Auto-detect from HTML
 * const schema = await SchemaBuilder.fromHTML(htmlString)
 *
 * // Render as <script> tag
 * const tag = SchemaBuilder.toScriptTag(schema)
 * ```
 */
declare class SchemaBuilder {
    static faq(items: FAQItem[]): SchemaObject;
    static product(data: ProductSchemaData): SchemaObject;
    static article(data: ArticleSchemaData): SchemaObject;
    static organization(data: OrganizationSchemaData): SchemaObject;
    static person(data: PersonSchemaData): SchemaObject;
    /**
     * Analyze HTML content and auto-generate the most appropriate schema.
     * Uses heuristics to detect FAQ, Product, or Article patterns.
     */
    static fromHTML(html: string, hints?: {
        author?: string;
        publisher?: string;
    }): SchemaObject;
    /**
     * Serialize schema to a JSON-LD <script> tag string.
     * Use this to inject into your HTML <head>.
     */
    static toScriptTag(schema: SchemaObject): string;
    /**
     * Serialize multiple schemas into a single <script> tag (array).
     */
    static toScriptTagMultiple(schemas: SchemaObject[]): string;
    private static detectType;
    private static extractFAQs;
    private static extractPrice;
    private static extractFeatures;
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
declare class ContentAnalyzer {
    private options;
    constructor(options?: AnalyzerOptions);
    /**
     * Analyze HTML content and return an AI readability score.
     */
    analyze(html: string): Promise<AIReadabilityScore>;
    private checkAnswerFrontLoading;
    private checkFactDensity;
    private checkHeadingStructure;
    private checkEEAT;
    private checkSnippability;
    private checkSchemaCoverage;
    private generateRecommendations;
}

/**
 * AIVisitorLogger
 *
 * Middleware that logs every AI crawler visit with timing, status, and URL.
 * Supports in-memory and file-based storage.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { AIVisitorLogger } from 'ai-visibility'
 *
 * const app = express()
 * const logger = new AIVisitorLogger({ storage: 'file' })
 * app.use(logger.middleware())
 *
 * // Later: query logs
 * const stats = logger.getStats()
 * const recent = logger.getLogs({ days: 7 })
 * ```
 */
declare class AIVisitorLogger {
    private config;
    private memoryLogs;
    constructor(config?: LoggerConfig);
    /**
     * Express middleware that logs AI crawler visits.
     */
    middleware(): (req: Request, res: Response, next: NextFunction) => void;
    /**
     * Manually log a crawler visit (useful for non-Express frameworks).
     */
    log(entry: CrawlerLog): void;
    /**
     * Get all logs, optionally filtered.
     */
    getLogs(filter?: {
        botName?: string;
        days?: number;
        url?: string;
    }): CrawlerLog[];
    /**
     * Get aggregated statistics per bot.
     */
    getStats(days?: number): Record<string, BotStatsSerialized>;
    /**
     * Clear all logs.
     */
    clearLogs(): void;
    private saveLog;
    private readAllLogs;
    private readFromFile;
}
interface BotStatsSerialized {
    botName: string;
    company: string;
    totalVisits: number;
    uniqueUrlCount: number;
    lastSeen: string;
    avgResponseTimeMs: number;
    successRate: number;
    successCount: number;
}

export { AIBotDetector, type AIMiddlewareConfig, type AIOptimizationOptions, type AIReadabilityScore, AIVisitorLogger, type AnalysisIssue, type AnalyzerOptions, type ArticleSchemaData, type BotInfo, ContentAnalyzer, type CrawlerLog, type FAQItem, type LLMSConfig, type LLMSPage, LLMSTextGenerator, type LoggerConfig, type OrganizationSchemaData, type PersonSchemaData, type ProductSchemaData, type RobotsConfig, RobotsGenerator, SchemaBuilder, createAIMiddleware, optimizeResponseForAI };
