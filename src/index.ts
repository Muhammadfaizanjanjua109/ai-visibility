// ============================================================
// ai-visibility - Public API
// Make your web app citable by AI models.
// ============================================================

// --- Middleware ---
export { createAIMiddleware, optimizeResponseForAI } from './middleware/express-middleware'
export { AIBotDetector, HTMLOptimizer } from './middleware/detector'

// --- Generators ---
export { RobotsGenerator } from './generators/robots-generator'
export { LLMSTextGenerator } from './generators/llms-generator'

// --- Schema ---
export { SchemaBuilder } from './schema/schema-builder'

// --- Analyzer ---
export { ContentAnalyzer } from './analyzer/content-analyzer'

// --- Monitor ---
export { AIVisitorLogger } from './monitor/visitor-logger'

// --- Dashboard ---
export { Dashboard, createDashboard } from './dashboard/index'
export type { DashboardData } from './dashboard/index'

// --- Types ---
export type {
    AIMiddlewareConfig,
    AIOptimizationOptions,
    BotInfo,
    RobotsConfig,
    LLMSConfig,
    LLMSPage,
    FAQItem,
    ProductSchemaData,
    ArticleSchemaData,
    OrganizationSchemaData,
    PersonSchemaData,
    WebSiteSchemaData,
    SoftwareApplicationSchemaData,
    BreadcrumbItem,
    BreadcrumbListOptions,
    DefinedTermSchemaData,
    DefinedTermSetSchemaData,
    OfferSchemaData,
    AggregateRatingSchemaData,
    AIReadabilityScore,
    AnalyzerOptions,
    AnalysisContext,
    ScoringDimension,
    CrawlerLog,
    LoggerConfig,
    AnalysisIssue,
    BotStatsSerialized,
    AuditCategoryKey,
    AuditCategoryWeight,
    AuditSeverity,
    AuditIssue,
    AuditCheckResult,
    CategoryResult,
    AuditResult,
} from './types'
