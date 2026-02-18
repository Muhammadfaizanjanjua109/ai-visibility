// ============================================================
// AI Visitor Logger / Crawler Monitor
// Feature 5: Track AI crawler visits with local file storage
// ============================================================

import fs from 'fs'
import path from 'path'
import type { Request, Response, NextFunction } from 'express'
import { detectBot } from '../data/crawlers'
import type { CrawlerLog, LoggerConfig } from '../types'

const DEFAULT_LOG_PATH = './logs/ai-crawler.json'
const DEFAULT_MAX_MEMORY = 1000

/**
 * AIVisitorLogger
 *
 * Middleware that logs every AI crawler visit with timing, status, and URL.
 * Supports in-memory and file-based storage.
 *
 * @example
 * ```ts
 * import express from 'express'
 * import { AIVisitorLogger } from 'ai-visibility'
 *
 * const app = express()
 * const logger = new AIVisitorLogger({ storage: 'file' })
 * app.use(logger.middleware())
 *
 * // Later: query logs
 * const stats = logger.getStats()
 * const recent = logger.getLogs({ days: 7 })
 * ```
 */
export class AIVisitorLogger {
    private config: Required<LoggerConfig>
    private memoryLogs: CrawlerLog[] = []

    constructor(config: LoggerConfig = {}) {
        this.config = {
            storage: config.storage ?? 'both',
            logFilePath: config.logFilePath ?? DEFAULT_LOG_PATH,
            trackCrawlers: config.trackCrawlers ?? [],
            maxMemoryEntries: config.maxMemoryEntries ?? DEFAULT_MAX_MEMORY,
        }

        // Ensure log directory exists
        if (this.config.storage !== 'memory') {
            const dir = path.dirname(this.config.logFilePath)
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true })
            }
            // Initialize empty log file if it doesn't exist
            if (!fs.existsSync(this.config.logFilePath)) {
                fs.writeFileSync(this.config.logFilePath, JSON.stringify([], null, 2))
            }
        }
    }

    /**
     * Express middleware that logs AI crawler visits.
     */
    middleware() {
        return (req: Request, res: Response, next: NextFunction): void => {
            const userAgent = req.headers['user-agent'] ?? ''
            const botInfo = detectBot(userAgent)

            if (!botInfo) {
                next()
                return
            }

            // Filter by tracked crawlers if specified
            if (
                this.config.trackCrawlers.length > 0 &&
                !this.config.trackCrawlers.includes(botInfo.name)
            ) {
                next()
                return
            }

            const startTime = Date.now()

            res.on('finish', () => {
                const log: CrawlerLog = {
                    botName: botInfo.name,
                    company: botInfo.company,
                    url: req.url,
                    method: req.method,
                    timestamp: new Date().toISOString(),
                    statusCode: res.statusCode,
                    responseTimeMs: Date.now() - startTime,
                    userAgent,
                    ip: req.ip ?? req.socket.remoteAddress,
                }

                this.saveLog(log)
            })

            next()
        }
    }

    /**
     * Manually log a crawler visit (useful for non-Express frameworks).
     */
    log(entry: CrawlerLog): void {
        this.saveLog(entry)
    }

    /**
     * Get all logs, optionally filtered.
     */
    getLogs(filter?: { botName?: string; days?: number; url?: string }): CrawlerLog[] {
        const logs = this.readAllLogs()

        return logs.filter((log) => {
            if (filter?.botName && log.botName !== filter.botName) return false
            if (filter?.url && !log.url.includes(filter.url)) return false
            if (filter?.days) {
                const cutoff = new Date()
                cutoff.setDate(cutoff.getDate() - filter.days)
                if (new Date(log.timestamp) < cutoff) return false
            }
            return true
        })
    }

    /**
     * Get aggregated statistics per bot.
     */
    getStats(days?: number): Record<string, BotStatsSerialized> {
        const logs = this.getLogs(days ? { days } : undefined)
        const stats: Record<string, BotStatsInternal> = {}

        for (const log of logs) {
            if (!stats[log.botName]) {
                stats[log.botName] = {
                    botName: log.botName,
                    company: log.company,
                    totalVisits: 0,
                    uniqueUrls: new Set(),
                    lastSeen: log.timestamp,
                    avgResponseTimeMs: 0,
                    successRate: 0,
                    successCount: 0,
                }
            }

            const s = stats[log.botName]!
            s.totalVisits++
            s.uniqueUrls.add(log.url)
            if (new Date(log.timestamp) > new Date(s.lastSeen)) {
                s.lastSeen = log.timestamp
            }
            s.avgResponseTimeMs =
                (s.avgResponseTimeMs * (s.totalVisits - 1) + log.responseTimeMs) / s.totalVisits

            if (log.statusCode >= 200 && log.statusCode < 400) {
                s.successCount++
            }
            s.successRate = Math.round((s.successCount / s.totalVisits) * 100)
        }

        // Convert Set to count for serialization
        const result: Record<string, BotStatsSerialized> = {}
        for (const [key, v] of Object.entries(stats)) {
            result[key] = {
                botName: v.botName,
                company: v.company,
                totalVisits: v.totalVisits,
                uniqueUrlCount: v.uniqueUrls.size,
                lastSeen: v.lastSeen,
                avgResponseTimeMs: Math.round(v.avgResponseTimeMs),
                successRate: v.successRate,
                successCount: v.successCount,
            }
        }
        return result
    }

    /**
     * Clear all logs.
     */
    clearLogs(): void {
        this.memoryLogs = []
        if (this.config.storage !== 'memory') {
            fs.writeFileSync(this.config.logFilePath, JSON.stringify([], null, 2))
        }
    }

    // ---- Private ----

    private saveLog(log: CrawlerLog): void {
        // Memory storage
        if (this.config.storage === 'memory' || this.config.storage === 'both') {
            this.memoryLogs.push(log)
            // Trim if over limit
            if (this.memoryLogs.length > this.config.maxMemoryEntries) {
                this.memoryLogs = this.memoryLogs.slice(-this.config.maxMemoryEntries)
            }
        }

        // File storage
        if (this.config.storage === 'file' || this.config.storage === 'both') {
            try {
                const existing = this.readFromFile()
                existing.push(log)
                fs.writeFileSync(this.config.logFilePath, JSON.stringify(existing, null, 2))
            } catch (err) {
                console.error('[ai-visibility] Failed to write crawler log:', err)
            }
        }
    }

    private readAllLogs(): CrawlerLog[] {
        if (this.config.storage === 'memory') {
            return [...this.memoryLogs]
        }
        if (this.config.storage === 'file') {
            return this.readFromFile()
        }
        // 'both': prefer memory (faster), fall back to file
        return this.memoryLogs.length > 0 ? [...this.memoryLogs] : this.readFromFile()
    }

    private readFromFile(): CrawlerLog[] {
        try {
            if (!fs.existsSync(this.config.logFilePath)) return []
            const raw = fs.readFileSync(this.config.logFilePath, 'utf-8')
            return JSON.parse(raw) as CrawlerLog[]
        } catch {
            return []
        }
    }
}

// ---- Internal types ----
interface BotStatsInternal {
    botName: string
    company: string
    totalVisits: number
    uniqueUrls: Set<string>
    lastSeen: string
    avgResponseTimeMs: number
    successRate: number
    successCount: number
}

export interface BotStatsSerialized {
    botName: string
    company: string
    totalVisits: number
    uniqueUrlCount: number
    lastSeen: string
    avgResponseTimeMs: number
    successRate: number
    successCount: number
}
