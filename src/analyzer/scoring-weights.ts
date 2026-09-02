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

import type { AuditCategoryWeight, ScoringDimension } from '../types'

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

/**
 * Fixed, published AI Readiness category weights — schemaVersion 3.
 *
 * PAGE-LEVEL ONLY. Every dimension here is computable from a single page's
 * HTML/headers plus site-level files (robots.txt, llms.txt, ai.txt,
 * sitemap). Nothing in this file requires a live engine query. Signal that
 * only exists as a property of one engine's behaviour for one query at one
 * moment is measurement-level and lives in `visibility-vector.json`, which
 * carries its own independent `schemaVersion`. Collapsing the two into one
 * 0-100 number is what made the old score misrepresent what it measured.
 *
 * Every weight carries an `evidenceGrade` and a `rationale` naming the
 * finding it rests on. Findings are cited in prose, never by identifier:
 * this file is vendored downstream, and a wrong arXiv ID in a vendored file
 * is worse than no ID at all.
 *
 * Note that only `crawlability` is graded `strong`, and it earns that
 * grade by being definitional rather than correlational — a page a crawler
 * cannot fetch cannot be cited, no study required. Every content-side lever
 * here is `moderate` or `weak`. That is an honest reading of the current
 * literature, not an underclaim: a scalar aggregate is only defensible when
 * its weights map to an explicit objective, and pretending the content
 * levers are better-evidenced than they are would defeat the point of
 * grading them at all.
 *
 * Weights sum to 1.0 and none is negative — both enforced by tests and by
 * scripts/generate-scoring-weights-json.js. Consumed by
 * `ContentAnalyzer.audit()` / `src/analyzer/audit-engine.ts`. See
 * docs/scoring.md.
 */
export const CATEGORY_WEIGHTS: AuditCategoryWeight[] = [
    {
        key: 'crawlability',
        label: 'Crawlability',
        weight: 0.18,
        description: 'Whether AI crawlers can actually discover and fetch the page at all: robots.txt, llms.txt, ai.txt, sitemap discoverability, response time, and JavaScript dependency.',
        evidenceGrade: 'strong',
        rationale: 'Definitional rather than correlational: a page an AI crawler is blocked from fetching cannot be retrieved or cited by any downstream step, so no effect size is needed to justify it. Retained as a hard gate that zeroes the overall score outright (see runAudit), which is why its weight is slightly lower in v3 than v2 — the gate, not the weight, carries the consequence.',
    },
    {
        key: 'answerPlacement',
        label: 'Answer placement',
        weight: 0.18,
        description: 'Whether a direct answer to the page\'s topic appears near the top of the content, ahead of preamble — where extraction weights content most heavily.',
        evidenceGrade: 'moderate',
        rationale: 'Our own 50-site study found answer placement the strongest single predictor of score. Graded moderate rather than strong because it is one correlational in-house study, not a replicated controlled experiment. Promoted out of `structure` in v3: as one check among five in a category weighted 0.20 it carried roughly 4% of the overall score, which understated the strongest predictor we have by folding it into the weakest-evidenced category.',
    },
    {
        key: 'citationReadiness',
        label: 'Extractable evidence',
        weight: 0.22,
        description: 'Verifiable numbers carrying units, explicit prices, dates, attributed claims, definitions, and comparisons — the concrete, checkable material that makes a passage worth quoting rather than merely readable.',
        evidenceGrade: 'moderate',
        rationale: 'A 2026 critical survey of 45 GEO studies grades evidence-bearing content interventions in the moderate-to-strong band — the highest of any content-side lever it reviews. Weighted at the top of the page-level set accordingly, but graded at the lower end of that band: the survey reports a range across heterogeneous study designs, and claiming the upper bound for our highest weight would overstate what was actually replicated. Relabelled from "Citation Readiness" in v3 to name the extractable material rather than the hoped-for outcome; the key is unchanged so existing consumers keep resolving.',
    },
    {
        key: 'entitySignals',
        label: 'Entity Signals',
        weight: 0.16,
        description: 'Organization and Person schema, valid JSON-LD, product/service entity relationships, sameAs links, and machine-readable pricing — what lets AI systems resolve who and what this content is about.',
        evidenceGrade: 'moderate',
        rationale: 'Structured data is the most direct machine-readable signal a page can offer, and entity resolution is a documented precondition for attributing a claim to a named source. Graded moderate because the reviewed evidence establishes that entity markup is used, not that adding it reliably moves citation outcomes on its own.',
    },
    {
        key: 'structure',
        label: 'Structural formatting',
        weight: 0.10,
        description: 'Heading hierarchy, semantic HTML landmarks, content-to-noise ratio, and FAQ/How-to patterns — what makes a page machine-segmentable.',
        evidenceGrade: 'weak',
        rationale: 'Halved from 0.20 in v2. The survey reports controlled experiments in which formatting changes made in isolation — reheading, list-ifying, adding semantic landmarks without changing the underlying content — produced weak effects. Segmentability still matters as a floor, so it keeps a non-trivial weight, but it no longer outranks the evidence the segments actually contain. Answer placement, previously scored inside this category, moved out to `answerPlacement` in v3 precisely so a strong signal stopped inheriting this category\'s weak grade.',
    },
    {
        key: 'content',
        label: 'Content',
        weight: 0.09,
        description: 'Snippability, topical depth, freshness signals, and multi-format support (text/tables/lists) for different query types.',
        evidenceGrade: 'weak',
        rationale: 'Depth and freshness are plausible quality proxies but the reviewed studies do not isolate them from the evidence density they correlate with — a deeper page is usually also a more fact-bearing one. Weighted low deliberately so that correlation is not double-counted against `citationReadiness`, which measures the part we can actually verify.',
    },
    {
        key: 'authority',
        label: 'Authority',
        weight: 0.07,
        description: 'Author attribution, About/Team signals, contact information, trust signals, and whether quantitative claims are attributed to an independently checkable source.',
        evidenceGrade: 'moderate',
        rationale: 'Attribution and verifiability are consistently reported as inputs to whether a claim gets repeated, and the attribution check here is a page-level proxy for exactly that. Weighted modestly because our implementation detects the presence of attribution markup, not its accuracy — a fabricated byline scores identically to a real one, so the measurement is weaker than the underlying finding.',
    },
]
