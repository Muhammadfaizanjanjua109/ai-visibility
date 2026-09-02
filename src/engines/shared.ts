// ============================================================
// Shared helpers for AI engine adapters (v0.7.0, BYOK)
// Zero dependencies — native fetch only.
// ============================================================

import type { CitationProvenance, EngineResponse, Observed, SearchActivation } from '../types'

/** Matches http(s) URLs embedded in free-text model output. */
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g

/**
 * Extracts and de-duplicates URLs found in free-text, trimming common
 * trailing punctuation.
 *
 * Retained, but no longer the citation path for any adapter. A URL in prose
 * is not evidence the engine retrieved it — the model may have reproduced it
 * from training data — so callers must route it through
 * `proseExtractedEvidence()`, which marks the result unobservable rather
 * than letting it enter a retrieval denominator.
 */
export function extractUrls(text: string): string[] {
    const matches = text.match(URL_RE) ?? []
    const cleaned = matches.map((url) => url.replace(/[.,;:!?]+$/, ''))
    return [...new Set(cleaned)]
}

/** Default cap on provider-side searches per call, where the provider supports one. */
export const DEFAULT_MAX_SEARCH_USES = 5

/** Whether this call should request live retrieval. Defaults on — see `QueryOptions.webSearch`. */
export function wantsWebSearch(options: { webSearch?: boolean }, defaults: { webSearch?: boolean }): boolean {
    return options.webSearch ?? defaults.webSearch ?? true
}

export function maxSearchUses(options: { maxSearchUses?: number }, defaults: { maxSearchUses?: number }): number {
    return options.maxSearchUses ?? defaults.maxSearchUses ?? DEFAULT_MAX_SEARCH_USES
}

function dedupe(urls: string[]): string[] {
    return [...new Set(urls.filter((u) => typeof u === 'string' && u.length > 0))]
}

/**
 * What an adapter observed about retrieval for one call, kept together so
 * the three fields can never disagree.
 *
 * They are derived on one seam rather than in four adapters because the
 * combinations that matter are subtle — "searched and cited nothing" and
 * "was never asked to search" produce the same empty `citations` array and
 * mean opposite things — and a per-adapter reimplementation is how they
 * would drift apart.
 */
export interface CitationEvidence {
    citations: string[]
    citationProvenance: CitationProvenance
    retrievedSources: Observed<string[]>
    searchActivation: SearchActivation
}

/**
 * The engine searched and told us what it read.
 *
 * `citedUrls` is the subset it actually cited, where the provider
 * distinguishes the two (Anthropic reports retrieved results and per-claim
 * citations separately). Omit it for providers that only publish one list.
 * An explicitly empty `citedUrls` alongside non-empty `sources` is a real
 * and important observation: retrieved, then cited nothing.
 */
export function retrievedEvidence(params: { sources: string[]; citedUrls?: string[] }): CitationEvidence {
    const sources = dedupe(params.sources)
    return {
        citations: params.citedUrls === undefined ? sources : dedupe(params.citedUrls),
        citationProvenance: 'retrieval',
        retrievedSources: { value: sources, status: 'observed' },
        searchActivation: 'activated',
    }
}

/**
 * The engine searched, and proved it, but does not enumerate what it read —
 * the OpenAI Responses API emits a `web_search_call` item without listing
 * the pages behind it.
 *
 * `retrievedSources` is `not-observable`, not `[]`: an empty array asserts
 * the engine read nothing, which is the opposite of what a completed search
 * call tells us. Runs in this state are counted in `runsRetrievalUnknown`.
 */
export function activatedOpaqueEvidence(citedUrls: string[]): CitationEvidence {
    return {
        citations: dedupe(citedUrls),
        citationProvenance: 'retrieval',
        retrievedSources: { value: null, status: 'not-observable' },
        searchActivation: 'activated',
    }
}

/**
 * Retrieval was requested and the engine declined to search — it answered
 * from parametric memory.
 *
 * `citations` is empty by construction. Any URL in the prose of a run that
 * demonstrably did not search was recited, not retrieved, and admitting it
 * here is exactly the failure this whole seam exists to prevent. The text is
 * still on `EngineResponse.response` for callers who want it.
 */
export function notActivatedEvidence(): CitationEvidence {
    return {
        citations: [],
        citationProvenance: 'none',
        retrievedSources: { value: [], status: 'observed' },
        searchActivation: 'not-activated',
    }
}

/**
 * No retrieval was requested, so nothing about retrieval was observed.
 *
 * The URLs are still extracted — they are the only signal available and
 * discarding them would lose information — but the run is marked `unknown`
 * and `prose-extraction`, which keeps it out of every activation and
 * retrieval denominator (`countDenominators` counts it in
 * `runsActivationUnknown` instead). The pre-v0.10.0 behaviour, now labelled
 * as the guess it always was.
 */
export function proseExtractedEvidence(text: string): CitationEvidence {
    return {
        citations: extractUrls(text),
        citationProvenance: 'prose-extraction',
        retrievedSources: { value: null, status: 'not-observable' },
        searchActivation: 'unknown',
    }
}

/** Thrown when an engine's HTTP API responds with a non-ok status. */
export class EngineHttpError extends Error {
    constructor(
        public readonly engine: string,
        public readonly status: number,
        public readonly statusText: string,
        bodyPreview?: string
    ) {
        super(`${engine} API request failed: ${status} ${statusText}${bodyPreview ? ` — ${bodyPreview}` : ''}`)
        this.name = 'EngineHttpError'
    }
}

/** Thrown when an engine's HTTP API responds `ok` but its JSON body doesn't have the shape the adapter expects. */
export class EngineResponseError extends Error {
    constructor(public readonly engine: string, public readonly detail: string) {
        super(`${engine} response ${detail}`)
        this.name = 'EngineResponseError'
    }
}

/** Runs `fn`, timing it, and returns both the result and the timing fields shared by every `EngineResponse`. */
export async function timedQuery<T>(fn: () => Promise<T>): Promise<{ result: T; timestamp: number; latencyMs: number }> {
    const start = Date.now()
    const result = await fn()
    return { result, timestamp: Date.now(), latencyMs: Date.now() - start }
}

/** Throws `EngineHttpError` if `res` is not ok; otherwise a no-op. Reads a short body preview for the error message. */
export async function assertOk(res: Response, engine: string): Promise<void> {
    if (res.ok) return
    let bodyPreview: string | undefined
    try {
        bodyPreview = (await res.text()).slice(0, 200)
    } catch {
        // ignore — body may already be consumed or unreadable
    }
    throw new EngineHttpError(engine, res.status, res.statusText, bodyPreview)
}

export function buildEngineResponse(params: {
    engine: string
    model: string
    prompt: string
    response: string
    evidence: CitationEvidence
    timestamp: number
    latencyMs: number
}): EngineResponse {
    return {
        engine: params.engine,
        model: params.model,
        prompt: params.prompt,
        response: params.response,
        citations: params.evidence.citations,
        // No brand list is available at this layer — see the EngineResponse
        // doc comment in ../types.ts. MeasurementEngine does real detection.
        brands: [],
        timestamp: params.timestamp,
        latencyMs: params.latencyMs,
        searchActivation: params.evidence.searchActivation,
        citationProvenance: params.evidence.citationProvenance,
        retrievedSources: params.evidence.retrievedSources,
    }
}
