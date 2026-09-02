// ============================================================
// Tests: page-level scoring schema (src/analyzer/scoring-schema.ts)
// Version guard, weight invariants, renormalization, hard gate.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
    SUPPORTED_SCORING_SCHEMA_VERSION,
    SUPPORTED_VISIBILITY_VECTOR_SCHEMA_VERSION,
    assertSupportedSchemaVersion,
    assertSupportedVisibilityVectorSchemaVersion,
    assertValidWeights,
    computeOverallScore,
    getCategoryWeights,
    loadScoringWeights,
} from '../src/analyzer/scoring-schema'
import { CATEGORY_WEIGHTS } from '../src/analyzer/scoring-weights'
import type { AuditCategoryKey, AuditCategoryWeight, CategoryScores } from '../src/types'

const ALL_KEYS = CATEGORY_WEIGHTS.map((c) => c.key)

/** Every category present and maxed — the baseline the renormalization tests perturb. */
function allScores(value: number): CategoryScores {
    return Object.fromEntries(ALL_KEYS.map((k) => [k, value])) as CategoryScores
}

describe('assertSupportedSchemaVersion — v2/v3 guard', () => {
    it('accepts exactly the version this build understands', () => {
        expect(() => assertSupportedSchemaVersion(3)).not.toThrow()
        expect(SUPPORTED_SCORING_SCHEMA_VERSION).toBe(3)
    })

    it('rejects a v2 weights file loaded as v3, naming both versions', () => {
        expect(() => assertSupportedSchemaVersion(2)).toThrow(/schemaVersion 2/)
        expect(() => assertSupportedSchemaVersion(2)).toThrow(/schemaVersion 3/)
    })

    it('rejects a v3 weights file loaded by a v2-pinned consumer, naming both versions', () => {
        expect(() => assertSupportedSchemaVersion(3, 2)).toThrow(/schemaVersion 3/)
        expect(() => assertSupportedSchemaVersion(3, 2)).toThrow(/schemaVersion 2/)
    })

    it('describes what changed at each version, so the error is actionable without the changelog', () => {
        let message = ''
        try {
            assertSupportedSchemaVersion(2)
        } catch (err) {
            message = (err as Error).message
        }
        expect(message).toMatch(/six AI Readiness categories/)
        expect(message).toMatch(/answerPlacement/)
    })

    it('rejects v1 too, rather than only guarding the adjacent version', () => {
        expect(() => assertSupportedSchemaVersion(1)).toThrow(/schemaVersion 1/)
    })

    it('labels an entirely unknown version rather than pretending to describe it', () => {
        expect(() => assertSupportedSchemaVersion(99)).toThrow(/unknown to this build/)
    })

    it('versions the measurement schema independently of the scoring schema', () => {
        // A matching scoring version must not imply a matching vector version.
        expect(() => assertSupportedVisibilityVectorSchemaVersion(1)).not.toThrow()
        expect(() => assertSupportedVisibilityVectorSchemaVersion(3)).toThrow(/visibility-vector\.json/)
        expect(SUPPORTED_VISIBILITY_VECTOR_SCHEMA_VERSION).toBe(1)
    })

    it('does not confuse the two schemas in its error text', () => {
        expect(() => assertSupportedSchemaVersion(2)).toThrow(/scoring-weights\.json/)
        expect(() => assertSupportedVisibilityVectorSchemaVersion(2)).toThrow(/versions independently/)
    })
})

describe('loadScoringWeights', () => {
    const validFile = {
        schemaVersion: 3,
        packageVersion: '0.9.0',
        generatedAt: '2026-09-01T00:00:00.000Z',
        source: 's',
        docs: 'd',
        scope: { level: 'page' as const, computableFrom: [], excludes: '' },
        dimensions: CATEGORY_WEIGHTS,
        legacy_dimensions: [],
    }

    it('returns the file when version and weights are valid', () => {
        expect(loadScoringWeights(validFile).schemaVersion).toBe(3)
    })

    it('rejects a v2 file before it ever reads the dimensions', () => {
        expect(() => loadScoringWeights({ ...validFile, schemaVersion: 2 })).toThrow(/schemaVersion 2/)
    })

    it('rejects a hand-edited vendored copy whose weights no longer sum to 1.0', () => {
        const tampered = CATEGORY_WEIGHTS.map((d, i) => (i === 0 ? { ...d, weight: 0.5 } : d))
        expect(() => loadScoringWeights({ ...validFile, dimensions: tampered })).toThrow(/must sum to 1\.0/)
    })

    it('rejects non-object input rather than throwing on property access', () => {
        expect(() => loadScoringWeights(null)).toThrow(/did not parse to an object/)
    })
})

