// ============================================================
// Tests: Measurement Engine (v0.7.0)
// Uses a stub EngineAdapter with a scripted response queue — no network
// calls, and `delayMs: 0` so the sequential-per-engine rate limiting
// doesn't slow the test suite down.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { MeasurementEngine } from '../src/measure/measurement-engine'
import { decomposeVisibility } from '../src/measure/visibility-vector'
import type { CitationProvenance, EngineAdapter, EngineResponse, QueryOptions, SearchActivation } from '../src/types'

/** One scripted turn: response text, or an Error to throw, or a full retrieval shape. */
type Scripted =
    | string
    | Error
    | {
          text: string
          citations?: string[]
          searchActivation?: SearchActivation
          citationProvenance?: CitationProvenance
          retrievedSources?: string[] | null
      }

class StubAdapter implements EngineAdapter {
    slug = 'openai' as const
    private callIndex = 0
    lastOptions: QueryOptions | undefined

    constructor(public name: string, private readonly scripted: Scripted[]) {}

    async query(prompt: string, options?: QueryOptions): Promise<EngineResponse> {
        this.lastOptions = options
        const next = this.scripted[this.callIndex % this.scripted.length]
        this.callIndex++
        if (next instanceof Error) throw next
        const spec = typeof next === 'string' ? { text: next } : next!
        const sources = spec.retrievedSources
        return {
            engine: this.name,
            model: 'stub-model',
            prompt,
            response: spec.text,
            citations: spec.citations ?? [],
            brands: [],
            timestamp: Date.now(),
            latencyMs: 0,
            searchActivation: spec.searchActivation ?? 'unknown',
            citationProvenance: spec.citationProvenance ?? 'prose-extraction',
            retrievedSources:
                sources === undefined || sources === null ? { value: null, status: 'not-observable' } : { value: sources, status: 'observed' },
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

describe('MeasurementEngine — measurement-level observations', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('keeps failed runs in observations even though they never become RunResults', async () => {
        // This is the whole reason observations exists alongside perPrompt: a
        // rate computed over perPrompt measures only the subset that
        // succeeded, which is how a citation rate ends up twice its true
        // value.
        const adapter = new StubAdapter('StubEngine', ['Acme is fine.', new Error('network timeout')])
        vi.spyOn(console, 'error').mockImplementation(() => {})

        const report = await new MeasurementEngine(0).measure({ brand: 'Acme', prompts: ['p'], engines: [adapter], runs: 4 })

        expect(report.perPrompt[0]!.runs).toHaveLength(2)
        expect(report.observations).toHaveLength(4)
        expect(decomposeVisibility(report.observations).denominators.runsAttempted).toBe(4)
        expect(report.observations.filter((o) => o.outcome === 'engine-error')).toHaveLength(2)
    })

    it('records an empty response as its own outcome, not as an error', async () => {
        const adapter = new StubAdapter('StubEngine', [{ text: '   ' }])
        const report = await new MeasurementEngine(0).measure({ brand: 'Acme', prompts: ['p'], engines: [adapter], runs: 1 })
        expect(report.observations[0]!.outcome).toBe('empty-response')
        expect(report.stats.failedRuns).toBe(0)
    })

    it('never counts a prose-extracted URL as a citation', async () => {
        // The URL is on the brand's own domain and would match the slug
        // heuristic — but the engine was never observed retrieving it, so it
        // is recall, not citation.
        const adapter = new StubAdapter('StubEngine', [
            { text: 'Try Acme.', citations: ['https://acme.example/pricing'], citationProvenance: 'prose-extraction', searchActivation: 'unknown' },
        ])
        const report = await new MeasurementEngine(0).measure({ brand: 'Acme', prompts: ['p'], engines: [adapter], runs: 1 })

        const obs = report.observations[0]!
        expect(obs.citedUrls).toEqual(['https://acme.example/pricing'])
        expect(obs.brandCited).toBe(false)
        expect(obs.brandCitedUrlCount).toBe(0)
        // And it lands in neither activation bucket.
        expect(decomposeVisibility(report.observations).denominators.runsActivationUnknown).toBe(1)
    })

    it('counts the same URL as a citation once its provenance is retrieval', async () => {
        const adapter = new StubAdapter('StubEngine', [
            {
                text: 'Try Acme.',
                citations: ['https://acme.example/pricing'],
                citationProvenance: 'retrieval',
                searchActivation: 'activated',
                retrievedSources: ['https://acme.example/pricing', 'https://other.example/blog'],
            },
        ])
        const report = await new MeasurementEngine(0).measure({ brand: 'Acme', prompts: ['p'], engines: [adapter], runs: 1 })

        const obs = report.observations[0]!
        expect(obs.brandCited).toBe(true)
        expect(obs.brandCitedUrlCount).toBe(1)
        expect(obs.retrievedSourceCount).toEqual({ value: 2, status: 'observed' })
        expect(obs.brandRetrieved).toEqual({ value: true, status: 'observed' })

        const d = decomposeVisibility(report.observations)
        expect(d.pActivated).toBe(1)
        expect(d.pRetrievedGivenActivated).toBe(1)
        expect(d.pCitedGivenRetrieved).toBe(1)
    })

    it('marks an activated run with unenumerated sources as retrieval-unknown, not zero-retrieval', async () => {
        // The OpenAI case end to end.
        const adapter = new StubAdapter('StubEngine', [
            {
                text: 'Try Acme.',
                citations: ['https://acme.example/pricing'],
                citationProvenance: 'retrieval',
                searchActivation: 'activated',
                retrievedSources: null,
            },
        ])
        const report = await new MeasurementEngine(0).measure({ brand: 'Acme', prompts: ['p'], engines: [adapter], runs: 1 })

        expect(report.observations[0]!.retrievedSourceCount.status).toBe('not-observable')
        const d = decomposeVisibility(report.observations).denominators
        expect(d.runsActivated).toBe(1)
        expect(d.runsRetrievalUnknown).toBe(1)
        expect(d.runsRetrieved).toBe(0)
    })

    it('carries provenance onto each RunResult so a rate over citedUrls can be qualified', async () => {
        const adapter = new StubAdapter('StubEngine', [{ text: 'Acme.', searchActivation: 'not-activated', citationProvenance: 'none' }])
        const report = await new MeasurementEngine(0).measure({ brand: 'Acme', prompts: ['p'], engines: [adapter], runs: 1 })
        expect(report.perPrompt[0]!.runs[0]!.searchActivation).toBe('not-activated')
        expect(report.perPrompt[0]!.runs[0]!.citationProvenance).toBe('none')
    })

    it('passes queryOptions through to every adapter call', async () => {
        const adapter = new StubAdapter('StubEngine', ['Acme.'])
        await new MeasurementEngine(0).measure({
            brand: 'Acme',
            prompts: ['p'],
            engines: [adapter],
            runs: 1,
            queryOptions: { webSearch: false, maxSearchUses: 2 },
        })
        expect(adapter.lastOptions).toEqual({ webSearch: false, maxSearchUses: 2 })
    })

    it('labels observations with the prompt cluster so the vector joins back to discovery output', async () => {
        const adapter = new StubAdapter('StubEngine', ['Acme.'])
        const report = await new MeasurementEngine(0).measure(
            { brand: 'Acme', prompts: ['best CRM'], engines: [adapter], runs: 1 },
            { 'best CRM': 'discovery' }
        )
        expect(report.observations[0]!.promptCluster).toBe('discovery')
        expect(report.observations[0]!.engine).toBe('StubEngine')
        expect(report.observations[0]!.run).toBe(1)
    })
})
