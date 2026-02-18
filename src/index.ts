// ============================================================
// ai-visibility - Public API
// Make your web app citable by AI models.
// ============================================================

// --- Middleware ---
export { createAIMiddleware, optimizeResponseForAI } from './middleware/ai-detector'
export { AIBotDetector } from './middleware/ai-detector'

// --- Generators ---
export { RobotsGenerator } from './generators/robots-generator'
export { LLMSTextGenerator } from './generators/llms-generator'

// --- Schema ---
export { SchemaBuilder } from './schema/schema-builder'

// --- Analyzer ---
export { ContentAnalyzer } from './analyzer/content-analyzer'

// --- Monitor ---
export { AIVisitorLogger } from './monitor/visitor-logger'

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
    AIReadabilityScore,
    AnalyzerOptions,
    CrawlerLog,
    LoggerConfig,
    AnalysisIssue,
} from './types'
