// ============================================================
// Test fixture helpers: MeasurementReport builders (v0.8.0 tests)
// `summary`/`competitors` are set directly rather than derived from
// `perPrompt` runs — same independence the existing cli-measure-format.test.ts
// fixture relies on, since citation/gap-reason logic reads from `perPrompt`
// while `summary`/`competitors` only matter to a couple of gap detectors.
// ============================================================

import type { BrandVisibility, MeasurementReport, PromptResult, RunResult } from '../../src/types'

const DEFAULT_VISIBILITY: BrandVisibility = {
    mentionRate: 0,
    recommendRate: 0,
    averagePosition: 0,
    citationRate: 0,
    variance: 0,
    confidence: 0,
    sampleSize: 0,
}

export function makeVisibility(overrides: Partial<BrandVisibility> = {}): BrandVisibility {
    return { ...DEFAULT_VISIBILITY, ...overrides }
}

export function makeRun(overrides: Partial<RunResult> & { engine: string }): RunResult {
    return {
        run: 1,
        mentioned: false,
        recommended: false,
        position: null,
        citedUrls: [],
        competitorsMentioned: [],
        rawResponse: '',
        ...overrides,
    }
}

export function makePromptResult(prompt: string, cluster: string, runs: RunResult[]): PromptResult {
    const mentionIndicator = runs.map((r) => (r.mentioned ? 1 : 0))
    const recommendIndicator = runs.map((r) => (r.recommended ? 1 : 0))
    const mean = (values: number[]) => (values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length)
    return {
        prompt,
        cluster,
        runs,
        aggregated: { mentionRate: mean(mentionIndicator), recommendRate: mean(recommendIndicator), variance: 0 },
    }
}

export function makeMeasurementReport(overrides: Partial<MeasurementReport> & { perPrompt: PromptResult[] }): MeasurementReport {
    const enginesUsed = [...new Set(overrides.perPrompt.flatMap((p) => p.runs.map((r) => r.engine)))]
    const totalRuns = overrides.perPrompt.reduce((sum, p) => sum + p.runs.length, 0)

    return {
        brand: 'Acme CRM',
        timestamp: Date.now(),
        summary: makeVisibility(),
        competitors: {},
        perEngine: {},
        stats: { totalQueries: overrides.perPrompt.length, totalRuns, enginesUsed, durationMs: 1000, failedRuns: 0 },
        ...overrides,
    }
}
