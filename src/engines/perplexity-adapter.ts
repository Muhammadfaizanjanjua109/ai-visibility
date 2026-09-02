// ============================================================
// Perplexity engine adapter (v0.7.0, BYOK; retrieval since v0.10.0)
// POST https://api.perplexity.ai/chat/completions (OpenAI-compatible)
//
// The one engine with no search switch — sonar always retrieves — so
// `QueryOptions.webSearch` is ignored here and activation is read off the
// response rather than inferred from what we asked for.
// ============================================================

import type { EngineAdapter, EngineResponse, QueryOptions } from '../types'
import {
    assertOk,
    buildEngineResponse,
    EngineResponseError,
    proseExtractedEvidence,
    retrievedEvidence,
    timedQuery,
} from './shared'

const DEFAULT_MODEL = 'sonar'
const API_URL = 'https://api.perplexity.ai/chat/completions'

interface PerplexityChatCompletionResponse {
    model?: string
    choices?: Array<{ message?: { content?: string } }>
    /** Current field: structured results with metadata. */
    search_results?: Array<{ url?: string }>
    /** Legacy field: bare URL list. Still returned by older models. */
    citations?: string[]
}

export class PerplexityAdapter implements EngineAdapter {
    name = 'Perplexity'
    slug = 'perplexity' as const

    constructor(private readonly apiKey: string, private readonly defaults: QueryOptions = {}) {}

    async query(prompt: string, options: QueryOptions = {}): Promise<EngineResponse> {
        const model = options.model ?? this.defaults.model ?? DEFAULT_MODEL

        const { result: body, timestamp, latencyMs } = await timedQuery(async () => {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: options.temperature ?? this.defaults.temperature ?? 0.7,
                    max_tokens: options.maxTokens ?? this.defaults.maxTokens ?? 1024,
                }),
            })
            await assertOk(res, this.name)
            return (await res.json()) as PerplexityChatCompletionResponse
        })

        const content = body.choices?.[0]?.message?.content
        if (typeof content !== 'string') {
            throw new EngineResponseError(this.name, 'missing choices[0].message.content')
        }

        return buildEngineResponse({
            engine: this.name,
            model: body.model ?? model,
            prompt,
            response: content,
            evidence: this.readSearchResults(body, content),
            timestamp,
            latencyMs,
        })
    }

    /**
     * Activation is keyed on the *presence* of a retrieval field, not on
     * whether it has entries. `search_results: []` is Perplexity telling us
     * it searched and found nothing — an activated run with zero sources. A
     * response carrying neither field is one we cannot read, and falls back
     * to `unknown` rather than assuming the documented always-searches
     * behaviour held.
     */
    private readSearchResults(body: PerplexityChatCompletionResponse, content: string) {
        if (Array.isArray(body.search_results)) {
            const sources = body.search_results.map((r) => r.url).filter((url): url is string => Boolean(url))
            return retrievedEvidence({ sources })
        }
        if (Array.isArray(body.citations)) {
            return retrievedEvidence({ sources: body.citations })
        }
        return proseExtractedEvidence(content)
    }
}
