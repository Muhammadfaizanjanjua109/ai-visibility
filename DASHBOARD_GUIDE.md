# AI Visibility Dashboard - Free Tier

The **AI Visibility Dashboard** is a free, self-hosted analytics dashboard included with the `ai-visibility` package. Monitor how AI models like Claude, ChatGPT, Gemini, and Perplexity discover and interact with your content.

## Features

✅ **Real-time AI Crawler Tracking** - See which AI models visit your site
✅ **AI Readiness Score** - Get a score (0-100) based on crawler activity
✅ **Page Analytics** - Discover which content AI models crawl most
✅ **Performance Metrics** - Track response times and success rates
✅ **Activity Log** - Recent crawler visits with detailed information
✅ **Zero Infrastructure Cost** - Self-hosted, runs locally
✅ **Lightweight** - Vanilla HTML/CSS, minimal JavaScript
✅ **Privacy First** - Your data stays on your server

## Quick Start

### 1. Install Package

```bash
npm install @Muhammadfaizanjunjua109/ai-visibility
```

### 2. Set Up Crawler Tracking

First, add the logger middleware to track AI crawler visits:

**Express.js:**
```ts
import express from 'express'
import { AIVisitorLogger, createDashboard } from '@Muhammadfaizanjunjua109/ai-visibility'

const app = express()
const logger = new AIVisitorLogger({ storage: 'file' })

// Track all AI crawler visits
app.use(logger.middleware())

// Serve dashboard
app.get('/admin/ai-visibility', (req, res) => {
  const stats = logger.getStats(30) // Last 30 days
  const logs = logger.getLogs({ days: 30 })

  const dashboard = createDashboard()
  res.send(dashboard.render(stats, logs))
})
```

**Next.js 13+ (App Router):**
```tsx
// app/admin/ai-visibility/page.tsx
import { AIVisitorLogger, createDashboard } from '@Muhammadfaizanjunjua109/ai-visibility'

export default function DashboardPage() {
  const logger = new AIVisitorLogger({ storage: 'file' })
  const stats = logger.getStats(30)
  const logs = logger.getLogs({ days: 30 })

  const dashboard = createDashboard()
  const html = dashboard.render(stats, logs)

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
```

**Vue 3 / Nuxt 3:**
```vue
<!-- pages/admin/ai-visibility.vue -->
<template>
  <div v-html="dashboardHtml"></div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { AIVisitorLogger, createDashboard } from '@Muhammadfaizanjunjua109/ai-visibility'

const dashboardHtml = ref('')

onMounted(() => {
  const logger = new AIVisitorLogger({ storage: 'file' })
  const stats = logger.getStats(30)
  const logs = logger.getLogs({ days: 30 })

  const dashboard = createDashboard()
  dashboardHtml.value = dashboard.render(stats, logs)
})
</script>
```

### 3. Protect the Dashboard Route

Always protect your dashboard route with authentication:

```ts
// Express example with middleware
app.get('/admin/ai-visibility', (req, res, next) => {
  // Check authentication
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).send('Unauthorized')
  }

  // Render dashboard
  const logger = new AIVisitorLogger()
  const stats = logger.getStats(30)
  const logs = logger.getLogs({ days: 30 })

  const dashboard = createDashboard()
  res.send(dashboard.render(stats, logs))
})
```

## Dashboard Interface

### AI Readiness Score
A score from 0-100 based on:
- AI crawler visits and consistency
- Content diversity (pages crawled)
- Success rates of crawler requests
- AI model variety

**Score Breakdown:**
- 80-100: Excellent - AI models love your content
- 60-79: Good - Content is discoverable
- 40-59: Fair - Improve content structure
- 0-39: Getting started - Add more AI-optimized content

### Key Metrics

**Total Visits** - Number of AI crawler visits in selected period
**Pages Crawled** - Unique pages visited by AI models
**AI Models** - How many different AI systems have crawled your site
**Success Rate** - Percentage of successful crawler requests (2xx-3xx status)
**Response Time** - Average response time for AI crawler requests

### AI Models Tracked

The dashboard tracks these AI models:
- 🤖 Anthropic Claude (Automatic, GPT-4, Opus)
- 🧠 OpenAI ChatGPT (GPT-4, GPT-3.5)
- 🔍 Google Gemini (Research, Advanced)
- 🧩 Perplexity AI
- ⚡ Other LLM crawlers

## API Reference

### Dashboard Class

```ts
import { createDashboard } from '@Muhammadfaizanjunjua109/ai-visibility'

const dashboard = createDashboard()
```

#### `render(stats, logs, options?)`

Render the dashboard HTML with data.

**Parameters:**
- `stats` - Bot statistics from `logger.getStats()`
- `logs` - Crawler logs from `logger.getLogs()`
- `options` (optional):
  - `autoRefresh?: boolean` - Enable auto-refresh (default: false)
  - `refreshInterval?: number` - Refresh interval in ms (default: 30000)

**Returns:** Complete HTML string

```ts
const html = dashboard.render(stats, logs, {
  autoRefresh: false,
  refreshInterval: 30000
})
```

#### `formatData(stats, logs)`

Format data for custom use.

**Parameters:**
- `stats` - Bot statistics
- `logs` - Crawler logs

**Returns:** `DashboardData` object

```ts
const data = dashboard.formatData(stats, logs)
// {
//   stats: {...},
//   logs: [...],
//   lastUpdated: "2024-01-15T10:30:00.000Z"
// }
```

#### `getHtml()`

Get raw dashboard HTML (without data).

```ts
const html = dashboard.getHtml()
```

