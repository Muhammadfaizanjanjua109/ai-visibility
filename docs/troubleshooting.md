# Troubleshooting Guide

Common issues and solutions when using `ai-visibility`.

---

## Installation & Setup

### "Cannot find module '@Muhammadfaizanjanjua109/ai-visibility'"

**Problem:** Package installation failed or not installed at all.

**Solutions:**
```bash
# Make sure you're installing the scoped package
npm install @Muhammadfaizanjanjua109/ai-visibility

# Clear npm cache if installation seems corrupted
npm cache clean --force
npm install @Muhammadfaizanjanjua109/ai-visibility

# Verify installation
npm list @Muhammadfaizanjanjua109/ai-visibility
```

If using GitHub Packages, configure `.npmrc`:
```bash
# Add this to ~/.npmrc or your project's .npmrc
@Muhammadfaizanjanjua109:registry=https://npm.pkg.github.com
```

---

### CLI command not found: `ai-visibility`

**Problem:** The `ai-visibility` command isn't available globally or via `npx`.

**Solutions:**
```bash
# Use npx to run without global install (recommended)
npx ai-visibility init
npx ai-visibility analyze --file ./pages/index.html

# Or install globally
npm install -g @Muhammadfaizanjanjua109/ai-visibility
ai-visibility init

# Or use local node_modules
npx ./node_modules/.bin/ai-visibility init
```

---

## Middleware Issues

### `req.isAIBot` is undefined

**Problem:** Middleware is applied but `req.isAIBot` is not attached to requests.

**Solution:** Ensure `createAIMiddleware()` is called **before** other middleware that access it:

```typescript
import express from 'express'
import { createAIMiddleware, optimizeResponseForAI } from 'ai-visibility'

const app = express()

// ✅ CORRECT: Middleware order
app.use(createAIMiddleware())        // Must be first!
app.use(optimizeResponseForAI())     // Then optimization
app.use(express.json())               // Then other middleware
app.use(yourRoutes)

// ❌ WRONG: This won't work
app.use(express.json())
app.use(createAIMiddleware())  // Too late! Other handlers won't see req.isAIBot
```

---

### Bot not being detected

**Problem:** A specific AI crawler isn't being detected even though it visits your site.

**Solutions:**

1. **Check the User-Agent string:**
```typescript
const { AIBotDetector } = require('ai-visibility')
const detector = new AIBotDetector()

// Log the incoming User-Agent
app.use((req, res, next) => {
  console.log('User-Agent:', req.headers['user-agent'])
  next()
})

// Check if it would be detected
const userAgent = req.headers['user-agent']
const bot = detector.detect(userAgent)
console.log('Detected:', bot?.name || 'Not recognized')
```

2. **Add custom bot detection:**
```typescript
app.use(createAIMiddleware({
  additionalBots: ['MyCustomBot', 'BotPattern']
}))
```

3. **Check with `verbose` mode:**
```typescript
app.use(createAIMiddleware({
  verbose: true  // Logs all detections to console
}))
```

---

### HTML optimization removing content I need

**Problem:** `optimizeResponseForAI()` is stripping important content.

**Solution:** Disable specific optimizations:

```typescript
app.use(optimizeResponseForAI({
  stripJs: false,          // Keep scripts
  removeAds: true,
  removeTracking: true,
  simplifyNav: false       // Keep navigation intact
}))
```

**What each option removes:**
- `stripJs: true` — Removes all `<script>` except JSON-LD (keeps `<script type="application/ld+json">`)
- `removeAds: true` — Removes `<ins>`, elements with class/id containing "ad", "banner", "sidebar"
- `removeTracking: true` — Removes `src="*tracking*"`, `src="*analytics*"`, inline `on*` handlers (onclick, etc.)
- `simplifyNav: true` — Converts `<nav>` to plain text links

---

## Schema & Content Generation

### SchemaBuilder not importing

**Problem:** TypeScript errors when importing types from SchemaBuilder.

**Solutions:**

```typescript
// ✅ Correct: import from main package
import { SchemaBuilder } from 'ai-visibility'
import type { ProductSchemaData, FAQItem } from 'ai-visibility'

// ✅ Also correct: use SchemaBuilder directly without types
const schema = SchemaBuilder.product({ name: 'Prod', price: 29 })

// ❌ Wrong: Don't try to import from sub-paths
import { SchemaBuilder } from 'ai-visibility/schema' // This won't work
```

