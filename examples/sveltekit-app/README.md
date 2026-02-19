# SvelteKit Integration Example

Complete example of integrating `ai-visibility` into a SvelteKit application.

---

## Overview

This example shows how to:
1. Add AI bot detection with hooks
2. Inject schema markup on pages
3. Auto-generate `robots.txt` and `llms.txt` at build time
4. Analyze pages for AI readiness
5. Track AI crawler visits

---

## Setup

### 1. Install the package

```bash
npm install @Muhammadfaizanjunjua109/ai-visibility
# or
pnpm add @Muhammadfaizanjunjua109/ai-visibility
```

### 2. Create server hooks

Create `src/hooks.server.ts`:

```typescript
import { AIBotDetector } from '@Muhammadfaizanjunjua109/ai-visibility'
import type { Handle } from '@sveltejs/kit'

const detector = new AIBotDetector()

export const handle: Handle = async ({ event, resolve }) => {
  const userAgent = event.request.headers.get('user-agent') || ''
  const botInfo = detector.detect(userAgent)

  // Attach bot info to locals
  event.locals.isAIBot = !!botInfo
  event.locals.aiBotInfo = botInfo

  return resolve(event)
}
```

### 3. Create schema component

Create `src/lib/Schema.svelte`:

```svelte
<script lang="ts">
  import { SchemaBuilder } from '@Muhammadfaizanjunjua109/ai-visibility'
  import type {
    ProductSchemaData,
    ArticleSchemaData,
    FAQItem
  } from '@Muhammadfaizanjunjua109/ai-visibility'

  export let type: 'product' | 'article' | 'faq' | 'organization'
  export let data: any

  let schema: any

  $: {
    switch (type) {
      case 'product':
        schema = SchemaBuilder.product(data as ProductSchemaData)
        break
      case 'article':
        schema = SchemaBuilder.article(data as ArticleSchemaData)
        break
      case 'faq':
        schema = SchemaBuilder.faq(data as FAQItem[])
        break
      case 'organization':
        schema = SchemaBuilder.organization(data)
        break
    }
  }
</script>

<svelte:head>
  {@html `<script type="application/ld+json">${JSON.stringify(schema)}</script>`}
</svelte:head>
```

### 4. Add schema to pages

Example: `src/routes/pricing/+page.svelte`

```svelte
<script lang="ts">
  import Schema from '$lib/Schema.svelte'
  import type { ProductSchemaData } from '@Muhammadfaizanjunjua109/ai-visibility'

  const plans: ProductSchemaData[] = [
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
</script>

<svelte:head>
  <title>Pricing</title>
</svelte:head>

<h1>Pricing Plans</h1>

{#each plans as plan (plan.name)}
  <Schema type="product" data={plan} />
  <div class="plan">
    <h2>{plan.name}</h2>
    <p>{plan.description}</p>
    <p class="price">${plan.price}/month</p>
    <ul>
      {#each plan.features || [] as feature}
        <li>{feature}</li>
      {/each}
    </ul>
  </div>
{/each}
```

### 5. Generate robots.txt & llms.txt at build time

Create `scripts/generate-ai-files.ts`:

```typescript
import fs from 'fs'
import path from 'path'
import {
  RobotsGenerator,
  LLMSTextGenerator
} from '@Muhammadfaizanjunjua109/ai-visibility'

const PUBLIC_DIR = path.join(process.cwd(), 'static')

async function generateAIFiles() {
  console.log('🤖 Generating AI visibility files...')

  // Generate robots.txt
  const robotsTxt = RobotsGenerator.allowAll({
    sitemapUrl: 'https://yoursite.com/sitemap.xml'
  })

  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt)
  console.log('✅ Generated static/robots.txt')

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
    autoSummarize: false
  })

  const llmsTxt = await llmsGen.generate()
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt)
  console.log('✅ Generated static/llms.txt')
}

generateAIFiles().catch(console.error)
```

### 6. Add build hook

Update `package.json`:

