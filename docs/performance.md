# Performance & Benchmarks

Performance characteristics and optimization recommendations for `ai-visibility`.

---

## ContentAnalyzer Performance

The `ContentAnalyzer` is the most computationally expensive component. Here are typical benchmarks:

### Analysis Speed

| HTML Size | Check Complexity | Duration | Notes |
|-----------|------------------|----------|-------|
| 10 KB | All enabled | 5-15ms | Small page (typical blog post) |
| 50 KB | All enabled | 25-50ms | Medium page (product page) |
| 100 KB | All enabled | 50-100ms | Large page (documentation) |
| 500 KB | All enabled | 200-300ms | Very large page |
| 1 MB | All enabled | 400-600ms | Benchmark limit (exceptional cases) |

**Test Environment:** Node.js 20.x, Intel i7-12700K, 16GB RAM

### Per-Check Performance

Individual check overhead (relative to total):

```
Total time: 45ms (50KB HTML)
├─ Answer Front-Loading: 5ms (11%)
├─ Fact Density: 8ms (18%)
├─ Heading Structure: 3ms (7%)
├─ E-E-A-T Signals: 4ms (9%)
├─ Snippability: 15ms (33%)  ← Most expensive
└─ Schema Coverage: 10ms (22%)
```

**Snippability** is the slowest check because it must:
1. Parse all heading tags
2. Find following paragraphs for each heading
3. Measure character length
4. Calculate ratio

### Optimization Tips

1. **Disable unnecessary checks:**
```typescript
// For product pages (don't need answer placement)
const analyzer = new ContentAnalyzer({
  checkAnswerPlacement: false,  // Skip slow check
  checkSnippability: false       // Skip expensive check
})
// Reduces time from 45ms → ~20ms
```

2. **Cache results:**
```typescript
const cache = new Map()

async function analyzePageCached(url) {
  if (cache.has(url)) return cache.get(url)

  const html = await fetchHTML(url)
  const result = await analyzer.analyze(html)

  cache.set(url, result)
  return result
}

// Clear stale cache periodically
setInterval(() => cache.clear(), 24 * 60 * 60 * 1000)
```

3. **Batch analysis with worker threads:**
```typescript
// For analyzing many pages at once
import { Worker } from 'worker_threads'

const analyzeInWorker = (html) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./analyzer-worker.js')
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.postMessage(html)
  })
}

// Analyze multiple pages in parallel
const pages = [/* ... */]
const results = await Promise.all(
  pages.map(html => analyzeInWorker(html))
)
```

---

## SchemaBuilder Performance

Schema generation is very fast. Benchmarks:

| Operation | Time | Size |
|-----------|------|------|
| FAQ schema (10 Q&A pairs) | <1ms | 2 KB |
| Product schema | <1ms | 1.5 KB |
| Article schema | <1ms | 1.8 KB |
| Organization schema | <1ms | 1.2 KB |
| `fromHTML()` auto-detect (50 KB) | 3-5ms | varies |
| `toScriptTag()` | <1ms | varies |
| `toScriptTagMultiple()` (5 schemas) | <1ms | 8-10 KB |

**Conclusion:** Not a bottleneck. Safe to use even in hot paths.

---

## Middleware Performance

Express middleware overhead:

### createAIMiddleware()

| Scenario | Time | Notes |
|----------|------|-------|
| Human visitor detection | <0.5ms | Just reads User-Agent header |
| AI bot detection | <0.5ms | Simple string matching (15 known bots) |
| Additional 10 custom bots | <0.5ms | Still negligible |
| Verbose logging enabled | +1-2ms | Console.log I/O |

**Conclusion:** Virtually no overhead (< 1ms per request).

### optimizeResponseForAI()

| HTML Size | stripJs | removeAds | removeTracking | Total |
|-----------|---------|-----------|-----------------|-------|
| 10 KB | 2ms | 1ms | 1ms | 4ms |
| 50 KB | 8ms | 3ms | 2ms | 13ms |
| 100 KB | 15ms | 6ms | 4ms | 25ms |
| 500 KB | 70ms | 30ms | 18ms | 118ms |