---

### llms.txt generation times out

**Problem:** `autoSummarize: true` causes long delays or timeouts.

**Solutions:**

1. **Disable auto-summarization:**
```typescript
const gen = new LLMSTextGenerator({
  siteName: 'MyApp',
  description: 'My App',
  pages: [{ url: '/page1', title: 'Page 1', summary: 'I provide the summary' }],
  autoSummarize: false  // Provide summaries manually
})
```

2. **Increase timeout for your environment:**
```typescript
const gen = new LLMSTextGenerator({ /* ... */ })
// Note: The current timeout is 5 seconds per URL
// If your server is slow, use manual summaries instead
```

3. **Check network connectivity:**
```bash
# Ensure your server can reach external URLs
curl -I https://yoursite.com/page1

# If behind a firewall, you'll need to whitelist the domain
# or fetch summaries offline
```

4. **Pre-generate summaries:**
```typescript
// Fetch summaries once and cache them
const pages = [
  { url: '/docs', title: 'Docs', summary: 'Complete documentation' },
  { url: '/pricing', title: 'Pricing', summary: 'Plans from $9/month' }
]

const gen = new LLMSTextGenerator({
  siteName: 'MyApp',
  description: 'My App',
  pages,
  autoSummarize: false  // Use pre-written summaries
})
```

---

## Content Analyzer

### Low content score despite good content

**Problem:** `ContentAnalyzer` is giving a low score on pages you think are high-quality.

**Solutions:**

1. **Check which metrics are failing:**
```typescript
const result = await analyzer.analyze(html)
console.log(result.breakdown)
// See which scores are low:
// - answerFrontLoading: 20/100?
// - factDensity: 30/100?
// - headingStructure: 100/100? (good!)
// - etc.
```

2. **Common scoring issues:**

| Low Score | Root Cause | Fix |
|-----------|-----------|-----|
| **answerFrontLoading: <50** | Main answer not in first paragraph | Move key information to top of page before details |
| **factDensity: <40** | Too few numbers/dates/percentages | Add concrete facts: "47% of users", "launched 2024", "$X million" |
| **headingStructure: <80** | Multiple H1s or skipped levels | Use only ONE H1, H1 → H2 → H3, no H1 → H3 jumps |
| **eeatSignals: <50** | No author/org/contact info | Add `<meta name="author">`, organization info, email |
| **snippability: <60** | Sections don't stand alone | Ensure each H2 has a 80+ character paragraph following it |
| **schemaCoverage: <50** | Missing JSON-LD markup | Add `SchemaBuilder` schema with `SchemaBuilder.toScriptTag()` |

3. **Disable specific checks if not relevant:**
```typescript
const analyzer = new ContentAnalyzer({
  checkAnswerPlacement: false,   // Disable if page is reference material
  checkFactDensity: false,       // Disable if page is narrative
  checkEEAT: false,              // Disable if not a YMYL page
  checkSnippability: false       // Disable if not meant to be snippeted
})
```

---

### Schema auto-detection detecting wrong type

**Problem:** `SchemaBuilder.fromHTML()` detects `FAQPage` when you expected `Article`.

**Solution:** Provide hints to the detector:

```typescript
// Auto-detection fails on generic content
const schema1 = SchemaBuilder.fromHTML(html)  // Might detect as FAQPage

// Provide hints to guide detection
const schema2 = SchemaBuilder.fromHTML(html, {
  author: 'John Doe',
  publisher: 'My Blog'
})  // Now detects as Article

// Or build the schema manually instead:
const schema3 = SchemaBuilder.article({
  headline: 'My Article Title',
  author: 'John Doe',
  publisher: 'My Blog'
})
```

---

## Logging & Analytics

### Logs not appearing in file

**Problem:** `AIVisitorLogger` is in `'file'` mode but `./logs/ai-crawler.json` isn't being created.

**Solutions:**

1. **Check file permissions:**
```bash
# Ensure the logs directory exists and is writable
mkdir -p logs
chmod 755 logs

# Check actual file location
ls -la ./logs/
```

