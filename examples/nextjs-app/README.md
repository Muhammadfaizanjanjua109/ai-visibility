# Next.js Integration Example

Complete example of integrating `ai-visibility` into a Next.js 13+ application.

---

## Overview

This example shows how to:
1. Add AI bot detection middleware
2. Inject schema markup on pages
3. Auto-generate `robots.txt` and `llms.txt` at build time
4. Analyze pages for AI readiness
5. Track AI crawler visits

---

## Setup

### 1. Install the package

```bash
npm install @Muhammadfaizanjanjua109/ai-visibility
# or
pnpm add @Muhammadfaizanjanjua109/ai-visibility
```

### 2. Create middleware

Create `src/middleware.ts`:

```typescript
import { createAIMiddleware } from '@Muhammadfaizanjanjua109/ai-visibility'

export const middleware = createAIMiddleware({
  verbose: process.env.NODE_ENV === 'development'
})

export const config = {
  matcher: '/:path*'
}
```

This middleware:
- Detects AI crawlers (GPTBot, ClaudeBot, etc.)
- Attaches `request.headers.get('user-agent')` detection info
- Is applied to all routes

### 3. Add schema markup

Create `src/components/SchemaMarkup.tsx`:

```typescript
import { SchemaBuilder } from '@Muhammadfaizanjanjua109/ai-visibility'
import type { ProductSchemaData } from '@Muhammadfaizanjanjua109/ai-visibility'

interface SchemaMarkupProps {
  type: 'product' | 'article' | 'faq'
  data: any
}

export function SchemaMarkup({ type, data }: SchemaMarkupProps) {
  let schema

  switch (type) {
    case 'product':
      schema = SchemaBuilder.product(data as ProductSchemaData)
      break
    case 'article':
      schema = SchemaBuilder.article(data)
      break
    case 'faq':
      schema = SchemaBuilder.faq(data)
      break
  }

  const scriptTag = SchemaBuilder.toScriptTag(schema)

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

### 4. Use schema on pages

Example: `src/app/pricing/page.tsx`

```typescript
import { SchemaMarkup } from '@/components/SchemaMarkup'
import type { ProductSchemaData } from '@Muhammadfaizanjanjua109/ai-visibility'

const pricingPlans: ProductSchemaData[] = [
  {
    name: 'Starter',
    description: 'Perfect for small projects',
    price: 29,
    currency: 'USD',
    availability: 'InStock',
    features: ['5 projects', '1 GB storage', 'Community support']
  },
  {
    name: 'Professional',
    description: 'For growing teams',
    price: 99,
    currency: 'USD',
    availability: 'InStock',
    features: ['Unlimited projects', '100 GB storage', 'Priority support']
  }
]

export default function PricingPage() {
  return (
    <>
      {pricingPlans.map((plan) => (
        <div key={plan.name}>
          <SchemaMarkup type="product" data={plan} />
          <h2>{plan.name}</h2>
          <p>{plan.description}</p>
          <p>${plan.price}/month</p>
          <ul>
            {plan.features?.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
      ))}
    </>
  )
}
```

### 5. Generate robots.txt & llms.txt at build time

Create `scripts/generate-ai-files.ts`:

```typescript
import fs from 'fs'
import path from 'path'
import {
  RobotsGenerator,
  LLMSTextGenerator
} from '@Muhammadfaizanjanjua109/ai-visibility'

const PUBLIC_DIR = path.join(process.cwd(), 'public')

async function generateAIFiles() {
  console.log('🤖 Generating AI visibility files...')

  // Generate robots.txt
  const robotsTxt = RobotsGenerator.allowAll({
    sitemapUrl: 'https://yoursite.com/sitemap.xml'
  })

  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt)
  console.log('✅ Generated public/robots.txt')

  // Generate llms.txt
  const llmsGen = new LLMSTextGenerator({
    siteName: 'Your App Name',
    description: 'Brief description of your app',
    baseUrl: 'https://yoursite.com',
    pages: [
      { url: '/product', title: 'Product', priority: 'high' },
      { url: '/docs', title: 'Documentation', priority: 'high' },
      { url: '/pricing', title: 'Pricing', priority: 'medium' },
      { url: '/blog', title: 'Blog', priority: 'low' }
    ],
    contact: { email: 'hello@yoursite.com', github: 'yourusername' },
    autoSummarize: false  // Set to true to fetch & summarize
  })

  const llmsTxt = await llmsGen.generate()
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt)
  console.log('✅ Generated public/llms.txt')
}