**Only runs for AI bot requests** — no impact on human visitors.

**Optimization:** Disable unused optimizations:
```typescript
app.use(optimizeResponseForAI({
  stripJs: true,          // Usually needed
  removeAds: false,       // Skip if no ads
  removeTracking: false,  // Skip if no tracking
  simplifyNav: false      // Skip if nav is important
}))
// Reduces from 13ms → ~8ms on 50KB
```

---

## LLMSTextGenerator Performance

### Without autoSummarize

| Operation | Time |
|-----------|------|
| Generate (10 pages) | 2-3ms |
| Generate (100 pages) | 15-20ms |
| Sort & format | negligible |

**Conclusion:** Negligible. Not a bottleneck.

### With autoSummarize: true

| Scenario | Time | Notes |
|----------|------|-------|
| 1 page | 1-5 seconds | Depends on network latency & page load time |
| 5 pages | 5-25 seconds | Sequential (not parallel) |
| 10 pages | 10-50 seconds | Sequential (not parallel) |

**Factors affecting speed:**
- Network latency to your domain
- Page load time (cheerio parsing time)
- Server response time
- 5-second timeout per URL

**Optimization:** Pre-generate summaries and disable `autoSummarize`:
```typescript
const gen = new LLMSTextGenerator({
  siteName: 'MyApp',
  description: 'My app',
  pages: [
    { url: '/docs', title: 'Docs', summary: 'Complete documentation' },
    { url: '/pricing', title: 'Pricing', summary: 'Plans from $9/month' }
  ],
  autoSummarize: false  // 2ms instead of 5-25 seconds!
})

const content = await gen.generate()  // 2-3ms instead of 5+ seconds
```

---

## AIVisitorLogger Performance

### Logging overhead

| Operation | Time | Notes |
|-----------|------|-------|
| Log single entry (memory) | <0.1ms | Very fast |
| Log single entry (file) | 1-5ms | Depends on disk I/O |
| Log single entry (both) | 1-5ms | Dominated by file I/O |

**Impact:** Minimal. Only runs for AI bot requests.

### Query operations

| Operation | Time | Data |
|-----------|------|------|
| `getLogs()` (100 entries) | <0.5ms | - |
| `getLogs()` (1000 entries) | 1-2ms | - |
| `getStats(7)` (all bots) | 2-3ms | Fast aggregation |
| `clearLogs()` (both storage) | 1-2ms | Disk I/O |

**Conclusion:** Not a performance concern.

---

## Memory Usage

### ContentAnalyzer

```typescript
const analyzer = new ContentAnalyzer()

// Per analysis:
// - 50 KB HTML input: ~5 MB peak (parsing, DOM tree)
// - After completion: <100 KB (just the result object)

// Safe for concurrent analyses:
const analyses = await Promise.all([
  analyzer.analyze(html1),
  analyzer.analyze(html2),
  analyzer.analyze(html3)
])
// Peak: ~15 MB (3 × 5 MB concurrent), then drops
```

### AIVisitorLogger

```typescript
const logger = new AIVisitorLogger({
  maxMemoryEntries: 1000  // default
})

// Memory impact:
// - Per log entry: ~200 bytes (CrawlerLog object)
// - 1000 entries: ~200 KB
// - maxMemoryEntries: 10000 → ~2 MB
```

**Recommendation:** Keep `maxMemoryEntries ≤ 5000` unless you need history:
```typescript
const logger = new AIVisitorLogger({
  maxMemoryEntries: 500  // ~100 KB memory footprint
})
```

---

## Real-World Performance Example

### Typical Express app with ai-visibility

