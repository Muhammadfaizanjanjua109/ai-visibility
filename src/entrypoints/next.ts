// ============================================================
// ai-visibility/next
// Next.js support: App Router middleware + a framework-agnostic
// detect-and-optimize helper. Edge-runtime-safe — no pino, no cheerio,
// no fs, no Node builtins. Types against `next` (optional peer dependency).
// ============================================================

import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
import { AIBotDetector } from '../middleware/detector'
import type { BotInfo } from '../types'

export type { BotInfo }

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
    /**
     * Called when a bot is detected — use for logging/analytics. May return
     * a Promise. When it does, and the runtime passes a `NextFetchEvent` as
     * the middleware's second argument (which Next.js always does), that
     * promise is registered with `event.waitUntil()` so the work isn't
     * silently dropped once the response is sent — without this, an async
     * onDetect can get torn down mid-flight the moment the response goes
     * out, since nothing was holding the execution context open for it.
     */
    onDetect?: (bot: BotInfo, req: NextRequest) => void | Promise<void>
}

/**
 * createNextMiddleware
 *
 * For Next.js App Router `proxy.ts` (called `middleware.ts` before Next.js 16
 * — same function, just a renamed file/export). Detects AI crawlers and, per
 * options, sets a header marking the request as a bot, rewrites to an
 * alternate route, and/or fires an onDetect callback for logging.
 *
 * @example
 * ```ts
 * // proxy.ts (Next.js 16+)
 * import { createNextMiddleware } from 'ai-visibility/next'
 *
 * export default createNextMiddleware({
 *   rewrite: '/ai-landing',
 *   onDetect: async (bot) => {
 *     await logCrawlerVisit(bot) // safely kept alive via event.waitUntil()
 *   },
 * })
 * ```
 *
 * @example
 * ```ts
 * // middleware.ts (Next.js < 16, or the deprecated-but-still-working path on 16)
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

    return function aiNextMiddleware(req: NextRequest, event?: NextFetchEvent): NextResponse {
        const userAgent = req.headers.get('user-agent') ?? ''
        const bot = detector.detect(userAgent)

        if (!bot) {
            return NextResponse.next()
        }

        if (options.onDetect) {
            const result = options.onDetect(bot, req)
            if (result && typeof result.then === 'function') {
                // Swallow rejections here specifically: a failing analytics/log
                // call in onDetect must never surface as an unhandled rejection
                // or affect the response already being returned below.
                event?.waitUntil(result.catch(() => undefined))
            }
        }

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

