// ============================================================
// GEO scoring weights — pure data, zero dependencies.
// Deliberately kept out of content-analyzer.ts's module scope: that file
// imports cheerio, which (as of cheerio 1.x) pulls in `undici` for
// cheerio.fromURL(), and eagerly requiring that from a build script hits
// a real Node 18 incompatibility (undici's webidl module referencing the
// global `File`, which isn't defined on some Node 18.x patch releases).
// This module — and its zero-dep entrypoint, src/entrypoints/
// scoring-weights-internal.ts — lets scripts/generate-scoring-weights-json.js
// read SCORING_WEIGHTS without ever loading cheerio/undici.
// ============================================================

import type { ScoringDimension } from '../types'

/**
 * Fixed, published GEO scoring weights. No ML, no black box — every
 * dimension's contribution to `overallScore` is a plain constant documented
 * here and in docs/scoring.md. This is the canonical source other CrawlPod
 * surfaces (crawlpod.com's scanner, the WordPress plugin) should align to;
 * it's also published as `dist/scoring-weights.json` (see
 * scripts/generate-scoring-weights-json.js) for surfaces that can't import
 * this package directly. Weights sum to 1.0 — enforced by a test.
 *
 * Re-exported as `ContentAnalyzer.SCORING_WEIGHTS` (a static, rather than a
 * standalone root-barrel export) so the root export surface stays
 * classes/functions-only.
 */
export const SCORING_WEIGHTS: ScoringDimension[] = [
    {
        key: 'answerFrontLoading',
        label: 'Answer placement',
        weight: 0.20,
        description: 'Whether a direct answer to the page\'s topic appears near the top, where AI systems weight content most heavily.',
    },
    {
        key: 'eeatSignals',
        label: 'Authority signals (E-E-A-T)',
        weight: 0.20,
        description: 'Author, organization, contact, and trust-signal markup — what separates "extractable" content from "citable" content.',
    },
    {
        key: 'headingStructure',
        label: 'Structure',
        weight: 0.15,
        description: 'A single H1 and a consistent, unskipped heading hierarchy, which is what makes a page machine-segmentable.',
    },
    {
        key: 'schemaCoverage',
        label: 'Structured data',
        weight: 0.15,
        description: 'Valid JSON-LD structured data, the most direct machine-readable signal a page can offer.',
    },
    {
        key: 'factDensity',
        label: 'Factual density',
        weight: 0.10,
        description: 'Concrete numbers, dates, and statistics per 100 words. The most heuristic of the checks, weighted accordingly.',
    },
    {
        key: 'snippability',
        label: 'Semantic clarity',
        weight: 0.10,
        description: 'Whether each section under a heading stands alone with enough context to be quoted or excerpted independently.',
    },
    {
        key: 'crawlerAccessibility',
        label: 'Crawler accessibility',
        weight: 0.10,
        description: 'Whether AI crawlers are actually allowed to fetch the page at all (meta robots, robots.txt, llms.txt) — a gate more than a differentiator, since a hard block already zeroes out every other dimension\'s value.',
    },
]
