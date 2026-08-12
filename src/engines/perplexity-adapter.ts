// ============================================================
// Perplexity engine adapter (v0.7.0, BYOK)
// POST https://api.perplexity.ai/chat/completions (OpenAI-compatible)
// ============================================================

import type { EngineAdapter, EngineResponse, QueryOptions } from '../types'
import { assertOk, buildEngineResponse, extractUrls, timedQuery } from './shared'

const DEFAULT_MODEL = 'sonar'
const API_URL = 'https://api.perplexity.ai/chat/completions'

interface PerplexityChatCompletionResponse {
    model?: string
    choices?: Array<{ message?: { content?: string } }>
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

        const content = body.choices?.[0]?.message?.content ?? ''
        const citations = body.citations && body.citations.length > 0 ? [...new Set(body.citations)] : extractUrls(content)

        return buildEngineResponse({
            engine: this.name,
            model: body.model ?? model,
            prompt,
            response: content,
            citations,
            timestamp,
            latencyMs,
        })
    }
}
