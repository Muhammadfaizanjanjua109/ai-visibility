#!/usr/bin/env node

// Emits dist/crawlers.json from the already-built dist/detector.js — never
// hand-maintained separately from src/data/crawlers.ts. This is what other
// surfaces (the CrawlPod WordPress plugin, a future Shopify app) fetch and
// vendor at build time instead of duplicating the crawler list by hand.
// See docs/crawler-registry.md for the consumption pattern and the
// re-verification checklist that keeps it trustworthy.

const fs = require('fs')
const path = require('path')

const SCHEMA_VERSION = 1

const { AI_CRAWLERS } = require(path.join(__dirname, '..', 'dist', 'detector.js'))
const { version: packageVersion } = require(path.join(__dirname, '..', 'package.json'))

if (!Array.isArray(AI_CRAWLERS) || AI_CRAWLERS.length === 0) {
    throw new Error('AI_CRAWLERS is empty or missing from dist/detector.js — refusing to publish a broken crawlers.json')
}
for (const bot of AI_CRAWLERS) {
    if (!bot.name || !bot.company || !bot.userAgentPattern || !bot.purpose) {
        throw new Error(`Crawler entry missing a required field: ${JSON.stringify(bot)}`)
    }
}

const output = {
    schemaVersion: SCHEMA_VERSION,
    packageVersion,
    generatedAt: new Date().toISOString(),
    source: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/src/data/crawlers.ts',
    docs: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/crawler-registry.md',
    crawlers: AI_CRAWLERS,
}

const outPath = path.join(__dirname, '..', 'dist', 'crawlers.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')
console.log(`✅ Generated ${path.relative(process.cwd(), outPath)} (${AI_CRAWLERS.length} crawlers, schemaVersion ${SCHEMA_VERSION})`)
