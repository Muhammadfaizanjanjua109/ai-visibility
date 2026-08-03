import { AIBotDetector } from 'ai-visibility/detector'
import type { BotInfo } from 'ai-visibility/detector'

declare module 'h3' {
  interface H3EventContext {
    aiBot?: BotInfo | null
  }
}

// Nitro/H3 has no Express-style middleware chain, so ai-visibility/express's
// createAIMiddleware() doesn't apply here — a plain AIBotDetector instance is
// what the framework-agnostic pieces are for. Detection is zero-dependency
// and runs once per request in server/middleware/*.ts, same as any other
// Nitro middleware.
const detector = new AIBotDetector()

export default defineEventHandler((event) => {
  const userAgent = getHeader(event, 'user-agent') ?? ''
  const bot = detector.detect(userAgent)

  event.context.aiBot = bot

  if (bot) {
    setResponseHeader(event, 'x-ai-crawler', bot.name)
  }
})
