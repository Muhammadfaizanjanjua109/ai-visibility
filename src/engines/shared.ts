// ============================================================
// Shared helpers for AI engine adapters (v0.7.0, BYOK)
// Zero dependencies — native fetch only.
// ============================================================

import type { EngineResponse } from '../types'

/** Matches http(s) URLs embedded in free-text model output. */
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g

/** Extracts and de-duplicates URLs found in free-text, trimming common trailing punctuation. */
export function extractUrls(text: string): string[] {
    const matches = text.match(URL_RE) ?? []
    const cleaned = matches.map((url) => url.replace(/[.,;:!?]+$/, ''))
    return [...new Set(cleaned)]
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
    citations: string[]
    timestamp: number
    latencyMs: number
}): EngineResponse {
    return {
        engine: params.engine,
        model: params.model,
        prompt: params.prompt,
        response: params.response,
        citations: params.citations,
        // No brand list is available at this layer — see the EngineResponse
        // doc comment in ../types.ts. MeasurementEngine does real detection.
        brands: [],
        timestamp: params.timestamp,
        latencyMs: params.latencyMs,
    }
}
