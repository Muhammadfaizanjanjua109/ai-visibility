// ============================================================
// Tests: Measurement Engine (v0.7.0)
// Uses a stub EngineAdapter with a scripted response queue — no network
// calls, and `delayMs: 0` so the sequential-per-engine rate limiting
// doesn't slow the test suite down.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { MeasurementEngine } from '../src/measure/measurement-engine'
import type { EngineAdapter, EngineResponse } from '../src/types'

class StubAdapter implements EngineAdapter {
    slug = 'openai' as const
    private callIndex = 0

    constructor(public name: string, private readonly scripted: Array<string | Error>) {}

    async query(prompt: string): Promise<EngineResponse> {
        const next = this.scripted[this.callIndex % this.scripted.length]
        this.callIndex++
        if (next instanceof Error) throw next
        return {
            engine: this.name,
            model: 'stub-model',
            prompt,
            response: next,
            citations: [],
            brands: [],
            timestamp: Date.now(),
            latencyMs: 0,
        }
    }
}

describe('MeasurementEngine.measure', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('aggregates mentionRate/recommendRate/variance/confidence and counts failed runs', async () => {
        const adapter = new StubAdapter('StubEngine', [
            'Acme is decent.',
            'I would recommend HubSpot for most teams.',
            new Error('network timeout'),
            'Acme is great, I would recommend Acme.',
        ])
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const engine = new MeasurementEngine(0)
        const report = await engine.measure({
            brand: 'Acme',
            prompts: ['best CRM'],
            engines: [adapter],
            runs: 4,
            competitors: ['HubSpot'],
        })

        // 1 failed call, logged and excluded from stats — not fabricated as a RunResult.
        expect(report.stats.failedRuns).toBe(1)
        expect(errorSpy).toHaveBeenCalledTimes(1)
        expect(report.stats.totalQueries).toBe(1)
        expect(report.stats.totalRuns).toBe(4)
        expect(report.stats.enginesUsed).toEqual(['StubEngine'])

        // Acme mentioned in run 1 and run 4 of 3 successful runs -> 2/3
        expect(report.summary.sampleSize).toBe(3)
        expect(report.summary.mentionRate).toBeCloseTo(2 / 3, 5)
        // variance of [1,0,1] (population): mean 2/3, variance 2/9
        expect(report.summary.variance).toBeCloseTo(2 / 9, 5)
        expect(report.summary.confidence).toBeCloseTo(1.96 * Math.sqrt(2 / 9 / 3), 5)
        // recommended only in run 4 ("I would recommend Acme") -> 1/3
        expect(report.summary.recommendRate).toBeCloseTo(1 / 3, 5)

        // HubSpot mentioned+recommended only in run 2 -> 1/3
        const hubspot = report.competitors['HubSpot']
        expect(hubspot).toBeDefined()
        expect(hubspot!.mentionRate).toBeCloseTo(1 / 3, 5)
        expect(hubspot!.recommendRate).toBeCloseTo(1 / 3, 5)

        // Single engine, single prompt -> perEngine mirrors summary's rates
        expect(report.perEngine['StubEngine']!.mentionRate).toBeCloseTo(2 / 3, 5)

        // The failed run never becomes a RunResult — only 3 (not 4) runs recorded.
        expect(report.perPrompt).toHaveLength(1)
        expect(report.perPrompt[0]!.runs).toHaveLength(3)
        expect(report.perPrompt[0]!.cluster).toBe('custom')
        expect(report.perPrompt[0]!.aggregated.mentionRate).toBeCloseTo(2 / 3, 5)
    })

    it('labels perPrompt.cluster from the optional promptClusters map', async () => {
        const adapter = new StubAdapter('StubEngine', ['Acme is fine.'])
        const engine = new MeasurementEngine(0)
        const report = await engine.measure(
            { brand: 'Acme', prompts: ['best CRM'], engines: [adapter], runs: 1 },
            { 'best CRM': 'discovery' }
        )
        expect(report.perPrompt[0]!.cluster).toBe('discovery')
    })

    it('clamps runs to the documented 1-10 range', async () => {
        const adapter = new StubAdapter('StubEngine', ['Acme is fine.'])
        const engine = new MeasurementEngine(0)
        const report = await engine.measure({ brand: 'Acme', prompts: ['p'], engines: [adapter], runs: 50 })
        expect(report.stats.totalRuns).toBe(10)
    })

    it('produces zeroed BrandVisibility (not NaN) when every call fails', async () => {
        const adapter = new StubAdapter('StubEngine', [new Error('down')])
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const engine = new MeasurementEngine(0)
        const report = await engine.measure({ brand: 'Acme', prompts: ['p'], engines: [adapter], runs: 2 })

        expect(report.stats.failedRuns).toBe(2)
        expect(report.summary.sampleSize).toBe(0)
        expect(report.summary.mentionRate).toBe(0)
        expect(report.summary.variance).toBe(0)
        expect(report.summary.confidence).toBe(0)
        expect(report.perPrompt[0]!.runs).toHaveLength(0)
    })
})