```json
{
  "scripts": {
    "build": "npm run build:ai && vite build",
    "build:ai": "npx ts-node scripts/generate-ai-files.ts"
  }
}
```

### 7. Track AI crawler visits (optional)

Create `src/lib/server/logger.ts`:

```typescript
import { AIVisitorLogger } from '@Muhammadfaizanjunjua109/ai-visibility'

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

Create `src/routes/api/ai-logs/+server.ts`:

```typescript
import { getLogger } from '$lib/server/logger'
import { json } from '@sveltejs/kit'

export async function GET() {
  const logger = getLogger()
  const stats = logger.getStats(7)  // Last 7 days

  return json(stats)
}

export async function POST({ request }) {
  const logger = getLogger()
  const { days = 7, botName } = await request.json()

  const logs = logger.getLogs({ days, botName })

  return json(logs)
}
```

---

## File Structure

```
your-sveltekit-app/
├── static/
│   ├── robots.txt          (auto-generated)
│   ├── llms.txt            (auto-generated)
│   └── sitemap.xml
├── src/
│   ├── routes/
│   │   ├── +page.svelte
│   │   ├── +layout.svelte
│   │   ├── pricing/
│   │   │   └── +page.svelte
│   │   ├── blog/
│   │   │   ├── +page.svelte
│   │   │   └── [slug]/
│   │   │       └── +page.svelte
│   │   ├── faq/
│   │   │   └── +page.svelte
│   │   └── api/
│   │       └── ai-logs/
│   │           └── +server.ts
│   ├── lib/
│   │   ├── Schema.svelte
│   │   └── server/
│   │       └── logger.ts
│   └── hooks.server.ts
├── scripts/
│   └── generate-ai-files.ts
├── svelte.config.js
└── package.json
```

---

## Usage Examples

### Product Page with Schema

```svelte
<script lang="ts">
  import Schema from '$lib/Schema.svelte'
  import type { PageData } from './$types'

  export let data: PageData

  const { product } = data
</script>

<svelte:head>
  <title>{product.name}</title>
</svelte:head>

<Schema type="product" data={{
  name: product.name,
  description: product.description,
  price: product.price,
  currency: 'USD',
  availability: 'InStock',
  image: product.imageUrl,
  url: `https://yoursite.com/products/${product.id}`
}} />

<h1>{product.name}</h1>
<img src={product.imageUrl} alt={product.name} />
<p>{product.description}</p>
<p class="price">${product.price}</p>
<button>Add to Cart</button>
```

Create `src/routes/products/[id]/+page.ts`:

```typescript
export async function load({ params }) {
  const product = await fetch(`/api/products/${params.id}`).then(r => r.json())
  return { product }
}
```

### Blog Post with Article Schema

```svelte
<script lang="ts">
  import Schema from '$lib/Schema.svelte'
  import type { PageData } from './$types'

  export let data: PageData

  const { post } = data
</script>

<svelte:head>
  <title>{post.title}</title>
</svelte:head>

<Schema type="article" data={{
  headline: post.title,
  description: post.excerpt,
  author: post.author.name,
  publisher: 'Your Site Name',
  publishedDate: post.publishedAt,
  modifiedDate: post.updatedAt,
  url: `https://yoursite.com/blog/${post.slug}`,
  image: post.coverImage,
  keywords: post.tags
}} />

<article>
  <h1>{post.title}</h1>
  <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
  <div class="content">
    {@html post.content}
  </div>
</article>
```

Create `src/routes/blog/[slug]/+page.ts`:

```typescript
export async function load({ params }) {
  const post = await fetch(`/api/posts/${params.slug}`).then(r => r.json())
  return { post }
}
```

### FAQ Page with FAQ Schema

```svelte
<script lang="ts">
  import Schema from '$lib/Schema.svelte'
  import type { FAQItem } from '@Muhammadfaizanjunjua109/ai-visibility'

  const faqs: FAQItem[] = [
    { q: 'What is your product?', a: 'Our product helps...' },
    { q: 'How much does it cost?', a: 'Starting at $29/month' },
    { q: 'Do you offer a free trial?', a: 'Yes, 14 days free' }
  ]
