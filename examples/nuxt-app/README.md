# Nuxt.js Integration Example

Complete example of integrating `ai-visibility` into a Nuxt 3 application.

---

## Overview

This example shows how to:
1. Add AI bot detection with server middleware
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

### 2. Create server middleware

Create `server/middleware/ai-detector.ts`:

```typescript
import { createAIMiddleware } from '@Muhammadfaizanjanjua109/ai-visibility'

const aiMiddleware = createAIMiddleware({
  verbose: process.env.NODE_ENV === 'development'
})

export default defineEventHandler((event) => {
  // Convert Express middleware to H3 event handler
  // Access User-Agent from headers
  const userAgent = getHeader(event, 'user-agent') || ''

  const detector = new (require('@Muhammadfaizanjanjua109/ai-visibility').AIBotDetector)()
  const botInfo = detector.detect(userAgent)

  // Attach to event context
  event.node.req.isAIBot = !!botInfo
  event.node.req.aiBotInfo = botInfo || undefined
})
```

Or use a plugin for H3 native integration:

Create `server/plugins/ai-detector.ts`:

```typescript
import {
  AIBotDetector,
  type BotInfo
} from '@Muhammadfaizanjanjua109/ai-visibility'

declare global {
  namespace H3 {
    interface H3EventContext {
      isAIBot?: boolean
      aiBotInfo?: BotInfo
    }
  }
}

export default defineEventHandler((event) => {
  const userAgent = getHeader(event, 'user-agent') || ''
  const detector = new AIBotDetector()
  const botInfo = detector.detect(userAgent)

  event.context.isAIBot = !!botInfo
  event.context.aiBotInfo = botInfo
})
```

### 3. Create composable for schema markup

Create `composables/useSchemaMarkup.ts`:

```typescript
import { SchemaBuilder } from '@Muhammadfaizanjanjua109/ai-visibility'
import type {
  ProductSchemaData,
  ArticleSchemaData,
  FAQItem
} from '@Muhammadfaizanjanjua109/ai-visibility'

export function useSchemaMarkup() {
  const addProductSchema = (data: ProductSchemaData) => {
    const schema = SchemaBuilder.product(data)
    useHead({
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema)
      }]
    })
  }

  const addArticleSchema = (data: ArticleSchemaData) => {
    const schema = SchemaBuilder.article(data)
    useHead({
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema)
      }]
    })
  }

  const addFAQSchema = (items: FAQItem[]) => {
    const schema = SchemaBuilder.faq(items)
    useHead({
      script: [{
        type: 'application/ld+json',
        innerHTML: JSON.stringify(schema)
      }]
    })
  }

  return {
    addProductSchema,
    addArticleSchema,
    addFAQSchema
  }
}
```

### 4. Use schema on pages

Example: `pages/pricing.vue`

```vue
<template>
  <div>
    <h1>Pricing Plans</h1>
    <div v-for="plan in plans" :key="plan.name" class="plan">
      <h2>{{ plan.name }}</h2>
      <p>{{ plan.description }}</p>
      <p class="price">${{ plan.price }}/month</p>
      <ul>
        <li v-for="feature in plan.features" :key="feature">
          {{ feature }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductSchemaData } from '@Muhammadfaizanjunjua109/ai-visibility'
import { useSchemaMarkup } from '@/composables/useSchemaMarkup'

const { addProductSchema } = useSchemaMarkup()

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

// Add schema for each plan
onMounted(() => {
  plans.forEach(plan => {
    addProductSchema(plan)
  })
})
</script>
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
    autoSummarize: false
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
    "build": "nuxi build && npx ts-node scripts/generate-ai-files.ts"
  }
}
```

### 7. Track AI crawler visits (optional)

Create `server/utils/logger.ts`:

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

Create `server/api/ai-logs.ts`:

```typescript
import { getLogger } from '~/server/utils/logger'

export default defineEventHandler(async (event) => {
  const logger = getLogger()

  if (event.node.req.method === 'GET') {
    // Get stats
    const stats = logger.getStats(7)
    return stats
  }

  if (event.node.req.method === 'POST') {
    // Get detailed logs
    const { days = 7, botName } = await readBody(event)
    const logs = logger.getLogs({ days, botName })
    return logs
  }
})
```

---

## File Structure

```
your-nuxt-app/
├── public/
│   ├── robots.txt          (auto-generated)
│   ├── llms.txt            (auto-generated)
│   └── sitemap.xml
├── server/
│   ├── middleware/
│   │   └── ai-detector.ts
│   ├── plugins/
│   │   └── ai-detector.ts
│   ├── utils/
│   │   └── logger.ts
│   └── api/
│       └── ai-logs.ts
├── composables/
│   └── useSchemaMarkup.ts
├── pages/
│   ├── index.vue
│   ├── pricing.vue
│   ├── faq.vue
│   └── blog/
│       └── [slug].vue
├── layouts/
│   └── default.vue
├── scripts/
│   └── generate-ai-files.ts
├── nuxt.config.ts
└── package.json
```

