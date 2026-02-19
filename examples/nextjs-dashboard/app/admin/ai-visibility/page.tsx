/**
 * Next.js 13+ App Router
 * AI Visibility Dashboard Page
 *
 * Place this file at: app/admin/ai-visibility/page.tsx
 * Access at: http://localhost:3000/admin/ai-visibility
 */

import { AIVisitorLogger, createDashboard } from '@Muhammadfaizanjunjua109/ai-visibility'

export const metadata = {
    title: 'AI Visibility Dashboard',
    description: 'Monitor AI crawler activity on your site',
}

export default function DashboardPage() {
    // Initialize logger
    const logger = new AIVisitorLogger({
        storage: 'file',
        logFilePath: './logs/ai-crawler.json',
    })

    // Get stats from last 30 days
    const stats = logger.getStats(30)
    const logs = logger.getLogs({ days: 30 })

    // Create dashboard and render with data
    const dashboard = createDashboard()
    const html = dashboard.render(stats, logs, {
        autoRefresh: false, // Set to true for live updates (requires polling)
        refreshInterval: 30000,
    })

    return (
        <div
            dangerouslySetInnerHTML={{
                __html: html,
            }}
        />
    )
}