</script>

<svelte:head>
  <title>FAQ</title>
</svelte:head>

<Schema type="faq" data={faqs} />

<h1>Frequently Asked Questions</h1>

{#each faqs as faq (faq.q)}
  <div class="faq-item">
    <h2>{faq.q}</h2>
    <p>{faq.a}</p>
  </div>
{/each}
```

### Global Layout with Organization Schema

```svelte
<script lang="ts">
  import Schema from '$lib/Schema.svelte'
</script>

<Schema type="organization" data={{
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
}} />

<header>
  <nav>
    <a href="/">Home</a>
    <a href="/pricing">Pricing</a>
    <a href="/blog">Blog</a>
  </nav>
</header>

<main>
  <slot />
</main>

<footer>
  <p>&copy; 2026 Your Company</p>
</footer>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }

  header {
    background: #333;
    color: white;
    padding: 1rem;
  }

  nav {
    display: flex;
    gap: 2rem;
  }

  nav a {
    color: white;
    text-decoration: none;
  }

  main {
    max-width: 1000px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  footer {
    background: #f0f0f0;
    padding: 2rem;
    text-align: center;
    margin-top: 4rem;
  }
</style>
```

---

## Testing

### Simulate AI Bot Requests

```bash
# Test with GPTBot User-Agent
curl -H "User-Agent: Mozilla/5.0 (compatible; GPTBot/1.0)" http://localhost:5173/

# Test with ClaudeBot User-Agent
curl -H "User-Agent: Mozilla/5.0 (compatible; ClaudeBot/1.0)" http://localhost:5173/
```

### Verify robots.txt & llms.txt

```bash
curl http://localhost:5173/robots.txt
curl http://localhost:5173/llms.txt
```

### Check AI logs API

```bash
# Get stats
curl http://localhost:5173/api/ai-logs

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

Create `.env`:

```
VITE_SITE_URL=https://yoursite.com
VITE_SITE_NAME=Your App Name
```

Update `scripts/generate-ai-files.ts`:

```typescript
const llmsGen = new LLMSTextGenerator({
  siteName: process.env.VITE_SITE_NAME || 'Your App',
  description: 'Your description',
  baseUrl: process.env.VITE_SITE_URL
})
```

---

## TypeScript Support

Add types to `src/app.d.ts`:

```typescript
declare namespace App {
  interface Locals {
    isAIBot: boolean
    aiBotInfo?: import('@Muhammadfaizanjunjua109/ai-visibility').BotInfo
  }
}
```

---

## Performance Tips

1. **Cache API responses with SvelteKit's load:**
```typescript
// src/routes/products/+page.ts
export async function load({ fetch }) {
  const products = await fetch('/api/products', {
    credentials: 'include'
  }).then(r => r.json())

  return { products }
}
```

2. **Pre-generate summaries for llms.txt:**
```typescript
// scripts/generate-ai-files.ts
const llmsGen = new LLMSTextGenerator({
  // ...
  autoSummarize: false,  // Provide summaries manually
  pages: [
    {
      url: '/docs',
      title: 'Docs',
      summary: 'Complete API reference and guides'
    }
  ]
})
```

---

## Deployment

### Vercel / Netlify

1. AI files are auto-generated at build time ✅
2. Logs are in-memory (lost on redeploy)
   - Use serverless database (Supabase, PlanetScale) for persistence

### Self-hosted / Docker

Create `logs/` directory with proper permissions:

```dockerfile
RUN mkdir -p /app/logs && chmod 755 /app/logs
VOLUME ["/app/logs"]
```

---

## Related Docs

- [API Reference](../../docs/api-reference.md)
- [Troubleshooting](../../docs/troubleshooting.md)
- [Performance Guide](../../docs/performance.md)
