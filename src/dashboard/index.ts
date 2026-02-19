// ============================================================
// AI Visibility Dashboard
// Free tier: Real-time analytics of AI crawler visits
// ============================================================

import path from 'path'
import fs from 'fs'
import type { CrawlerLog, BotStatsSerialized } from '../types'

/**
 * DashboardData - Data structure for the dashboard
 */
export interface DashboardData {
    stats: Record<string, BotStatsSerialized>
    logs: CrawlerLog[]
    lastUpdated: string
}

/**
 * Dashboard - Serve and manage the AI visibility dashboard
 *
 * @example
 * ```ts
 * import { Dashboard } from 'ai-visibility'
 *
 * const dashboard = new Dashboard()
 *
 * // Get dashboard HTML
 * const html = dashboard.getHtml()
 *
 * // Get dashboard data
 * const data = dashboard.getData(stats, logs)
 *
 * // Serve in Express
 * app.get('/admin/ai-visibility', (req, res) => {
 *   res.send(dashboard.getHtml())
 * })
 * ```
 */
export class Dashboard {
    private dashboardHtml: string

    constructor() {
        // Load dashboard HTML from file
        const dashboardPath = path.join(__dirname, 'dashboard.html')
        this.dashboardHtml = fs.readFileSync(dashboardPath, 'utf-8')
    }

    /**
     * Get the dashboard HTML file
     */
    getHtml(): string {
        return this.dashboardHtml
    }

    /**
     * Format data for dashboard display
     * Use this when injecting data into the dashboard
     *
     * @param stats - Bot statistics from AIVisitorLogger.getStats()
     * @param logs - Crawler logs from AIVisitorLogger.getLogs()
     * @returns Formatted dashboard data
     *
     * @example
     * ```ts
     * const logger = new AIVisitorLogger()
     * const stats = logger.getStats(7) // Last 7 days
     * const logs = logger.getLogs({ days: 7 })
     *
     * const data = dashboard.formatData(stats, logs)
     * // Inject into HTML: <script>window.aiVisibilityData = ${JSON.stringify(data)}</script>
     * ```
     */
    formatData(stats: Record<string, BotStatsSerialized>, logs: CrawlerLog[]): DashboardData {
        return {
            stats,
            logs,
            lastUpdated: new Date().toISOString(),
        }
    }

    /**
     * Inject data into HTML and return complete page
     * This is the easiest way to serve the dashboard with data
     *
     * @param stats - Bot statistics
     * @param logs - Crawler logs
     * @param options - Optional configuration
     * @returns Complete HTML with injected data
     *
     * @example
     * ```ts
     * // In your Express route
     * app.get('/admin/ai-visibility', (req, res) => {
     *   const stats = logger.getStats(7)
     *   const logs = logger.getLogs({ days: 7 })
     *   res.send(dashboard.render(stats, logs))
     * })
     * ```
     */
    render(
        stats: Record<string, BotStatsSerialized>,
        logs: CrawlerLog[],
        options?: { autoRefresh?: boolean; refreshInterval?: number }
    ): string {
        const data = this.formatData(stats, logs)

        // Inject data and configuration into HTML
        const injected = this.dashboardHtml.replace(
            '<script>',
            `<script>
        window.aiVisibilityData = ${JSON.stringify(data)};
        if (window.CONFIG) {
            window.CONFIG.autoRefresh = ${options?.autoRefresh ?? false};
            window.CONFIG.refreshInterval = ${options?.refreshInterval ?? 30000};
        }
        </script>
        <script>`
        )

        return injected
    }

    /**
     * Get the file path to the raw dashboard HTML
     * Useful if you want to serve it as a static file
     */
    getPath(): string {
        return path.join(__dirname, 'dashboard.html')
    }
}

/**
 * Create and return a Dashboard instance
 * This is the recommended way to use the dashboard
 *
 * @example
 * ```ts
 * const dashboard = createDashboard()
 * app.get('/admin/ai-visibility', (req, res) => {
 *   res.send(dashboard.render(stats, logs))
 * })
 * ```
 */
export function createDashboard(): Dashboard {
    return new Dashboard()
}
