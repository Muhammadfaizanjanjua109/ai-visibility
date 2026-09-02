// ============================================================
// Tests: measurement-level visibility vector
// (src/measure/visibility-vector.ts) — denominator decomposition.
// ============================================================

import { describe, it, expect } from 'vitest'
import {
    ENGINE_OBSERVABILITY,
    countDenominators,
    decomposeVisibility,
    getEngineObservability,
    notEvaluated,
    notObservable,
    observed,
    recomposeCitationRate,
} from '../src/measure/visibility-vector'
import type { RunOutcome, SearchActivation, VisibilityVectorObservation } from '../src/types'

interface RunSpec {
    activation?: SearchActivation
    retrieved?: number | null
    cited?: boolean
    outcome?: RunOutcome
}

/** Builds one observation. Defaults describe a fully-successful, cited run. */
function run(spec: RunSpec = {}): VisibilityVectorObservation {
    const retrieved = spec.retrieved === undefined ? 3 : spec.retrieved
    return {
        prompt: 'best crm for hardware teams',
        promptCluster: 'recommendation',
        engine: 'Perplexity',
        model: 'sonar',
        run: 1,
        observedAt: 1_756_000_000_000,
        outcome: spec.outcome ?? 'observed',
        searchActivation: spec.activation ?? 'activated',
        retrievedSourceCount: retrieved === null ? notObservable<number>() : observed(retrieved),
        brandRetrieved: retrieved === null ? notObservable<boolean>() : observed(true),
        contextPosition: notObservable<number>(),
        brandCited: spec.cited ?? true,
        citedUrls: spec.cited === false ? [] : ['https://acme.example/pricing'],
        brandCitedUrlCount: spec.cited === false ? 0 : 1,
        mentioned: true,
        recommended: false,
        mentionRank: observed(1),
        claimsChecked: notEvaluated<number>(),
        claimsAccurate: notEvaluated<number>(),
    }
}

describe('null representation', () => {
    it('gives every absent value an explicit status rather than undefined', () => {
        expect(notObservable<number>()).toEqual({ value: null, status: 'not-observable' })
        expect(notEvaluated<number>()).toEqual({ value: null, status: 'not-evaluated' })
        expect(observed(0)).toEqual({ value: 0, status: 'observed' })
    })

    it('distinguishes an observed zero from an absent measurement', () => {
        expect(observed(0).value).toBe(0)
        expect(observed(0).status).toBe('observed')
        expect(notObservable<number>().value).toBeNull()
    })
})

describe('engine observability', () => {
    it('records that every shipped adapter can now report search activation', () => {
        for (const engine of ['OpenAI', 'Anthropic', 'Perplexity', 'Gemini']) {
            expect(getEngineObservability(engine)?.searchActivation).toBe(true)
        }
    })

    it('still records the one engine that cannot enumerate what it retrieved', () => {
        // OpenAI proves a search ran via a web_search_call item but never
        // lists the pages behind it. Claiming otherwise would put fabricated
        // counts into the retrieval denominator.
        expect(getEngineObservability('OpenAI')?.retrievedSources).toBe(false)
        for (const engine of ['Anthropic', 'Perplexity', 'Gemini']) {
            expect(getEngineObservability(engine)?.retrievedSources).toBe(true)
        }
    })

    it('marks activation as conditional on web search for every engine that has a switch', () => {
        // Perplexity always retrieves and has no off switch; the other three
        // report nothing about activation unless the tool was sent.
        expect(getEngineObservability('Perplexity')?.requiresWebSearch).toBe(false)
        for (const engine of ['OpenAI', 'Anthropic', 'Gemini']) {
            expect(getEngineObservability(engine)?.requiresWebSearch).toBe(true)
        }
    })

    it('names the response field behind every claim it makes', () => {
        // The table is what a consumer uses to decide whether a low
        // pActivated is a finding or an artifact — an unexplained row makes
        // that call impossible.
        for (const row of ENGINE_OBSERVABILITY) {
            expect(row.mechanism.length).toBeGreaterThan(20)
        }
    })

    it('covers every shipped adapter', () => {
        expect(ENGINE_OBSERVABILITY.map((e) => e.engine).sort()).toEqual(['Anthropic', 'Gemini', 'OpenAI', 'Perplexity'])
    })
})

