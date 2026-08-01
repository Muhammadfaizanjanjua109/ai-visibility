// ============================================================
// ai-visibility/next
// Next.js support: App Router middleware + a framework-agnostic
// detect-and-optimize helper. Edge-runtime-safe — no pino, no cheerio,
// no fs, no Node builtins. Types against `next` (optional peer dependency).
// ============================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { AIBotDetector, HTMLOptimizer } from '../middleware/detector'
import type { AIOptimizationOptions, BotInfo } from '../types'

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

// ---- detectAndOptimize ----

export interface DetectAndOptimizeOptions extends AIOptimizationOptions {
    additionalBots?: string[]
    ignoreBots?: string[]
}

export interface DetectAndOptimizeResult {
    isBot: boolean
    botName: string | null
    html: string
}

/**
 * detectAndOptimize
 *
 * Framework-agnostic: HTML string + User-Agent string in, `{ isBot, botName, html }`
 * out. No request/response objects, works in any runtime. Built on the same
 * zero-dependency detector + optimizer as `ai-visibility/detector`.
 *
 * @example
 * ```ts
 * // app/blog/[slug]/route.ts
 * import { detectAndOptimize } from 'ai-visibility/next'
 *
 * export async function GET(req: Request) {
 *   const html = await renderPage()
 *   const { html: out } = detectAndOptimize(html, req.headers.get('user-agent') ?? '')
 *   return new Response(out, { headers: { 'content-type': 'text/html' } })
 * }
 * ```
 */
export function detectAndOptimize(
    html: string,
    userAgent: string,
    options: DetectAndOptimizeOptions = {}
): DetectAndOptimizeResult {
    const detector = new AIBotDetector({
        additionalBots: options.additionalBots,
        ignoreBots: options.ignoreBots,
    })
    const bot = detector.detect(userAgent)

    if (!bot) {
        return { isBot: false, botName: null, html }
    }

    const optimizer = new HTMLOptimizer(options)
    return { isBot: true, botName: bot.name, html: optimizer.optimize(html) }
}
