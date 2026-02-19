/**
 * Vanilla Node.js/Express Example
 * AI Visibility Dashboard Server
 *
 * Run with: node server.js
 * Visit: http://localhost:3000/admin/ai-visibility
 */

const express = require('express')
const { AIVisitorLogger, createDashboard } = require('@Muhammadfaizanjunjua109/ai-visibility')

const app = express()
const PORT = 3000

// Initialize logger to track AI crawler visits
const logger = new AIVisitorLogger({
    storage: 'file',
    logFilePath: './logs/ai-crawler.json',
})

// Middleware to track crawler visits
app.use(logger.middleware())

// Serve dashboard
app.get('/admin/ai-visibility', (req, res) => {
    // Get stats from last 30 days
    const stats = logger.getStats(30)
    const logs = logger.getLogs({ days: 30 })

    // Create and render dashboard with data
    const dashboard = createDashboard()
    const html = dashboard.render(stats, logs, {
        autoRefresh: false,
        refreshInterval: 30000,
    })

    res.send(html)
})

// Demo route for testing
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>AI Visibility Demo</title>
            <style>
                body { font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto; }
                a { color: #667eea; text-decoration: none; font-weight: bold; font-size: 18px; }
                a:hover { text-decoration: underline; }
                p { color: #666; line-height: 1.6; }
            </style>
        </head>
        <body>
            <h1>🤖 AI Visibility Demo</h1>
            <p>This is a demo page. AI crawlers visiting this page will be tracked.</p>
            <p><strong>View the dashboard:</strong></p>
            <p><a href="/admin/ai-visibility">→ Go to AI Visibility Dashboard</a></p>
            <p style="margin-top: 30px; font-size: 14px; color: #999;">
                📝 Note: Dashboard will be empty until AI crawlers visit this site.
                For testing, you can simulate crawler visits by modifying the logs.
            </p>
        </body>
        </html>
    `)
})

// Serve static files (if needed)
app.use(express.static('public'))

app.listen(PORT, () => {
    console.log(`✅ AI Visibility server running at http://localhost:${PORT}`)
    console.log(`📊 Dashboard at http://localhost:${PORT}/admin/ai-visibility`)
})
