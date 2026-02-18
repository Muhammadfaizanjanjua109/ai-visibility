// ============================================================
// AI Bot Detector & Middleware
// Feature 1: Detect AI crawlers and serve them optimized HTML
// ============================================================

import type { Request, Response, NextFunction } from 'express'
import { detectBot, AI_CRAWLERS } from '../data/crawlers'
import type { AIMiddlewareConfig, AIOptimizationOptions, BotInfo } from '../types'

// ---- HTML Optimizer ----

/**
 * Strips non-essential content from HTML for AI crawler consumption.
 * Keeps semantic structure, JSON-LD schema, and meaningful text.
 */
export class HTMLOptimizer {
    private options: Required<AIOptimizationOptions>

    constructor(options: AIOptimizationOptions = {}) {
        this.options = {
            stripJs: options.stripJs ?? true,
            removeAds: options.removeAds ?? true,
            removeTracking: options.removeTracking ?? true,
            simplifyNav: options.simplifyNav ?? false,
            structureContent: options.structureContent ?? true,
        }
    }

    optimize(html: string): string {
        let result = html

        if (this.options.stripJs) {
            // Remove all <script> tags EXCEPT JSON-LD schema blocks
            result = result.replace(
                /<script(?![^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,
                ''
            )
            // Remove inline event handlers
            result = result.replace(/\s+on\w+="[^"]*"/gi, '')
            result = result.replace(/\s+on\w+='[^']*'/gi, '')
        }

        if (this.options.removeTracking) {
            // Remove tracking pixels (1x1 images)
            result = result.replace(
                /<img[^>]*(?:width=["']1["'][^>]*height=["']1["']|height=["']1["'][^>]*width=["']1["'])[^>]*\/?>/gi,
                ''
            )
            // Remove common analytics/tracking script patterns
            result = result.replace(
                /<noscript>[^<]*(?:google-analytics|gtm|facebook|pixel)[^<]*<\/noscript>/gi,
                ''
            )
            // Remove <link> preconnect to tracking domains
            result = result.replace(
                /<link[^>]*(?:google-analytics|doubleclick|facebook\.net)[^>]*>/gi,
                ''
            )
        }

        if (this.options.removeAds) {
            // Remove elements with common ad class/id patterns
            result = result.replace(
                /<[^>]+(?:class|id)=["'][^"']*(?:ad-|ads-|advertisement|banner-ad|sponsored)[^"']*["'][^>]*>[\s\S]*?<\/\w+>/gi,
                ''
            )
            // Remove <ins> tags (Google AdSense)
            result = result.replace(/<ins\b[^>]*>[\s\S]*?<\/ins>/gi, '')
        }

        if (this.options.simplifyNav) {
            // Replace <nav> with a simplified version (just links)
            result = result.replace(/<nav[^>]*>([\s\S]*?)<\/nav>/gi, (_, inner) => {
                const links = inner.match(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi) || []
                return `<nav>${links.join(' | ')}</nav>`
            })
        }

        // Add AI-friendly meta comment
        result = result.replace(
            '<head>',
            '<head>\n  <!-- Optimized for AI crawlers by ai-visibility -->'
        )

        return result
    }
}

// ---- Bot Detector Class ----

export class AIBotDetector {
    private additionalBots: string[]
    private ignoreBots: Set<string>

    constructor(config: Pick<AIMiddlewareConfig, 'additionalBots' | 'ignoreBots'> = {}) {
        this.additionalBots = config.additionalBots ?? []
        this.ignoreBots = new Set(
            (config.ignoreBots ?? []).map((b) => b.toLowerCase())
        )
    }

    /**
     * Detect if the given User-Agent belongs to an AI crawler.
     * Returns BotInfo if detected, null otherwise.
     */
    detect(userAgent: string): BotInfo | null {
        if (!userAgent) return null

        // Check against known crawlers
        const known = detectBot(userAgent)
        if (known && !this.ignoreBots.has(known.userAgentPattern)) {
            return known
        }

        // Check additional custom bots
        const ua = userAgent.toLowerCase()
        for (const pattern of this.additionalBots) {
            if (ua.includes(pattern.toLowerCase()) && !this.ignoreBots.has(pattern.toLowerCase())) {
                return {
                    name: pattern,
                    company: 'Unknown',
                    userAgentPattern: pattern.toLowerCase(),
                    purpose: 'unknown',
                }
            }
        }

        return null
    }

    /** Get all tracked bot names */
    getBotNames(): string[] {
        return [
            ...AI_CRAWLERS.map((b) => b.name),
            ...this.additionalBots,
        ]
    }
}

// ---- Express Middleware ----

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