describe('countDenominators — opaque retrieval', () => {
    it('counts an activated run with unenumerated sources separately, not as a retrieval failure', () => {
        // The OpenAI shape: a search demonstrably ran, but the API never says
        // what it read. Treating that as "retrieved 0 sources" would report a
        // retrieval failure that was really a measurement gap.
        const d = countDenominators([run({ activation: 'activated', retrieved: null })])
        expect(d.runsActivated).toBe(1)
        expect(d.runsRetrieved).toBe(0)
        expect(d.runsRetrievalUnknown).toBe(1)
        expect(d.runsActivationUnknown).toBe(0)
    })

    it('keeps opaque runs inside runsActivated so pActivated stays honest', () => {
        const d = countDenominators([run({ activation: 'activated', retrieved: null }), run()])
        expect(d.runsAttempted).toBe(2)
        expect(d.runsActivated).toBe(2)
        // The engine searched both times — that factor is fully observed.
        expect(decomposeVisibility([run({ activation: 'activated', retrieved: null }), run()]).pActivated).toBe(1)
    })

    it('distinguishes an opaque retrieval from an observed zero-source retrieval', () => {
        // Same runsRetrieved, opposite meanings: one engine says "I read
        // nothing", the other says nothing at all.
        const opaque = countDenominators([run({ retrieved: null })])
        const emptyButObserved = countDenominators([run({ retrieved: 0 })])
        expect(opaque.runsRetrieved).toBe(emptyButObserved.runsRetrieved)
        expect(opaque.runsRetrievalUnknown).toBe(1)
        expect(emptyButObserved.runsRetrievalUnknown).toBe(0)
    })

    it('never lets an unobservable retrieval reach runsCited', () => {
        // Nesting is the guard: without it a prose-scraped URL on an engine
        // that exposes no retrieval would produce runsCited > runsRetrieved.
        const d = countDenominators([run({ activation: 'activated', retrieved: null, cited: true })])
        expect(d.runsCited).toBe(0)
        expect(d.runsCited).toBeLessThanOrEqual(d.runsRetrieved)
    })
})

describe('countDenominators — retention', () => {
    it('keeps engine-error runs in runsAttempted', () => {
        const observations = [run(), run({ outcome: 'engine-error', activation: 'unknown', retrieved: null })]
        expect(countDenominators(observations).runsAttempted).toBe(2)
    })

    it('keeps empty-response runs in runsAttempted', () => {
        const observations = [run(), run({ outcome: 'empty-response', activation: 'activated', retrieved: 0 })]
        expect(countDenominators(observations).runsAttempted).toBe(2)
    })

    it('keeps non-activated runs in runsAttempted rather than filtering them out', () => {
        const observations = [run(), run({ activation: 'not-activated', retrieved: 0, cited: false })]
        const d = countDenominators(observations)
        expect(d.runsAttempted).toBe(2)
        expect(d.runsActivated).toBe(1)
    })

    it('counts unknown activation as neither activated nor not-activated', () => {
        const observations = [run({ activation: 'unknown', retrieved: null, cited: false }), run()]
        const d = countDenominators(observations)
        expect(d.runsActivated).toBe(1)
        expect(d.runsActivationUnknown).toBe(1)
        expect(d.runsAttempted).toBe(2)
    })

    it('enforces the nesting: a cited run that never retrieved cannot inflate runsCited', () => {
        // OpenAI/Anthropic scrape URLs out of prose, so brandCited can be
        // true with no retrieval. Without structural nesting this would give
        // runsCited > runsRetrieved and a probability above 1.
        const observations = [run({ activation: 'unknown', retrieved: null, cited: true })]
        const d = countDenominators(observations)
        expect(d.runsRetrieved).toBe(0)
        expect(d.runsCited).toBe(0)
    })

    it('keeps the populations properly nested on a mixed sample', () => {
        const observations = [
            run(),
            run({ cited: false }),
            run({ retrieved: 0, cited: false }),
            run({ activation: 'not-activated', retrieved: 0, cited: false }),
            run({ activation: 'unknown', retrieved: null, cited: false }),
        ]
        const d = countDenominators(observations)
        expect(d.runsCited).toBeLessThanOrEqual(d.runsRetrieved)
        expect(d.runsRetrieved).toBeLessThanOrEqual(d.runsActivated)
        expect(d.runsActivated).toBeLessThanOrEqual(d.runsAttempted)
    })
})

