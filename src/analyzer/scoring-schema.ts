// ============================================================
// Page-level scoring schema: version guard, loader, and the canonical
// overall-score computation. Pure data + arithmetic, zero dependencies —
// this module sits in the scoring-weights-internal import graph, so it must
// never pull in cheerio/undici (see src/analyzer/scoring-weights.ts).
//
// The version guard and computeOverallScore() previously existed only in
// downstream consumers (the Shopify app reimplemented both against its
// vendored copy). Publishing them here makes this package the single
// definition, so a consumer's renormalization can no longer drift from the
// weights it renormalizes over.
// ============================================================

import type {
    AuditCategoryKey,
    AuditCategoryWeight,
    CategoryScores,
    OverallScoreResult,
    ScoringWeightsFile,
} from '../types'
import { CATEGORY_WEIGHTS } from './scoring-weights'

/**
 * The page-level schema version this build understands.
 *
 * Bump only alongside the code changes needed to handle the new shape. A
 * re-vendor that changes schemaVersion without a matching code change must
 * fail loudly, not silently mis-score every audit.
 *
 * v3 (this build): seven page-level categories, each carrying
 *   `evidenceGrade` and `rationale`; `answerPlacement` split out of
 *   `structure`; `scope` block added.
 * v2: six categories, no evidence metadata, answer placement folded into
 *   `structure`.
 * v1: seven flat GEO dimensions (now published as `legacy_dimensions`).
 */
export const SUPPORTED_SCORING_SCHEMA_VERSION = 3

/**
 * Independent of the scoring version on purpose. The two files describe
 * different kinds of thing and move on different clocks; a shared version
 * counter would force a meaningless bump on one every time the other
 * changed, which is how the page/measurement distinction got blurred in the
 * first place.
 *
 * v2 (this build): every adapter requests retrieval, so `observability`
 *   gains `mechanism` and `requiresWebSearch` and three of four engines flip
 *   `searchActivation` to true; denominators gain `runsRetrievalUnknown`.
 * v1: activation observable on Perplexity and Gemini only.
 *
 * The scoring schema did not move for this release — which is the split
 * working as designed.
 */
export const SUPPORTED_VISIBILITY_VECTOR_SCHEMA_VERSION = 2

/** What changed at each measurement-level schema version, so a mismatch names the actual difference. */
const VECTOR_VERSION_NOTES: Record<number, string> = {
    1: 'activation observable on Perplexity and Gemini only; OpenAI/Anthropic citations regex-scraped from prose; no runsRetrievalUnknown',
    2: 'all four adapters request retrieval and report activation; observability rows carry mechanism + requiresWebSearch; runsRetrievalUnknown added',
}

/** What changed at each page-level schema version, quoted into the error message so the fix is legible without opening the changelog. */
const SCORING_VERSION_NOTES: Record<number, string> = {
    1: 'seven flat GEO dimensions (answerFrontLoading, eeatSignals, headingStructure, schemaCoverage, factDensity, snippability, crawlerAccessibility)',
    2: 'six AI Readiness categories, no evidenceGrade/rationale, answer placement folded into "structure"',
    3: 'seven page-level categories with evidenceGrade + rationale, "answerPlacement" split out of "structure", "scope" block added',
}

function describeVersion(version: number): string {
    const note = SCORING_VERSION_NOTES[version]
    return note ? `v${version} (${note})` : `v${version} (unknown to this build)`
}

/**
 * Rejects any weights file whose schemaVersion is not exactly the one this
 * build understands — in both directions. A v2 file loaded by a v3 build
 * throws, and a v3 file loaded by a v2-pinned build throws too (pass
 * `expected` to check against a version other than this build's).
 *
 * Bidirectional matters because the failure is asymmetric but equally
 * silent either way: v2 read as v3 loses `answerPlacement` entirely and
 * renormalizes over six weights that no longer sum to 1.0, while v3 read as
 * v2 picks up a seventh category the consumer has no key for and quietly
 * drops 18% of the score. Neither throws on its own — both just produce a
 * plausible wrong number.
 *
 * Pure so it is testable without mocking a JSON import: pass any version
 * number, real or fabricated.
 */
export function assertSupportedSchemaVersion(
    schemaVersion: number,
    expected: number = SUPPORTED_SCORING_SCHEMA_VERSION
): void {
    if (schemaVersion === expected) return
    throw new Error(
        `scoring-weights.json schema mismatch: file is schemaVersion ${schemaVersion}, but this build understands schemaVersion ${expected}. ` +
            `Found ${describeVersion(schemaVersion)}; expected ${describeVersion(expected)}. ` +
            `Update the consuming code for the new dimension shape before trusting these weights, then bump SUPPORTED_SCORING_SCHEMA_VERSION. ` +
            `Do not coerce the version — the two shapes score differently and neither fails loudly on its own.`
    )
}

