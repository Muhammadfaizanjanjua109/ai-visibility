// ============================================================
// ai-visibility/detector
// Zero-dependency, edge-runtime-safe: bot detection + HTML optimization.
// Safe for Next.js Edge Middleware, Cloudflare Workers, Deno.
// ============================================================

export { AIBotDetector, HTMLOptimizer } from '../middleware/detector'
export { AI_CRAWLERS, detectBot } from '../data/crawlers'
export type { BotInfo, AIMiddlewareConfig, AIOptimizationOptions } from '../types'
