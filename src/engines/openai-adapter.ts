// ============================================================
// OpenAI engine adapter (v0.7.0, BYOK)
// POST https://api.openai.com/v1/chat/completions
// ============================================================

import type { EngineAdapter, EngineResponse, QueryOptions } from '../types'
import { assertOk, buildEngineResponse, EngineResponseError, extractUrls, timedQuery } from './shared'

const DEFAULT_MODEL = 'gpt-4o-mini'
const API_URL = 'https://api.openai.com/v1/chat/completions'

interface OpenAIAnnotation {
    type?: string
    url_citation?: { url?: string }
}

interface OpenAIChatCompletionResponse {
    model?: string
    choices?: Array<{
        message?: {
            content?: string
            annotations?: OpenAIAnnotation[]
        }
    }>
}

export class OpenAIAdapter implements EngineAdapter {
    name = 'OpenAI'
    slug = 'openai' as const

    /** `defaults` are per-call `options` fallbacks — e.g. the `model`/`temperature` set for this engine in `crawlpod.config.js`. */
    constructor(private readonly apiKey: string, private readonly defaults: QueryOptions = {}) {}

    async query(prompt: string, options: QueryOptions = {}): Promise<EngineResponse> {
        const model = options.model ?? this.defaults.model ?? DEFAULT_MODEL

        const { result: text, timestamp, latencyMs } = await timedQuery(async () => {
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
            return (await res.json()) as OpenAIChatCompletionResponse
        })

        const message = text.choices?.[0]?.message
        const content = message?.content
        if (typeof content !== 'string') {
            throw new EngineResponseError(this.name, 'missing choices[0].message.content')
        }
        const annotationUrls = (message?.annotations ?? [])
            .map((a) => a.url_citation?.url)
            .filter((url): url is string => Boolean(url))
        const citations = [...new Set([...annotationUrls, ...extractUrls(content)])]

        return buildEngineResponse({
            engine: this.name,
            model: text.model ?? model,
            prompt,
            response: content,
            citations,
            timestamp,
            latencyMs,
        })
    }
}
