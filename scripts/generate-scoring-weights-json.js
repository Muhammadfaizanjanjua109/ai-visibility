#!/usr/bin/env node

// Emits dist/scoring-weights.json from the already-built
// dist/scoring-weights-internal.js — never hand-maintained separately from
// src/analyzer/scoring-weights.ts. Same pattern as
// scripts/generate-crawlers-json.js: this is the canonical source other
// CrawlPod surfaces (crawlpod.com's scanner, the WordPress plugin, the
// Shopify app, the Python package) should fetch and vendor at build time so
// the scoring weights don't drift the way the crawler registry once did.
// See docs/scoring.md.
//
// v0.9.0: schemaVersion bumped 2 -> 3. This file is now PAGE-LEVEL ONLY —
// every dimension is computable from one page's HTML/headers plus
// site-level files. Measurement-level signal (search activation, retrieval,
// citation) moved to dist/visibility-vector.json, which carries its own
// independent schemaVersion. See scripts/generate-visibility-vector-json.js.
//
// What changed in the payload:
//   - `dimensions` is now seven categories, not six: `answerPlacement` was
//     split out of `structure`.
//   - every dimension carries `evidenceGrade` and `rationale`.
//   - a `scope` block states what this file does and does not measure.
//   - `legacy_dimensions` (the pre-v0.6.0 flat GEO dimensions) is unchanged.
//
// Consumers pinned to schemaVersion 2 MUST NOT silently re-vendor this: v2
// read as v3 loses answerPlacement and renormalizes over weights that no
// longer sum to 1.0. See the migration notes in docs/scoring.md.
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

const SCHEMA_VERSION = 3

const { SCORING_WEIGHTS, CATEGORY_WEIGHTS } = require(path.join(__dirname, '..', 'dist', 'scoring-weights-internal.js'))
const { version: packageVersion } = require(path.join(__dirname, '..', 'package.json'))

function validate(weights, name, requireEvidence) {
    if (!Array.isArray(weights) || weights.length === 0) {
        throw new Error(`${name} is empty or missing from dist/scoring-weights-internal.js — refusing to publish a broken scoring-weights.json`)
    }
    let totalWeight = 0
    for (const dim of weights) {
        if (!dim.key || !dim.label || typeof dim.weight !== 'number' || !dim.description) {
            throw new Error(`${name}: dimension missing a required field: ${JSON.stringify(dim)}`)
        }
        if (dim.weight < 0) {
            throw new Error(`${name}: "${dim.key}" has a negative weight (${dim.weight}). Negative weights are not permitted — a penalty is a property of a rewrite operation, not a scoring dimension.`)
        }
        if (requireEvidence) {
            if (!['strong', 'moderate', 'weak'].includes(dim.evidenceGrade)) {
                throw new Error(`${name}: "${dim.key}" has evidenceGrade ${JSON.stringify(dim.evidenceGrade)} — must be "strong", "moderate", or "weak"`)
            }
            if (!dim.rationale || dim.rationale.length < 40) {
                throw new Error(`${name}: "${dim.key}" is missing a substantive rationale — every v3 weight must name the finding it rests on`)
            }
            // A vendored file is the wrong place to assert an identifier we
            // cannot verify at build time. Findings are cited in prose.
            if (/arxiv|doi:|\b10\.\d{4}\//i.test(dim.rationale)) {
                throw new Error(`${name}: "${dim.key}" rationale contains what looks like a paper identifier. Cite findings descriptively — an unverifiable ID in a vendored file is worse than no ID.`)
            }
        }
        totalWeight += dim.weight
    }
    if (Math.abs(totalWeight - 1) > 0.001) {
        throw new Error(`${name} must sum to 1.0, got ${totalWeight} — refusing to publish an inconsistent scoring-weights.json`)
    }
}

validate(CATEGORY_WEIGHTS, 'CATEGORY_WEIGHTS', true)
validate(SCORING_WEIGHTS, 'SCORING_WEIGHTS', false)

const output = {
    schemaVersion: SCHEMA_VERSION,
    packageVersion,
    generatedAt: new Date().toISOString(),
    source: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/src/analyzer/scoring-weights.ts',
    docs: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/scoring.md',
    scope: {
        level: 'page',
        computableFrom: [
            'page HTML',
            'response headers',
            'robots.txt',
            'llms.txt',
            'ai.txt',
            'sitemap.xml',
        ],
        excludes:
            'Anything requiring a live engine query — search activation, retrieval presence, context position, citation, prominence, fidelity. Those are per-(query, engine, run) observations and live in visibility-vector.json, which versions independently.',
    },
    dimensions: CATEGORY_WEIGHTS,
    legacy_dimensions: SCORING_WEIGHTS,
}

const outPath = path.join(__dirname, '..', 'dist', 'scoring-weights.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')
console.log(`✅ Generated ${path.relative(process.cwd(), outPath)} (${CATEGORY_WEIGHTS.length} page-level categories, ${SCORING_WEIGHTS.length} legacy dimensions, schemaVersion ${SCHEMA_VERSION})`)