describe('decomposeVisibility — the three separate quantities', () => {
    it('reports activation, retrieval and citation as separate factors', () => {
        // 4 attempted: 2 activated; of those 2, both retrieved; 1 cited.
        const observations = [
            run(),
            run({ cited: false }),
            run({ activation: 'not-activated', retrieved: 0, cited: false }),
            run({ activation: 'not-activated', retrieved: 0, cited: false }),
        ]
        const d = decomposeVisibility(observations)
        expect(d.pActivated).toBe(0.5)
        expect(d.pRetrievedGivenActivated).toBe(1)
        expect(d.pCitedGivenRetrieved).toBe(0.5)
        expect(d.pCited).toBe(0.25)
    })

    it('satisfies the chain identity whenever every factor is defined', () => {
        const observations = [
            run(),
            run(),
            run({ cited: false }),
            run({ retrieved: 0, cited: false }),
            run({ activation: 'not-activated', retrieved: 0, cited: false }),
        ]
        const d = decomposeVisibility(observations)
        expect(recomposeCitationRate(d)).toBeCloseTo(d.pCited as number, 12)
    })

    it('does not pre-multiply — a low pCited is attributable to a specific factor', () => {
        // Same pCited (0.25), two completely different causes.
        const rarelySearches = decomposeVisibility([
            run(),
            run({ activation: 'not-activated', retrieved: 0, cited: false }),
            run({ activation: 'not-activated', retrieved: 0, cited: false }),
            run({ activation: 'not-activated', retrieved: 0, cited: false }),
        ])
        const neverCited = decomposeVisibility([run(), run({ cited: false }), run({ cited: false }), run({ cited: false })])

        expect(rarelySearches.pCited).toBe(0.25)
        expect(neverCited.pCited).toBe(0.25)
        // Identical scalars, opposite diagnoses.
        expect(rarelySearches.pActivated).toBe(0.25)
        expect(rarelySearches.pCitedGivenRetrieved).toBe(1)
        expect(neverCited.pActivated).toBe(1)
        expect(neverCited.pCitedGivenRetrieved).toBe(0.25)
    })

    it('does not let filtered-out runs inflate the rate', () => {
        // The 57.8%-never-activated scenario: filtering non-activated runs
        // would report pCited = 1.0 instead of the true 0.4.
        const observations = [
            ...Array.from({ length: 4 }, () => run()),
            ...Array.from({ length: 6 }, () => run({ activation: 'not-activated', retrieved: 0, cited: false })),
        ]
        const d = decomposeVisibility(observations)
        expect(d.denominators.runsAttempted).toBe(10)
        expect(d.pCited).toBeCloseTo(0.4, 12)
        expect(d.pCitedGivenRetrieved).toBe(1)
    })
})

describe('decomposeVisibility — zero-activation edge case', () => {
    const noneActivated = [
        run({ activation: 'not-activated', retrieved: 0, cited: false }),
        run({ activation: 'not-activated', retrieved: 0, cited: false }),
        run({ activation: 'not-activated', retrieved: 0, cited: false }),
    ]

    it('reports pActivated as a real zero', () => {
        expect(decomposeVisibility(noneActivated).pActivated).toBe(0)
    })

    it('reports the conditionals as null, not zero — an undefined ratio is not a zero one', () => {
        const d = decomposeVisibility(noneActivated)
        expect(d.pRetrievedGivenActivated).toBeNull()
        expect(d.pCitedGivenRetrieved).toBeNull()
    })

    it('still reports pCited as a real zero, over the full attempted denominator', () => {
        const d = decomposeVisibility(noneActivated)
        expect(d.pCited).toBe(0)
        expect(d.denominators.runsAttempted).toBe(3)
    })

    it('recomposes to null rather than silently substituting zero for an undefined factor', () => {
        expect(recomposeCitationRate(decomposeVisibility(noneActivated))).toBeNull()
    })

    it('reports null conditionals when activation is entirely unobservable, not a fabricated zero', () => {
        const unknowns = Array.from({ length: 3 }, () => run({ activation: 'unknown', retrieved: null, cited: true }))
        const d = decomposeVisibility(unknowns)
        expect(d.pActivated).toBe(0)
        expect(d.pRetrievedGivenActivated).toBeNull()
        expect(d.denominators.runsActivationUnknown).toBe(3)
    })

    it('reports every rate as null on an empty sample rather than 0', () => {
        const d = decomposeVisibility([])
        expect(d.pActivated).toBeNull()
        expect(d.pRetrievedGivenActivated).toBeNull()
        expect(d.pCitedGivenRetrieved).toBeNull()
        expect(d.pCited).toBeNull()
        expect(d.denominators.runsAttempted).toBe(0)
    })

    it('reports pCitedGivenRetrieved as null when activation happened but retrieval did not', () => {
        const d = decomposeVisibility([run({ retrieved: 0, cited: false }), run({ retrieved: 0, cited: false })])
        expect(d.pActivated).toBe(1)
        expect(d.pRetrievedGivenActivated).toBe(0)
        expect(d.pCitedGivenRetrieved).toBeNull()
        expect(d.pCited).toBe(0)
    })
})
