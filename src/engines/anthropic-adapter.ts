// ============================================================
// Anthropic engine adapter (v0.7.0, BYOK; retrieval since v0.10.0)
// POST https://api.anthropic.com/v1/messages
//
// The only adapter that distinguishes retrieved from cited: server-side web
// search returns `web_search_tool_result` blocks listing what it read, and
// text blocks carry `citations` naming what it actually leaned on. Both
// links of the chain are separately observable here.
// ============================================================

import type { EngineAdapter, EngineResponse, QueryOptions } from '../types'
import {
    assertOk,
    buildEngineResponse,
    EngineResponseError,
    maxSearchUses,
    notActivatedEvidence,
    proseExtractedEvidence,
    retrievedEvidence,
    timedQuery,
    wantsWebSearch,
} from './shared'

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const WEB_SEARCH_TOOL = 'web_search_20250305'

interface AnthropicCitation {
    type?: string
    url?: string
}

interface AnthropicSearchResult {
    type?: string
    url?: string
}

interface AnthropicContentBlock {
    type?: string
    text?: string
    name?: string
    citations?: AnthropicCitation[]
    /** On `web_search_tool_result`: the results array, or an error object when the search failed. */
    content?: AnthropicSearchResult[] | { type?: string; error_code?: string }
}

interface AnthropicMessagesResponse {
    model?: string
    content?: AnthropicContentBlock[]
}

export class AnthropicAdapter implements EngineAdapter {
    name = 'Anthropic'
    slug = 'anthropic' as const

    constructor(private readonly apiKey: string, private readonly defaults: QueryOptions = {}) {}

    async query(prompt: string, options: QueryOptions = {}): Promise<EngineResponse> {
        const model = options.model ?? this.defaults.model ?? DEFAULT_MODEL
        const webSearch = wantsWebSearch(options, this.defaults)

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
                    ...(webSearch
                        ? {
                              tools: [
                                  {
                                      type: WEB_SEARCH_TOOL,
                                      name: 'web_search',
                                      max_uses: maxSearchUses(options, this.defaults),
                                  },
                              ],
                          }
                        : {}),
                }),
            })
            await assertOk(res, this.name)
            return (await res.json()) as AnthropicMessagesResponse
        })

        if (!Array.isArray(body.content)) {
            throw new EngineResponseError(this.name, 'missing content array')
        }
        const blocks = body.content

        const content = blocks
            .filter((block) => block.type === 'text')
            .map((block) => block.text ?? '')
            .join('')

        return buildEngineResponse({
            engine: this.name,
            model: body.model ?? model,
            prompt,
            response: content,
            evidence: webSearch ? this.readRetrieval(blocks) : proseExtractedEvidence(content),
            timestamp,
            latencyMs,
        })
    }

    private readRetrieval(blocks: AnthropicContentBlock[]) {
        const resultBlocks = blocks.filter((b) => b.type === 'web_search_tool_result')

        // A `server_tool_use` block means a search was issued even if its
        // result block came back as an error — the search ran and returned
        // nothing usable, which is an activated run with zero sources, not an
        // unobserved one.
        const searched = resultBlocks.length > 0 || blocks.some((b) => b.type === 'server_tool_use' && b.name === 'web_search')
        if (!searched) return notActivatedEvidence()

        const sources = resultBlocks
            .flatMap((b) => (Array.isArray(b.content) ? b.content : []))
            .filter((r) => r.type === 'web_search_result')
            .map((r) => r.url)
            .filter((url): url is string => Boolean(url))

        const citedUrls = blocks
            .flatMap((b) => b.citations ?? [])
            .filter((c) => c.type === 'web_search_result_location')
            .map((c) => c.url)
            .filter((url): url is string => Boolean(url))

        return retrievedEvidence({ sources, citedUrls })
    }
}
