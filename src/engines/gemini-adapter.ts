// ============================================================
// Google Gemini engine adapter (v0.7.0, BYOK; retrieval since v0.10.0)
// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...
// ============================================================

import type { EngineAdapter, EngineResponse, QueryOptions } from '../types'
import {
    assertOk,
    buildEngineResponse,
    EngineResponseError,
    notActivatedEvidence,
    proseExtractedEvidence,
    retrievedEvidence,
    timedQuery,
    wantsWebSearch,
} from './shared'

const DEFAULT_MODEL = 'gemini-2.0-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiGroundingMetadata {
    groundingChunks?: Array<{ web?: { uri?: string } }>
    webSearchQueries?: string[]
}

interface GeminiGenerateContentResponse {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
        groundingMetadata?: GeminiGroundingMetadata
    }>
}

export class GeminiAdapter implements EngineAdapter {
    name = 'Gemini'
    slug = 'gemini' as const

    constructor(private readonly apiKey: string, private readonly defaults: QueryOptions = {}) {}

    async query(prompt: string, options: QueryOptions = {}): Promise<EngineResponse> {
        const model = options.model ?? this.defaults.model ?? DEFAULT_MODEL
        const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`
        const webSearch = wantsWebSearch(options, this.defaults)

        const { result: body, timestamp, latencyMs } = await timedQuery(async () => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    ...(webSearch ? { tools: [{ google_search: {} }] } : {}),
                    generationConfig: {
                        temperature: options.temperature ?? this.defaults.temperature ?? 0.7,
                        maxOutputTokens: options.maxTokens ?? this.defaults.maxTokens ?? 1024,
                    },
                }),
            })
            await assertOk(res, this.name)
            return (await res.json()) as GeminiGenerateContentResponse
        })

        const candidate = body.candidates?.[0]
        if (!candidate?.content?.parts) {
            throw new EngineResponseError(this.name, 'missing candidates[0].content.parts')
        }
        const content = candidate.content.parts.map((p) => p.text ?? '').join('')

        return buildEngineResponse({
            engine: this.name,
            model,
            prompt,
            response: content,
            evidence: webSearch ? this.readGrounding(candidate.groundingMetadata) : proseExtractedEvidence(content),
            timestamp,
            latencyMs,
        })
    }

    /**
     * `groundingMetadata` is the activation signal: Gemini attaches it only
     * when the search tool actually ran. `webSearchQueries` without
     * `groundingChunks` is a real state — it searched and grounded nothing —
     * so both are checked before concluding no search happened.
     *
     * Note the URIs are `vertexaisearch.cloud.google.com` redirect links, not
     * publisher URLs. They identify a retrieved source but will not
     * hostname-match a brand domain without being resolved first; see
     * docs/measurement.md.
     */
    private readGrounding(metadata: GeminiGroundingMetadata | undefined) {
        const chunks = metadata?.groundingChunks ?? []
        const queries = metadata?.webSearchQueries ?? []
        if (chunks.length === 0 && queries.length === 0) return notActivatedEvidence()

        const sources = chunks.map((c) => c.web?.uri).filter((uri): uri is string => Boolean(uri))
        return retrievedEvidence({ sources })
    }
}