generateAIFiles().catch(console.error)
```

### 6. Add build hook

Update `package.json`:

```json
{
  "scripts": {
    "build": "next build && npx ts-node scripts/generate-ai-files.ts",
    "postbuild": "npx ts-node scripts/generate-ai-files.ts"
  }
}
```

### 7. Track AI crawler visits (optional)

Create `src/lib/logger.ts`:

```typescript
import { AIVisitorLogger } from '@Muhammadfaizanjanjua109/ai-visibility'

// Singleton instance
let logger: AIVisitorLogger | null = null

export function getLogger() {
  if (!logger) {
    logger = new AIVisitorLogger({
      storage: process.env.NODE_ENV === 'production' ? 'file' : 'memory',
      logFilePath: './logs/ai-crawler.json'
    })
  }
  return logger
}
```

Create `src/app/api/ai-logs/route.ts`:

```typescript
import { getLogger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const logger = getLogger()
  const stats = logger.getStats(7)  // Last 7 days

  return NextResponse.json(stats)
}

// Admin endpoint to view recent logs
export async function POST(request: NextRequest) {
  // Add auth check here!
  const logger = getLogger()
  const { days = 7, botName } = await request.json()

  const logs = logger.getLogs({ days, botName })

  return NextResponse.json(logs)
}
```

---

## File Structure

```
your-nextjs-app/
├── public/
│   ├── robots.txt          (auto-generated)
│   ├── llms.txt            (auto-generated)
│   └── sitemap.xml
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── blog/
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── ai-logs/
│   │           └── route.ts
│   ├── components/
│   │   └── SchemaMarkup.tsx
│   ├── lib/
│   │   └── logger.ts
│   └── middleware.ts
├── scripts/
│   └── generate-ai-files.ts
└── package.json
```

---

## Usage Examples

### Product Page with Schema

```typescript
// src/app/products/[id]/page.tsx
import { SchemaMarkup } from '@/components/SchemaMarkup'

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id)

  return (
    <>
      <SchemaMarkup type="product" data={{
        name: product.name,
        description: product.description,
        price: product.price,
        currency: 'USD',
        availability: 'InStock',
        image: product.imageUrl,
        url: `https://yoursite.com/products/${params.id}`
      }} />
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <p>${product.price}</p>
    </>
  )
}
```

### Blog Post with Article Schema

```typescript
// src/app/blog/[slug]/page.tsx
import { SchemaMarkup } from '@/components/SchemaMarkup'

export default async function BlogPost({ params }) {
  const post = await getPost(params.slug)

  return (
    <>
      <SchemaMarkup type="article" data={{
        headline: post.title,
        description: post.excerpt,
        author: post.author.name,
        publisher: 'Your Site Name',
        publishedDate: post.publishedAt,
        modifiedDate: post.updatedAt,
        url: `https://yoursite.com/blog/${params.slug}`,
        image: post.coverImage,
        keywords: post.tags
      }} />
      <article>
        <h1>{post.title}</h1>
        <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
        <div>{post.content}</div>
      </article>
    </>
  )
}
```

### FAQ Page with FAQ Schema

```typescript
// src/app/faq/page.tsx
import { SchemaMarkup } from '@/components/SchemaMarkup'

const faqs = [
  { q: 'What is your product?', a: 'Our product helps...' },
  { q: 'How much does it cost?', a: 'Starting at $29/month' },
  { q: 'Do you offer a free trial?', a: 'Yes, 14 days free' }
]

