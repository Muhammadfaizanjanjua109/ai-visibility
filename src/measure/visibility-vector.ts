// ============================================================
// Visibility vector: measurement-level observations and the denominator
// decomposition of Pr(cited). Zero dependencies — pure arithmetic over
// per-run observations.
//
// This is the half of GEO measurement that a page's HTML cannot tell you.
// Whether an engine searched, what it retrieved, and whether it cited you
// are properties of one engine's behaviour for one query at one moment, not
// properties of your markup. Keeping them in a separate file with its own
// schemaVersion is the whole point: a page-level score that silently
// absorbed them would misrepresent what it measured.
// ============================================================

import type {
    EngineObservability,
    Observed,
    SearchActivation,
    VisibilityDecomposition,
    VisibilityDenominators,
    VisibilityVectorObservation,
} from '../types'

/** Convenience constructors, so callers never reach for `undefined` to mean "no value". */
export const observed = <T>(value: T): Observed<T> => ({ value, status: 'observed' })
export const notObservable = <T>(): Observed<T> => ({ value: null, status: 'not-observable' })
export const notEvaluated = <T>(): Observed<T> => ({ value: null, status: 'not-evaluated' })

/**
 * What each shipped adapter can actually report, as of the current
 * `src/engines/*` implementations. Published in visibility-vector.json so a
 * consumer reading `pActivated` can tell a real zero from a sample where
 * nothing was observable in the first place.
 *
 * Only Perplexity and Gemini expose retrieval at all. The OpenAI adapter
 * sends no `tools` parameter, so no web search is requested and none can be
 * detected; the Anthropic adapter has no search tool either. Both fall back
 * to regex-scraping URLs out of the prose, which cannot distinguish a real
 * citation from a URL the model recited from memory — hence `citations:
 * true` but `retrievedSources: false` for those two.
 */
export const ENGINE_OBSERVABILITY: EngineObservability[] = [
    { engine: 'Perplexity', searchActivation: true, retrievedSources: true, contextPosition: false, citations: true },
    { engine: 'Gemini', searchActivation: true, retrievedSources: true, contextPosition: false, citations: true },
    { engine: 'OpenAI', searchActivation: false, retrievedSources: false, contextPosition: false, citations: true },
    { engine: 'Anthropic', searchActivation: false, retrievedSources: false, contextPosition: false, citations: true },
]

export function getEngineObservability(engine: string): EngineObservability | undefined {
    return ENGINE_OBSERVABILITY.find((e) => e.engine === engine)
}

/**
 * Whether an observation counts toward `runsActivated`.
 *
 * `unknown` is deliberately NOT activated. Counting unobservable activation
 * as activated would inflate Pr(activated) toward 1 for exactly the engines
 * that tell us least; counting it as not-activated would deflate it the
 * same way. It is neither — it is tracked separately in
 * `runsActivationUnknown` so a sample dominated by unobservable engines is
 * visible as such rather than silently resolving one way.
 */
function isActivated(activation: SearchActivation): boolean {
    return activation === 'activated'
}

/**
 * Counts the four nested populations of the citation chain.
 *
 * Every attempted run is counted, including `engine-error` and
 * `empty-response` outcomes. Those are outcomes, not absences: a run that
 * errored still consumed an opportunity to be cited, and dropping it makes
 * every downstream rate a measurement of the subset that happened to
 * succeed. One reviewed configuration found 57.8% of ChatGPT repetitions
 * never activated web search at all — filtering those would have reported a
 * citation rate more than twice its true value.
 */
export function countDenominators(observations: VisibilityVectorObservation[]): VisibilityDenominators {
    let runsActivated = 0
    let runsRetrieved = 0
    let runsCited = 0
    let runsActivationUnknown = 0

    for (const obs of observations) {
        if (obs.searchActivation === 'unknown') runsActivationUnknown++
        if (!isActivated(obs.searchActivation)) continue

        runsActivated++

        // Nesting is enforced structurally, not assumed: a run only counts
        // as retrieved if it activated, and only as cited if it retrieved.
        // Without this, an engine that reports citations without exposing
        // retrieval (OpenAI/Anthropic prose-scraped URLs) would produce
        // runsCited > runsRetrieved and a conditional probability above 1.
        const retrievedCount = obs.retrievedSourceCount.value
        if (retrievedCount === null || retrievedCount <= 0) continue

        runsRetrieved++

        if (obs.brandCited) runsCited++
    }

    return {
        runsAttempted: observations.length,
        runsActivated,
        runsRetrieved,
        runsCited,
        runsActivationUnknown,
    }
}

/** `null` rather than 0 when the denominator is empty — an undefined ratio is not a zero one. */
function ratio(numerator: number, denominator: number): number | null {
    return denominator === 0 ? null : numerator / denominator
}

/**
 * Decomposes Pr(cited) into its three independently interpretable factors:
 *
 *   Pr(cited) = Pr(activated) x Pr(retrieved | activated) x Pr(cited | retrieved)
 *
 * Never pre-multiplied into a single citation rate. A low unconditional
 * rate caused by an engine that rarely searches calls for a completely
 * different response than one caused by content that never gets cited once
 * retrieved, and a scalar cannot tell those apart — which is precisely what
 * `BrandVisibility.citationRate` has been unable to do.
 *
 * Edge case that matters most: with zero activated runs, both conditionals
 * are `null` (undefined, not zero) while `pActivated` is a real 0 and
 * `pCited` is a real 0. Reporting the conditionals as 0 there would assert
 * that content failed to get retrieved when it was never given the chance.
 */
export function decomposeVisibility(observations: VisibilityVectorObservation[]): VisibilityDecomposition {
    const denominators = countDenominators(observations)
    const { runsAttempted, runsActivated, runsRetrieved, runsCited } = denominators

    return {
        denominators,
        pActivated: ratio(runsActivated, runsAttempted),
        pRetrievedGivenActivated: ratio(runsRetrieved, runsActivated),
        pCitedGivenRetrieved: ratio(runsCited, runsRetrieved),
        pCited: ratio(runsCited, runsAttempted),
    }
}

/**
 * Recomposes the chain from its factors, for verifying the identity holds.
 *
 * Returns `null` whenever any factor is `null` — an undefined factor makes
 * the product undefined, and the correct answer is "we cannot say", not a
 * silently-substituted zero. Note that `pCited` from `decomposeVisibility`
 * is computed directly rather than as this product; the two agreeing is a
 * property worth asserting in tests, not an implementation detail to rely
 * on.
 */
export function recomposeCitationRate(decomposition: VisibilityDecomposition): number | null {
    const { pActivated, pRetrievedGivenActivated, pCitedGivenRetrieved } = decomposition
    if (pActivated === null || pRetrievedGivenActivated === null || pCitedGivenRetrieved === null) return null
    return pActivated * pRetrievedGivenActivated * pCitedGivenRetrieved
}
