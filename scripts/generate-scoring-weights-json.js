#!/usr/bin/env node

// Emits dist/scoring-weights.json from the already-built
// dist/scoring-weights-internal.js — never hand-maintained separately from
// src/analyzer/scoring-weights.ts. Same pattern as
// scripts/generate-crawlers-json.js: this is the canonical source other
// CrawlPod surfaces (crawlpod.com's scanner, the WordPress plugin) should
// fetch and vendor at build time so the scoring weights don't drift the
// way the crawler registry once did. See docs/scoring.md.
//
// v0.6.0: schemaVersion bumped 1 -> 2. `dimensions` is now the six AI
// Readiness categories (CATEGORY_WEIGHTS); the old seven flat GEO
// dimensions (SCORING_WEIGHTS) are published alongside as
// `legacy_dimensions` so WordPress/Python consumers that already parse
// `dimensions` as the old shape don't silently break on upgrade — they
// need to switch to `legacy_dimensions` (or migrate to `dimensions`) once
// they see schemaVersion 2.
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

const SCHEMA_VERSION = 2

const { SCORING_WEIGHTS, CATEGORY_WEIGHTS } = require(path.join(__dirname, '..', 'dist', 'scoring-weights-internal.js'))
const { version: packageVersion } = require(path.join(__dirname, '..', 'package.json'))

function validate(weights, name) {
    if (!Array.isArray(weights) || weights.length === 0) {
        throw new Error(`${name} is empty or missing from dist/scoring-weights-internal.js — refusing to publish a broken scoring-weights.json`)
    }
    let totalWeight = 0
    for (const dim of weights) {
        if (!dim.key || !dim.label || typeof dim.weight !== 'number' || !dim.description) {
            throw new Error(`${name}: dimension missing a required field: ${JSON.stringify(dim)}`)
        }
        totalWeight += dim.weight
    }
    if (Math.abs(totalWeight - 1) > 0.001) {
        throw new Error(`${name} must sum to 1.0, got ${totalWeight} — refusing to publish an inconsistent scoring-weights.json`)
    }
}

validate(CATEGORY_WEIGHTS, 'CATEGORY_WEIGHTS')
validate(SCORING_WEIGHTS, 'SCORING_WEIGHTS')

const output = {
    schemaVersion: SCHEMA_VERSION,
    packageVersion,
    generatedAt: new Date().toISOString(),
    source: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/src/analyzer/scoring-weights.ts',
    docs: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/scoring.md',
    dimensions: CATEGORY_WEIGHTS,
    legacy_dimensions: SCORING_WEIGHTS,
}

const outPath = path.join(__dirname, '..', 'dist', 'scoring-weights.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')
console.log(`✅ Generated ${path.relative(process.cwd(), outPath)} (${CATEGORY_WEIGHTS.length} categories, ${SCORING_WEIGHTS.length} legacy dimensions, schemaVersion ${SCHEMA_VERSION})`)