#### `getPath()`

Get file path to dashboard HTML.

```ts
const path = dashboard.getPath()
```

## AIVisitorLogger Configuration

```ts
const logger = new AIVisitorLogger({
  // Where to store logs: 'file' | 'memory' | 'both'
  storage: 'file',

  // Path to log file
  logFilePath: './logs/ai-crawler.json',

  // Specific crawlers to track (optional)
  trackCrawlers: ['Claude', 'ChatGPT'],

  // Max entries to keep in memory
  maxMemoryEntries: 1000
})
```

### Logger Methods

#### `middleware()`
Express middleware for automatic crawler tracking:
```ts
app.use(logger.middleware())
```

#### `log(entry)`
Manually log a crawler visit:
```ts
logger.log({
  botName: 'Claude',
  company: 'Anthropic',
  url: '/blog/ai-seo',
  method: 'GET',
  timestamp: new Date().toISOString(),
  statusCode: 200,
  responseTimeMs: 145,
  userAgent: '...'
})
```

#### `getLogs(filter?)`
Get filtered logs:
```ts
// Last 7 days
const logs = logger.getLogs({ days: 7 })

// Specific bot
const claudeLogs = logger.getLogs({ botName: 'Claude' })

// Specific URL
const blogLogs = logger.getLogs({ url: '/blog' })
```

#### `getStats(days?)`
Get aggregated statistics:
```ts
// All time
const allStats = logger.getStats()

// Last 30 days
const recentStats = logger.getStats(30)

// Returns:
// {
//   'Claude': {
//     botName: 'Claude',
//     company: 'Anthropic',
//     totalVisits: 42,
//     uniqueUrlCount: 15,
//     lastSeen: '2024-01-15T10:30:00Z',
//     avgResponseTimeMs: 145,
//     successRate: 98,
//     successCount: 41
//   },
//   ...
// }
```

#### `clearLogs()`
Clear all logs:
```ts
logger.clearLogs()
```

## Performance Optimization

The dashboard is designed to be lightweight:

- **No framework bloat** - Vanilla HTML/CSS/JS only
- **Minimal bundle size** - ~45 KB uncompressed
- **Fast rendering** - Renders in <100ms
- **Lazy loading** - Data loads on demand
- **Auto-refresh optional** - Keep memory usage low

## Customization

### Custom Styling

To customize the dashboard appearance, you can:

1. **Extract and modify CSS** from the dashboard HTML
2. **Override styles** with custom CSS file
3. **Wrap with custom layout** using the `formatData()` method

```ts
const data = dashboard.formatData(stats, logs)
// Build custom UI with your own styling using this data
```

### Custom Data Display

The dashboard HTML includes a global `aiVisibilityData` variable:

```html
<script>
  window.aiVisibilityData = {
    stats: {...},
    logs: [...],
    lastUpdated: "..."
  }
</script>
```

You can access and use this data in custom scripts:

```js
console.log(window.aiVisibilityData.stats)
console.log(window.aiVisibilityData.logs)
```

## Troubleshooting

### Dashboard shows "No data yet"

1. **Check logs file exists:**
   ```bash
   cat ./logs/ai-crawler.json
   ```

2. **Ensure logger middleware is installed** at the top of your app

3. **Wait for AI crawlers** - It may take days for AI crawlers to visit

4. **Test with manual log entry:**
   ```ts
   logger.log({
     botName: 'Claude',
     company: 'Anthropic',
     url: '/test',
     method: 'GET',
     timestamp: new Date().toISOString(),
     statusCode: 200,
     responseTimeMs: 100,
     userAgent: 'test'
   })
   ```

### High response times

- Check server load
- Optimize middleware performance
- Review `responseTimeMs` in logs

### Missing AI models

Some AI models may not be detected if:
- They use custom user-agents (rare)
- They're blocked by robots.txt
- They haven't visited yet

Add custom bot detection:
```ts
import { createAIMiddleware } from '@Muhammadfaizanjunjua109/ai-visibility'

app.use(createAIMiddleware({
  additionalBots: ['CustomBot/1.0']
}))
```

## Security Considerations

1. **Always protect dashboard route** with authentication
2. **Use HTTPS** in production
3. **Limit access** to admins/authorized users
4. **Rotate logs** - Clear old logs periodically
5. **Monitor logs file size** - Can grow large over time

```ts
// Auto-clear old logs
setInterval(() => {
  logger.clearLogs()
  logger.getLogs({ days: 30 }) // Keep last 30 days
}, 24 * 60 * 60 * 1000) // Daily
```

## Future: Premium Features

Currently the dashboard is **completely free and open source**. Future premium features might include:

- 📊 Extended analytics (1+ year history)
- 🎯 Citation tracking (see what content AI uses)
- 📈 Competitive benchmarking
- 💡 AI optimization recommendations
- 🔔 Email/Slack alerts
- 📥 Data export (CSV, PDF)

## Examples

See the `examples/` directory for full working examples:

- [Next.js 13+ Dashboard](./examples/nextjs-dashboard/)
- [Vue 3 / Nuxt 3 Dashboard](./examples/vue-dashboard/)
- [Vanilla Node.js Server](./examples/vanilla-dashboard/)
- [SvelteKit Dashboard](./examples/sveltekit-app/)

## Support & Feedback

- 🐛 Report issues: [GitHub Issues](https://github.com/muhammadfaizanjunjua109/ai-visibility/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/muhammadfaizanjunjua109/ai-visibility/discussions)
- 📧 Email: Check package.json for contact info

## License

MIT - Use freely in commercial and personal projects