/** The measurement-level equivalent. Separate function, separate constant, separate error text — the two files are never interchangeable. */
export function assertSupportedVisibilityVectorSchemaVersion(
    schemaVersion: number,
    expected: number = SUPPORTED_VISIBILITY_VECTOR_SCHEMA_VERSION
): void {
    if (schemaVersion === expected) return
    const describe = (v: number): string => {
        const note = VECTOR_VERSION_NOTES[v]
        return note ? `v${v} (${note})` : `v${v} (unknown to this build)`
    }
    throw new Error(
        `visibility-vector.json schema mismatch: file is schemaVersion ${schemaVersion}, but this build understands schemaVersion ${expected}. ` +
            `Found ${describe(schemaVersion)}; expected ${describe(expected)}. ` +
            `This is the measurement-level schema (per query/engine/run observations) and versions independently of scoring-weights.json — ` +
            `do not assume a matching scoring schemaVersion implies a matching vector schemaVersion.`
    )
}

/**
 * Validates a parsed weights file end to end: version, non-empty
 * dimensions, no negative weights, and a sum of 1.0. Returns it typed.
 *
 * The weight-sum check is not redundant with the build-time check in
 * scripts/generate-scoring-weights-json.js — that one guards what we
 * publish, this one guards what a consumer actually loaded, which may be a
 * stale or hand-edited vendored copy.
 */
export function loadScoringWeights(
    raw: unknown,
    expected: number = SUPPORTED_SCORING_SCHEMA_VERSION
): ScoringWeightsFile {
    if (!raw || typeof raw !== 'object') {
        throw new Error('scoring-weights.json did not parse to an object')
    }
    const file = raw as ScoringWeightsFile
    assertSupportedSchemaVersion(file.schemaVersion, expected)
    assertValidWeights(file.dimensions, 'scoring-weights.json dimensions')
    return file
}

/** Shared by the loader and the build script's validate step. Throws on empty, negative, or non-unit-sum weights. */
export function assertValidWeights(dimensions: AuditCategoryWeight[], label: string): void {
    if (!Array.isArray(dimensions) || dimensions.length === 0) {
        throw new Error(`${label} is empty or missing — refusing to score against no weights`)
    }
    let total = 0
    for (const dimension of dimensions) {
        if (dimension.weight < 0) {
            throw new Error(
                `${label}: "${dimension.key}" has a negative weight (${dimension.weight}). ` +
                    `Negative weights are not permitted — a penalty is a property of a rewrite operation, not a scoring dimension.`
            )
        }
        total += dimension.weight
    }
    if (Math.abs(total - 1) > 0.001) {
        throw new Error(`${label} must sum to 1.0, got ${total}`)
    }
}

/** `{ categoryKey: weight }` for the built-in v3 weights. */
export function getCategoryWeights(): Record<AuditCategoryKey, number> {
    const weights = {} as Record<AuditCategoryKey, number>
    for (const dimension of CATEGORY_WEIGHTS) {
        weights[dimension.key] = dimension.weight
    }
    return weights
}

/**
 * Weighted 0-100 overall score, renormalized over whichever categories are
 * actually present in `scores`.
 *
 * A category is legitimately absent when no check applied to this page (see
 * `CategoryScores`) — that is not an error, so it is excluded from both the
 * numerator and the weight denominator rather than scored as 0. Scoring an
 * absent category as zero would punish a page for lacking a surface it was
 * never supposed to have.
 *
 * `hardGate` zeroes the result outright, independently of the weights: when
 * AI crawlers are blocked from fetching the page, every other category's
 * score is a measurement of something no engine will ever see. The gate is
 * applied after renormalization so `skippedCategories` still reports
 * honestly about what was measured — a hard-gated page's category scores
 * remain inspectable, only the aggregate collapses.
 *
 * Throws on a present-but-out-of-range score (a bug in the calling check
 * module) and on zero applicable categories (nothing to renormalize over is
 * never a valid result for a real page).
 */
export function computeOverallScore(
    scores: CategoryScores,
    options: { hardGate?: boolean; dimensions?: AuditCategoryWeight[] } = {}
): OverallScoreResult {
    const dimensions = options.dimensions ?? CATEGORY_WEIGHTS
    const hardGated = options.hardGate === true

    let weightedTotal = 0
    let weightSum = 0
    const skippedCategories: AuditCategoryKey[] = []

    for (const dimension of dimensions) {
        const score = scores[dimension.key]

        if (score === undefined) {
            skippedCategories.push(dimension.key)
            continue
        }
        if (!Number.isFinite(score) || score < 0 || score > 100) {
            throw new Error(`Score for category "${dimension.key}" must be between 0 and 100, got ${score}`)
        }

        weightedTotal += score * dimension.weight
        weightSum += dimension.weight
    }

    if (weightSum === 0) {
        throw new Error(
            'No applicable categories: every category was skipped, so there is nothing to renormalize over. ' +
                'This is a bug in the calling check modules, not a valid result for any real page.'
        )
    }

    return {
        score: hardGated ? 0 : Math.round(weightedTotal / weightSum),
        skippedCategories,
        hardGated,
    }
}
