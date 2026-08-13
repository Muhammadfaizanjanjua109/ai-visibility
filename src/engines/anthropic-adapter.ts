// ============================================================
// Anthropic engine adapter (v0.7.0, BYOK)
// POST https://api.anthropic.com/v1/messages
// ============================================================

import type { EngineAdapter, EngineResponse, QueryOptions } from '../types'
import { assertOk, buildEngineResponse, EngineResponseError, extractUrls, timedQuery } from './shared'

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

interface AnthropicMessagesResponse {
    model?: string
    content?: Array<{ type?: string; text?: string }>
}

export class AnthropicAdapter implements EngineAdapter {
    name = 'Anthropic'
    slug = 'anthropic' as const

    constructor(private readonly apiKey: string, private readonly defaults: QueryOptions = {}) {}

    async query(prompt: string, options: QueryOptions = {}): Promise<EngineResponse> {
        const model = options.model ?? this.defaults.model ?? DEFAULT_MODEL

        const { result: body, timestamp, latencyMs } = await timedQuery(async () => {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'x-api-key': this.apiKey,
                    'anthropic-version': ANTHROPIC_VERSION,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    max_tokens: options.maxTokens ?? this.defaults.maxTokens ?? 1024,
                    temperature: options.temperature ?? this.defaults.temperature ?? 0.7,
                    messages: [{ role: 'user', content: prompt }],
                }),
            })
            await assertOk(res, this.name)
            return (await res.json()) as AnthropicMessagesResponse
        })

        if (!Array.isArray(body.content)) {
            throw new EngineResponseError(this.name, 'missing content array')
        }
        const content = body.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text ?? '')
            .join('')

        return buildEngineResponse({
            engine: this.name,
            model: body.model ?? model,
            prompt,
            response: content,
            citations: extractUrls(content),
            timestamp,
            latencyMs,
        })
    }
}
