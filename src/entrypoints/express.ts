// ============================================================
// ai-visibility/express
// Express middleware: bot detection, HTML optimization, visitor logging.
// Types against express (optional peer dependency) — Node runtime only.
// ============================================================

export { createAIMiddleware, optimizeResponseForAI } from '../middleware/express-middleware'
export { AIVisitorLogger } from '../monitor/visitor-logger'