export default function FAQPage() {
  return (
    <>
      <SchemaMarkup type="faq" data={faqs} />
      <h1>Frequently Asked Questions</h1>
      {faqs.map((faq) => (
        <div key={faq.q}>
          <h2>{faq.q}</h2>
          <p>{faq.a}</p>
        </div>
      ))}
    </>
  )
}
```

### Root Layout with Global Schema

```typescript
// src/app/layout.tsx
import { SchemaBuilder } from '@Muhammadfaizanjanjua109/ai-visibility'

export default function RootLayout({ children }) {
  const orgSchema = SchemaBuilder.organization({
    name: 'Your Company',
    url: 'https://yoursite.com',
    logo: 'https://yoursite.com/logo.png',
    description: 'Your company description',
    email: 'hello@yoursite.com',
    address: {
      street: '123 Main St',
      city: 'Boston',
      country: 'USA'
    }
  })

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(orgSchema)
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## Testing

### Simulate AI Bot Requests

```bash
# Test with GPTBot User-Agent
curl -H "User-Agent: Mozilla/5.0 (compatible; GPTBot/1.0)" http://localhost:3000/

# Test with ClaudeBot User-Agent
curl -H "User-Agent: Mozilla/5.0 (compatible; ClaudeBot/1.0)" http://localhost:3000/
```

### Verify robots.txt & llms.txt

```bash
# Check robots.txt
curl http://localhost:3000/robots.txt

# Check llms.txt
curl http://localhost:3000/llms.txt
```

### Check AI logs

```bash
# Get stats from the past 7 days
curl http://localhost:3000/api/ai-logs

# Response:
# {
#   "GPTBot": {
#     "totalVisits": 12,
#     "successRate": 100,
#     "lastSeen": "2026-02-19T10:30:00Z"
#   }
# }
```

---

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_SITE_URL=https://yoursite.com
NEXT_PUBLIC_SITE_NAME=Your App Name
```

Update `generate-ai-files.ts` to use environment variables:

```typescript
const llmsGen = new LLMSTextGenerator({
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || 'Your App',
  description: 'Your description',
  baseUrl: process.env.NEXT_PUBLIC_SITE_URL
  // ...
})
```

---

## Deployment Considerations

### Vercel

1. AI files are auto-generated at build time ✅
2. Logs are stored in-memory (lost on redeploy)
   - Solution: Use external logging (database, service)

```typescript
// Use database for persistent logs
import { db } from '@/lib/db'

const logger = new AIVisitorLogger({ storage: 'memory' })

// On every log, also save to database
const originalLog = logger.log.bind(logger)
logger.log = async (entry) => {
  originalLog(entry)
  await db.aiLogs.create(entry)  // Your DB logic
}
```

### Docker / Self-hosted

1. Create `logs/` directory with proper permissions
2. Map as volume for persistence

```dockerfile
RUN mkdir -p /app/logs && chmod 755 /app/logs

VOLUME ["/app/logs"]
```

---

## Performance Tips

1. **Disable verbose logging in production:**
```typescript
// middleware.ts
verbose: process.env.NODE_ENV === 'development'
```

2. **Cache page analysis results:**
```typescript
import { cache } from 'react'

const analyzePageContent = cache(async (html) => {
  const analyzer = new ContentAnalyzer()
  return analyzer.analyze(html)
})
```

3. **Pre-generate summaries for llms.txt:**
```typescript
// generate-ai-files.ts
const llmsGen = new LLMSTextGenerator({
  // ...
  autoSummarize: false,  // Don't fetch URLs at build time
  pages: [
    {
      url: '/docs',
      title: 'Documentation',
      summary: 'Complete API reference and guides'  // Provide manually
    }
  ]
})
```

---

## Related Docs

- [API Reference](../../docs/api-reference.md)
- [Troubleshooting](../../docs/troubleshooting.md)
- [Performance Guide](../../docs/performance.md)
