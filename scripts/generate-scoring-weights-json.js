#!/usr/bin/env node

// Emits dist/scoring-weights.json from the already-built
// dist/scoring-weights-internal.js — never hand-maintained separately from
// src/analyzer/scoring-weights.ts. Same pattern as
// scripts/generate-crawlers-json.js: this is the canonical source other
// CrawlPod surfaces (crawlpod.com's scanner, the WordPress plugin) should
// fetch and vendor at build time so the GEO scoring weights don't drift
// the way the crawler registry once did. See docs/scoring.md.
//
// Deliberately requires dist/scoring-weights-internal.js, NOT dist/index.js:
// index.js statically imports cheerio for ContentAnalyzer, and cheerio 1.x
// depends on undici (for cheerio.fromURL()) — eagerly requiring that here
// breaks on some Node 18.x patch releases (undici's webidl module
// referencing the global `File`, which isn't defined on those releases).
// scoring-weights-internal.js re-exports the same data with zero
// dependencies. See src/analyzer/scoring-weights.ts for the full story.

const fs = require('fs')
const path = require('path')

const SCHEMA_VERSION = 1

const { SCORING_WEIGHTS } = require(path.join(__dirname, '..', 'dist', 'scoring-weights-internal.js'))
const { version: packageVersion } = require(path.join(__dirname, '..', 'package.json'))

if (!Array.isArray(SCORING_WEIGHTS) || SCORING_WEIGHTS.length === 0) {
    throw new Error('SCORING_WEIGHTS is empty or missing from dist/scoring-weights-internal.js — refusing to publish a broken scoring-weights.json')
}

let totalWeight = 0
for (const dim of SCORING_WEIGHTS) {
    if (!dim.key || !dim.label || typeof dim.weight !== 'number' || !dim.description) {
        throw new Error(`Scoring dimension missing a required field: ${JSON.stringify(dim)}`)
    }
    totalWeight += dim.weight
}
if (Math.abs(totalWeight - 1) > 0.001) {
    throw new Error(`SCORING_WEIGHTS must sum to 1.0, got ${totalWeight} — refusing to publish an inconsistent scoring-weights.json`)
}

const output = {
    schemaVersion: SCHEMA_VERSION,
    packageVersion,
    generatedAt: new Date().toISOString(),
    source: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/src/analyzer/scoring-weights.ts',
    docs: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/scoring.md',
    dimensions: SCORING_WEIGHTS,
}

const outPath = path.join(__dirname, '..', 'dist', 'scoring-weights.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')
console.log(`✅ Generated ${path.relative(process.cwd(), outPath)} (${SCORING_WEIGHTS.length} dimensions, schemaVersion ${SCHEMA_VERSION})`)