---

## Usage Examples

### Product Page with Schema

```vue
<template>
  <div class="product">
    <h1>{{ product.name }}</h1>
    <img :src="product.image" :alt="product.name" />
    <p>{{ product.description }}</p>
    <p class="price">${{ product.price }}/month</p>
    <button>Add to Cart</button>
  </div>
</template>

<script setup lang="ts">
import type { ProductSchemaData } from '@Muhammadfaizanjunjua109/ai-visibility'
import { useSchemaMarkup } from '@/composables/useSchemaMarkup'

const { addProductSchema } = useSchemaMarkup()
const route = useRoute()

const product = ref<any>(null)

onMounted(async () => {
  product.value = await $fetch(`/api/products/${route.params.id}`)

  // Add schema
  addProductSchema({
    name: product.value.name,
    description: product.value.description,
    price: product.value.price,
    currency: 'USD',
    availability: 'InStock',
    image: product.value.imageUrl,
    url: `https://yoursite.com/products/${route.params.id}`
  } as ProductSchemaData)
})
</script>
```

### Blog Post with Article Schema

```vue
<template>
  <article>
    <h1>{{ post.title }}</h1>
    <time>{{ new Date(post.publishedAt).toLocaleDateString() }}</time>
    <div class="content" v-html="post.content"></div>
  </article>
</template>

<script setup lang="ts">
import type { ArticleSchemaData } from '@Muhammadfaizanjunjua109/ai-visibility'
import { useSchemaMarkup } from '@/composables/useSchemaMarkup'

const { addArticleSchema } = useSchemaMarkup()
const route = useRoute()

const post = ref<any>(null)

onMounted(async () => {
  post.value = await $fetch(`/api/posts/${route.params.slug}`)

  addArticleSchema({
    headline: post.value.title,
    description: post.value.excerpt,
    author: post.value.author.name,
    publisher: 'Your Site Name',
    publishedDate: post.value.publishedAt,
    modifiedDate: post.value.updatedAt,
    url: `https://yoursite.com/blog/${route.params.slug}`,
    image: post.value.coverImage
  } as ArticleSchemaData)
})
</script>
```

### FAQ Page with FAQ Schema

```vue
<template>
  <div class="faq">
    <h1>Frequently Asked Questions</h1>
    <div v-for="faq in faqs" :key="faq.q" class="faq-item">
      <h2>{{ faq.q }}</h2>
      <p>{{ faq.a }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FAQItem } from '@Muhammadfaizanjunjua109/ai-visibility'
import { useSchemaMarkup } from '@/composables/useSchemaMarkup'

const { addFAQSchema } = useSchemaMarkup()

const faqs: FAQItem[] = [
  { q: 'What is your product?', a: 'Our product helps...' },
  { q: 'How much does it cost?', a: 'Starting at $29/month' },
  { q: 'Do you offer a free trial?', a: 'Yes, 14 days free' }
]

onMounted(() => {
  addFAQSchema(faqs)
})
</script>
```

### Global Layout with Organization Schema

```vue
<template>
  <div>
    <header>
      <nav>
        <NuxtLink to="/">Home</NuxtLink>
        <NuxtLink to="/pricing">Pricing</NuxtLink>
        <NuxtLink to="/blog">Blog</NuxtLink>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer>
      <p>&copy; 2026 Your Company</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { SchemaBuilder } from '@Muhammadfaizanjunjua109/ai-visibility'

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

useHead({
  script: [{
    type: 'application/ld+json',
    innerHTML: JSON.stringify(orgSchema)
  }]
})
</script>
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
curl http://localhost:3000/robots.txt
curl http://localhost:3000/llms.txt
```

### Check AI logs API

```bash
# Get stats
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

## Performance Tips

1. **Use `<ClientOnly>` for client-side schema injection:**
```vue
<ClientOnly>
  <div v-if="product">
    <!-- Schema added via composable -->
  </div>
</ClientOnly>
```

2. **Cache API responses:**
```typescript
const product = ref<any>(null)

onMounted(async () => {
  product.value = await $fetch(`/api/products/${route.params.id}`)
})
```

3. **Lazy-load analysis composable:**
```typescript
const { useSchemaMarkup } = await import('@/composables/useSchemaMarkup')
```

---

## Environment Variables

Create `.env`:

```
NUXT_PUBLIC_SITE_URL=https://yoursite.com
NUXT_PUBLIC_SITE_NAME=Your App Name
```

Update `scripts/generate-ai-files.ts`:

```typescript
const llmsGen = new LLMSTextGenerator({
  siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'Your App',
  description: 'Your description',
  baseUrl: process.env.NUXT_PUBLIC_SITE_URL
})
```

---

## Deployment

### Vercel / Netlify

1. AI files are auto-generated at build time ✅
2. Logs are in-memory (lost on redeploy)
   - Use serverless database for persistence

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