describe('CATEGORY_WEIGHTS (v3) invariants', () => {
    it('sums to 1.0', () => {
        const total = CATEGORY_WEIGHTS.reduce((sum, c) => sum + c.weight, 0)
        expect(total).toBeCloseTo(1.0, 10)
    })

    it('has no negative weights — a penalty is a rewrite property, not a scoring dimension', () => {
        for (const dimension of CATEGORY_WEIGHTS) {
            expect(dimension.weight).toBeGreaterThan(0)
        }
    })

    it('is seven page-level categories, including answerPlacement', () => {
        expect(CATEGORY_WEIGHTS).toHaveLength(7)
        expect(ALL_KEYS).toContain('answerPlacement')
    })

    it('gives every dimension an evidenceGrade and a substantive rationale', () => {
        for (const dimension of CATEGORY_WEIGHTS) {
            expect(['strong', 'moderate', 'weak']).toContain(dimension.evidenceGrade)
            expect(dimension.rationale.length).toBeGreaterThan(40)
        }
    })

    it('cites findings descriptively — no paper identifiers in a vendored file', () => {
        for (const dimension of CATEGORY_WEIGHTS) {
            expect(dimension.rationale).not.toMatch(/arxiv|doi:|\b10\.\d{4}\//i)
        }
    })

    it('weights extractable evidence above structural formatting', () => {
        const weights = getCategoryWeights()
        expect(weights.citationReadiness).toBeGreaterThan(weights.structure)
    })

    it('raises extractable evidence and halves structural formatting relative to v2', () => {
        const weights = getCategoryWeights()
        expect(weights.citationReadiness).toBeGreaterThan(0.15) // v2 citationReadiness
        expect(weights.structure).toBeLessThan(0.2) // v2 structure
    })

    it('does not fold answer placement into formatting — it outweighs it on its own', () => {
        const weights = getCategoryWeights()
        expect(weights.answerPlacement).toBeGreaterThan(weights.structure)
    })

    it('reserves the strong grade for the one dimension that is definitional', () => {
        const strong = CATEGORY_WEIGHTS.filter((c) => c.evidenceGrade === 'strong')
        expect(strong.map((c) => c.key)).toEqual(['crawlability'])
    })
})

describe('assertValidWeights', () => {
    const base: AuditCategoryWeight = {
        key: 'structure',
        label: 'l',
        weight: 1,
        description: 'd',
        evidenceGrade: 'weak',
        rationale: 'r',
    }

    it('rejects an empty dimension set', () => {
        expect(() => assertValidWeights([], 'test')).toThrow(/empty or missing/)
    })

    it('rejects a negative weight, explaining why none is permitted', () => {
        const dimensions = [{ ...base, weight: 1.2 }, { ...base, key: 'content' as AuditCategoryKey, weight: -0.2 }]
        expect(() => assertValidWeights(dimensions, 'test')).toThrow(/negative weight/)
        expect(() => assertValidWeights(dimensions, 'test')).toThrow(/rewrite operation/)
    })
})

describe('computeOverallScore — renormalization', () => {
    it('returns 100 when every category is maxed', () => {
        expect(computeOverallScore(allScores(100)).score).toBe(100)
    })

    it('returns 0 when every category is zeroed', () => {
        expect(computeOverallScore(allScores(0)).score).toBe(0)
    })

    it('applies the v3 weights, not an equal-weighted average', () => {
        // Only citationReadiness (0.22) and structure (0.10) present.
        const result = computeOverallScore({ citationReadiness: 100, structure: 0 })
        // 100*0.22 / (0.22 + 0.10) = 68.75 -> 69. An equal average would be 50.
        expect(result.score).toBe(69)
    })

    it('skips an absent category instead of throwing, and reports it as skipped', () => {
        const scores = allScores(100)
        delete scores.authority
        const result = computeOverallScore(scores)
        expect(result.skippedCategories).toEqual(['authority'])
    })

    it('renormalizes over the remaining categories rather than treating a skip as a zero', () => {
        const scores = allScores(100)
        delete scores.authority
        // Absent-as-zero would give 93; renormalized gives 100.
        expect(computeOverallScore(scores).score).toBe(100)
    })

    it('supports multiple skipped categories at once', () => {
        const result = computeOverallScore({ crawlability: 80, answerPlacement: 40 })
        // (80*0.18 + 40*0.18) / 0.36 = 60
        expect(result.score).toBe(60)
        expect(result.skippedCategories).toHaveLength(5)
    })

    it('renormalizes correctly after the reweight — the denominator is the present weights, not 1.0', () => {
        // A single present category always scores exactly itself, whatever
        // its weight. This is the property the reweight could silently break.
        for (const dimension of CATEGORY_WEIGHTS) {
            const result = computeOverallScore({ [dimension.key]: 73 } as CategoryScores)
            expect(result.score).toBe(73)
            expect(result.skippedCategories).toHaveLength(6)
        }
    })

    it('throws when every category is skipped — nothing to renormalize over', () => {
        expect(() => computeOverallScore({})).toThrow(/every category was skipped/)
    })

    it('throws on a present-but-out-of-range score', () => {
        expect(() => computeOverallScore({ structure: 101 })).toThrow(/between 0 and 100/)
        expect(() => computeOverallScore({ structure: -1 })).toThrow(/between 0 and 100/)
        expect(() => computeOverallScore({ structure: NaN })).toThrow(/between 0 and 100/)
    })

    it('rounds to the nearest whole number', () => {
        expect(Number.isInteger(computeOverallScore({ crawlability: 77, content: 42 }).score)).toBe(true)
    })
})

describe('computeOverallScore — hard gate', () => {
    it('zeroes the score when crawlers are blocked, whatever the category scores', () => {
        const result = computeOverallScore(allScores(100), { hardGate: true })
        expect(result.score).toBe(0)
        expect(result.hardGated).toBe(true)
    })

    it('leaves the score untouched when not gated', () => {
        expect(computeOverallScore(allScores(100), { hardGate: false }).hardGated).toBe(false)
        expect(computeOverallScore(allScores(100), { hardGate: false }).score).toBe(100)
    })

    it('still reports skippedCategories honestly when gated — only the aggregate collapses', () => {
        const result = computeOverallScore({ crawlability: 0, structure: 90 }, { hardGate: true })
        expect(result.score).toBe(0)
        expect(result.skippedCategories).toHaveLength(5)
    })

    it('still throws on zero applicable categories even when gated — the gate is not a way to skip validation', () => {
        expect(() => computeOverallScore({}, { hardGate: true })).toThrow(/every category was skipped/)
    })
})