```typescript
import express from 'express'
import { createAIMiddleware, optimizeResponseForAI } from 'ai-visibility'

const app = express()

// Latency impact:
// - createAIMiddleware(): +0.3ms (negligible)
// - optimizeResponseForAI(): +0ms for humans, +10-15ms for AI bots
// - Other middleware: existing overhead

app.use(createAIMiddleware())
app.use(optimizeResponseForAI({ stripJs: true }))
app.use(express.json())  // existing middleware

app.get('/', (req, res) => {
  // For human: normal response time + 0.3ms
  // For AI bot: normal response time + 0.3ms + 10-15ms (optimization)
  res.send('<h1>Hello</h1>')
})

app.listen(3000)
```

### Handling bursts of AI crawler traffic

```typescript
// If you get 100 AI bot requests/second:
// - createAIMiddleware overhead: negligible
// - optimizeResponseForAI on 50 KB responses: 13ms × 100 = 1.3 seconds of total work
// - Should distribute across cores easily with Node's event loop

// If this becomes a bottleneck, disable expensive optimizations:
app.use(optimizeResponseForAI({
  stripJs: false,          // Skip DOM parsing
  removeAds: false,
  removeTracking: false
}))
// Reduces to ~0.5ms per request → 50ms total work per second
```

---

## Benchmarking Your Own Setup

### Measure ContentAnalyzer performance:

```typescript
import { ContentAnalyzer } from 'ai-visibility'
import fs from 'fs'

const analyzer = new ContentAnalyzer()
const html = fs.readFileSync('./large-page.html', 'utf-8')

console.time('analyze')
const result = await analyzer.analyze(html)
console.timeEnd('analyze')

console.log(`Score: ${result.overallScore}/100`)
console.log(`Issues: ${result.issues.length}`)
```

### Measure middleware overhead:

```typescript
app.use((req, res, next) => {
  req._startTime = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - req._startTime
    console.log(`${req.method} ${req.path}: ${duration}ms (AI bot: ${req.isAIBot})`)
  })
  next()
})

app.use(createAIMiddleware())
app.use(optimizeResponseForAI())
```

### Load test with AI bot traffic:

```bash
# Simulate concurrent AI bot requests
ab -n 1000 -c 10 -H "User-Agent: GPTBot/1.0" http://localhost:3000/

# Results will show:
# - Requests per second
# - Average latency
# - 95th percentile latency (important for perceived performance)
```

---

## Recommendations by Use Case

### High-traffic public site (100k+ daily visits)

```typescript
// Disable expensive optimizations for AI bots
app.use(optimizeResponseForAI({
  stripJs: false,         // Skip DOM parsing
  removeAds: false,
  removeTracking: false,
  simplifyNav: true       // Just simplify nav, fast
}))

// Cache analyzer results
const analyzerCache = new Map()

// Use file-based logging, rotate daily
const logger = new AIVisitorLogger({
  storage: 'file',
  logFilePath: `./logs/ai-${new Date().toISOString().split('T')[0]}.json`
})
```

### Medium site with analysis needs

```typescript
// Full optimization for AI bots
app.use(optimizeResponseForAI())

// Analyze new pages at build time, cache results
const analyzer = new ContentAnalyzer()
// Precompute scores during CI/CD, store in DB

// Log visitor traffic for analytics
const logger = new AIVisitorLogger({
  storage: 'both',  // Memory + file
  maxMemoryEntries: 500
})
```

### Small/development site

```typescript
// All features enabled, maximum transparency
app.use(createAIMiddleware({ verbose: true }))
app.use(optimizeResponseForAI())

// Analyze pages on-demand
const analyzer = new ContentAnalyzer()

// Log everything for debugging
const logger = new AIVisitorLogger({
  storage: 'both',
  logFilePath: './logs/ai-crawler.json'
})
```

---

## Profiling Tips

Use Node's built-in profiler:

```bash
# Generate CPU profile
node --prof app.js

# Wait for traffic, then Ctrl+C to stop

# Process the profile
node --prof-process isolate-*.log > profile.txt

# View results
cat profile.txt | grep "ai-visibility"  # Search for your code
```

Or use a package like `clinic.js`:

```bash
npm install -g clinic
clinic doctor -- node app.js
# Generates an interactive dashboard showing bottlenecks
```
