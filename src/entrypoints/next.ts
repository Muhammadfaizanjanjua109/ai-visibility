// ============================================================
// ai-visibility/next
// Next.js support: App Router middleware + a framework-agnostic
// detect-and-optimize helper. Edge-runtime-safe — no pino, no cheerio,
// no fs, no Node builtins. Types against `next` (optional peer dependency).
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AIBotDetector } from '../middleware/detector'
import type { BotInfo } from '../types'

// detectAndOptimize is framework-agnostic and carries no dependency on `next` —
// it lives in the zero-dep detector module (also reachable from ai-visibility/detector)
// and is re-exported here for convenience/discoverability from the Next.js subpath.
export { detectAndOptimize } from '../middleware/detector'
export type { DetectAndOptimizeOptions, DetectAndOptimizeResult } from '../middleware/detector'

// ---- createNextMiddleware ----

export interface NextMiddlewareOptions {
    /** Custom list of bot user-agent strings to detect (merged with defaults) */
    additionalBots?: string[]
    /** Bots to explicitly ignore/not act on */
    ignoreBots?: string[]
    /** Header set on the response to mark a detected bot request. Default: 'x-ai-crawler' */
    headerName?: string
    /** Rewrite the request to this pathname when a bot is detected. String or a function of (bot, req). */
    rewrite?: string | ((bot: BotInfo, req: NextRequest) => string)
    /** Called when a bot is detected — use for logging/analytics */
    onDetect?: (bot: BotInfo, req: NextRequest) => void
}

/**
 * createNextMiddleware
 *
 * For Next.js App Router `middleware.ts`. Detects AI crawlers and, per
 * options, sets a header marking the request as a bot, rewrites to an
 * alternate route, and/or fires an onDetect callback for logging.
 *
 * @example
 * ```ts
 * // middleware.ts
 * import { createNextMiddleware } from 'ai-visibility/next'
 *
 * export const middleware = createNextMiddleware({
 *   rewrite: '/ai-landing',
 *   onDetect: (bot) => console.log(`${bot.name} detected`),
 * })
 * ```
 */
export function createNextMiddleware(options: NextMiddlewareOptions = {}) {
    const detector = new AIBotDetector({
        additionalBots: options.additionalBots,
        ignoreBots: options.ignoreBots,
    })
    const headerName = options.headerName ?? 'x-ai-crawler'

    return function aiNextMiddleware(req: NextRequest): NextResponse {
        const userAgent = req.headers.get('user-agent') ?? ''
        const bot = detector.detect(userAgent)

        if (!bot) {
            return NextResponse.next()
        }

        options.onDetect?.(bot, req)

        if (options.rewrite) {
            const target = typeof options.rewrite === 'function' ? options.rewrite(bot, req) : options.rewrite
            const url = req.nextUrl.clone()
            url.pathname = target
            const res = NextResponse.rewrite(url)
            res.headers.set(headerName, bot.name)
            return res
        }

        const res = NextResponse.next()
        res.headers.set(headerName, bot.name)
        return res
    }
}

