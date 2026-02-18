// ============================================================
// Express.js Example — ai-visibility integration
// ============================================================

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import {
    createAIMiddleware,
    optimizeResponseForAI,
    AIVisitorLogger,
    SchemaBuilder,
} from 'ai-visibility'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

// ---- 1. AI Bot Detection Middleware ----
app.use(createAIMiddleware({ verbose: true }))

// ---- 2. Optimize HTML for AI bots ----
app.use(optimizeResponseForAI({
    stripJs: true,
    removeAds: true,
    removeTracking: true,
}))

// ---- 3. Crawler Activity Logger ----
const logger = new AIVisitorLogger({ storage: 'both' })
app.use(logger.middleware())

// ---- Static files (robots.txt, llms.txt) ----
app.use(express.static(path.join(__dirname, 'public')))

// ---- Routes ----

app.get('/', (_req, res) => {
    const orgSchema = SchemaBuilder.organization({
        name: 'My Company',
        url: 'https://mycompany.com',
        description: 'We build great software',
        email: 'hello@mycompany.com',
    })

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Company</title>
  <meta name="description" content="We build great software for developers">
  <meta name="author" content="My Company Team">
  ${SchemaBuilder.toScriptTag(orgSchema)}
</head>
<body>
  <header>
    <nav><a href="/">Home</a> | <a href="/pricing">Pricing</a> | <a href="/faq">FAQ</a></nav>
  </header>
  <main>
    <h1>We Build Great Software</h1>
    <p>My Company provides developer tools that save 10+ hours per week. Trusted by 5,000+ developers since 2023.</p>
    
    <h2>What We Do</h2>
    <p>We specialize in AI visibility tools, helping your web app get discovered and cited by AI models like ChatGPT and Gemini.</p>
    
    <h2>Why Choose Us</h2>
    <p>Our tools are open-source, free to use, and set up in under 10 minutes. No SEO expertise required.</p>
  </main>
  <footer>
    <a href="mailto:hello@mycompany.com">Contact us</a>
  </footer>
  <script src="/app.js"></script>
  <script>console.log('analytics loaded')</script>
</body>
</html>`)
})

app.get('/pricing', (_req, res) => {
    const productSchema = SchemaBuilder.product({
        name: 'My Company Pro',
        price: 29,
        currency: 'USD',
        features: ['AI visibility optimization', 'Schema generation', 'Crawler monitoring'],
        author: { name: 'Jane Doe', jobTitle: 'Founder' },
    })

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Pricing — My Company</title>
  ${SchemaBuilder.toScriptTag(productSchema)}
</head>
<body>
  <h1>Simple, Transparent Pricing</h1>
  <p>My Company Pro costs $29/month and includes all features. Cancel anytime.</p>
  
  <h2>What's Included</h2>
  <ul>
    <li>AI visibility optimization</li>
    <li>Schema generation</li>
    <li>Crawler monitoring</li>
    <li>Priority support</li>
  </ul>
  
  <h2>Free Plan</h2>
  <p>The core package is always free and open-source. Pro adds advanced analytics and priority support.</p>
</body>
</html>`)
})

app.get('/faq', (_req, res) => {
    const faqSchema = SchemaBuilder.faq([
        { q: 'What is AI visibility?', a: 'AI visibility is optimizing your site so AI models like ChatGPT can discover and cite your content.' },
        { q: 'How long does setup take?', a: 'Less than 10 minutes with our CLI tool.' },
        { q: 'Is it free?', a: 'Yes, the core package is free and open-source.' },
        { q: 'Which frameworks are supported?', a: 'Express, Next.js, Nuxt, Fastify, and any Node.js framework.' },
    ])

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FAQ — My Company</title>
  ${SchemaBuilder.toScriptTag(faqSchema)}
</head>
<body>
  <h1>Frequently Asked Questions</h1>
  <dl>
    <dt>What is AI visibility?</dt>
    <dd>AI visibility is optimizing your site so AI models like ChatGPT can discover and cite your content.</dd>
    
    <dt>How long does setup take?</dt>
    <dd>Less than 10 minutes with our CLI tool.</dd>
    
    <dt>Is it free?</dt>
    <dd>Yes, the core package is free and open-source.</dd>
  </dl>
</body>
</html>`)
})

// ---- Crawler stats endpoint ----
app.get('/api/crawler-stats', (_req, res) => {
    const stats = logger.getStats(7)
    res.json(stats)
})

// ---- Start server ----
const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`)
    console.log(`🤖 AI crawler detection active`)
    console.log(`📊 Crawler stats: http://localhost:${PORT}/api/crawler-stats`)
})
