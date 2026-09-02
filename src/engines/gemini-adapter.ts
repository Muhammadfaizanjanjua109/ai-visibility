// ============================================================
// Google Gemini engine adapter (v0.7.0, BYOK)
// POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=...
// ============================================================

import type { EngineAdapter, EngineResponse, QueryOptions } from '../types'
import { assertOk, buildEngineResponse, EngineResponseError, extractUrls, timedQuery } from './shared'

const DEFAULT_MODEL = 'gemini-2.0-flash'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

interface GeminiGenerateContentResponse {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
        groundingMetadata?: {
            groundingChunks?: Array<{ web?: { uri?: string } }>
        }
    }>
}

export class GeminiAdapter implements EngineAdapter {
    name = 'Gemini'
    slug = 'gemini' as const

    constructor(private readonly apiKey: string, private readonly defaults: QueryOptions = {}) {}

    async query(prompt: string, options: QueryOptions = {}): Promise<EngineResponse> {
        const model = options.model ?? this.defaults.model ?? DEFAULT_MODEL
        const url = `${API_BASE}/${model}:generateContent?key=${encodeURIComponent(this.apiKey)}`

        const { result: body, timestamp, latencyMs } = await timedQuery(async () => {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
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
        const groundingUrls = (candidate?.groundingMetadata?.groundingChunks ?? [])
            .map((c) => c.web?.uri)
            .filter((uri): uri is string => Boolean(uri))
        const citations = groundingUrls.length > 0 ? [...new Set(groundingUrls)] : extractUrls(content)

        return buildEngineResponse({
            engine: this.name,
            model,
            prompt,
            response: content,
            citations,
            timestamp,
            latencyMs,
        })
    }
}
