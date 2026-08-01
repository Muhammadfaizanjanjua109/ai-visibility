// ============================================================
// Express Middleware
// Detect AI crawlers and serve them optimized HTML via Express
// ============================================================

import type { Request, Response, NextFunction } from 'express'
import { AIBotDetector, HTMLOptimizer } from './detector'
import type { AIMiddlewareConfig, AIOptimizationOptions } from '../types'

/**
 * createAIMiddleware
 *
 * Detects AI crawlers and attaches bot info to the request object.
 * Combine with optimizeResponseForAI() to serve optimized HTML.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { createAIMiddleware, optimizeResponseForAI } from 'ai-visibility/express'
 *
 * const app = express()
 * app.use(createAIMiddleware())
 * app.use(optimizeResponseForAI())
 * ```
 */
export function createAIMiddleware(config: AIMiddlewareConfig = {}) {
    const detector = new AIBotDetector(config)
    const verbose = config.verbose ?? false

    return function aiDetectorMiddleware(
        req: Request,
        _res: Response,
        next: NextFunction
    ): void {
        const userAgent = req.headers['user-agent'] ?? ''
        const botInfo = detector.detect(userAgent)

        if (botInfo) {
            req.isAIBot = true
            req.aiBotInfo = botInfo

            if (verbose) {
                console.log(
                    `[ai-visibility] 🤖 ${botInfo.name} (${botInfo.company}) detected → ${req.method} ${req.url}`
                )
            }
        }

        next()
    }
}

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
export function optimizeResponseForAI(options: AIOptimizationOptions = {}) {
    const optimizer = new HTMLOptimizer(options)

    return function aiOptimizeMiddleware(
        req: Request,
        res: Response,
        next: NextFunction
    ): void {
        if (!req.isAIBot) {
            next()
            return
        }

        // Monkey-patch res.send to intercept HTML responses
        const originalSend = res.send.bind(res) as (body?: unknown) => Response

        res.send = function (body?: unknown): Response {
            if (
                typeof body === 'string' &&
                body.includes('<html') &&
                (res.getHeader('content-type') as string | undefined)
                    ?.includes('text/html') !== false
            ) {
                body = optimizer.optimize(body)
            }
            return originalSend(body)
        }

        next()
    }
}