2. **Specify explicit path with write permissions:**
```typescript
const logger = new AIVisitorLogger({
  storage: 'both',
  logFilePath: '/tmp/ai-crawler.json'  // Use absolute path if in doubt
})
```

3. **Switch to memory mode temporarily for debugging:**
```typescript
const logger = new AIVisitorLogger({
  storage: 'memory'  // No file I/O
})

// Query in-memory logs
console.log(logger.getLogs())
```

---

### Logs not persisting between server restarts

**Problem:** Using `storage: 'memory'` means logs are lost when the server restarts.

**Solution:** Switch to file storage:

```typescript
// ❌ This loses data on restart
const logger = new AIVisitorLogger({ storage: 'memory' })

// ✅ This persists data
const logger = new AIVisitorLogger({
  storage: 'file',
  logFilePath: './logs/ai-crawler.json'
})

// ✅ Or hybrid (memory for speed + file for persistence)
const logger = new AIVisitorLogger({
  storage: 'both'
})
```

---

### High memory usage with logger

**Problem:** `maxMemoryEntries` is too high and causing memory issues.

**Solution:** Lower the limit:

```typescript
const logger = new AIVisitorLogger({
  storage: 'both',
  maxMemoryEntries: 100  // Default is 1000, reduce as needed
})

// Alternatively, periodically clear memory
setInterval(() => {
  logger.clearLogs()  // Clears both memory and file!
}, 24 * 60 * 60 * 1000)  // Every 24 hours

// Or just query and archive manually
const stats = logger.getStats(7)
// Save stats elsewhere, then clear
logger.clearLogs()
```

---

## TypeScript Issues

### Type errors with Express augmentation

**Problem:** TypeScript doesn't recognize `req.isAIBot` or `req.aiBotInfo`.

**Solutions:**

1. **Ensure package is installed:**
```bash
npm install @Muhammadfaizanjanjua109/ai-visibility
```

2. **Import the package somewhere in your app:**
```typescript
// This triggers the global type augmentation
import { createAIMiddleware } from 'ai-visibility'
import type { BotInfo } from 'ai-visibility'

declare global {
  namespace Express {
    interface Request {
      isAIBot?: boolean
      aiBotInfo?: BotInfo
    }
  }
}
```

3. **Check tsconfig.json includes the package:**
```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types"],
    "skipLibCheck": false  // Don't skip type checking
  }
}
```

---

## Node.js Version Issues

### Package not compatible with Node 16

**Problem:** You're using Node 16, but the package requires 18+.

**Solution:** Upgrade Node.js:

```bash
# Check your current version
node --version

# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from nodejs.org
# Minimum: Node 18.0.0
```

---

## Performance Issues

### Middleware adding significant latency

**Problem:** The package is slowing down response times for AI bots.

**Solutions:**

1. **Profile which step is slow:**
```typescript
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (req.isAIBot) {
      console.log(`AI request took ${duration}ms`)
    }
  })
  next()
})
```

2. **Disable expensive optimizations:**
```typescript
app.use(optimizeResponseForAI({
  stripJs: false,          // Parsing is expensive
  removeAds: false,        // DOM selection is expensive
  removeTracking: false,
  simplifyNav: true        // Usually fast
}))
```

3. **Cache analysis results:**
```typescript
const cache = new Map()

app.get('/page', async (req, res) => {
  const cacheKey = 'page_analysis'
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey))
  }

  const result = await analyzer.analyze(req.body.html)
  cache.set(cacheKey, result)
  res.json(result)
})

// Clear cache periodically
setInterval(() => cache.clear(), 60 * 60 * 1000)  // Every hour
```

---

## Getting Help

If you don't find your issue above:

1. **Check the API Reference:** [docs/api-reference.md](./api-reference.md)
2. **Check the Performance Guide:** [docs/performance.md](./performance.md)
3. **Open an issue on GitHub:** [Issues](https://github.com/Muhammadfaizanjanjua109/ai-visibility/issues)
4. **Enable verbose logging:**
```typescript
app.use(createAIMiddleware({ verbose: true }))
```

Include:
- Your Node.js version (`node --version`)
- Package version (from `package.json`)
- Minimal reproduction code
- Any error logs or stack traces
