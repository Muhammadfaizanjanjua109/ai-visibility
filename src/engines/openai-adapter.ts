// ============================================================
// OpenAI engine adapter (v0.7.0, BYOK; retrieval since v0.10.0)
// POST https://api.openai.com/v1/responses          (webSearch on, default)
// POST https://api.openai.com/v1/chat/completions   (webSearch off)
//
// Two endpoints on purpose. Web search is a Responses-API tool; the
// chat/completions path is kept verbatim for callers who opt out of
// retrieval (cost, proxies, offline replay) and it behaves exactly as it did
// before v0.10.0 — including reporting its citations as prose-extracted
// guesses rather than observed retrieval.
// ============================================================

import type { EngineAdapter, EngineResponse, QueryOptions } from '../types'
import {
    activatedOpaqueEvidence,
    assertOk,
    buildEngineResponse,
    type CitationEvidence,
    EngineResponseError,
    notActivatedEvidence,
    proseExtractedEvidence,
    timedQuery,
    wantsWebSearch,
} from './shared'

const DEFAULT_MODEL = 'gpt-4o-mini'
const CHAT_URL = 'https://api.openai.com/v1/chat/completions'
const RESPONSES_URL = 'https://api.openai.com/v1/responses'

/** Chat Completions shape: the citation URL is nested under `url_citation`. */
interface OpenAIChatAnnotation {
    type?: string
    url_citation?: { url?: string }
}

interface OpenAIChatCompletionResponse {
    model?: string
    choices?: Array<{
        message?: {
            content?: string
            annotations?: OpenAIChatAnnotation[]
        }
    }>
}

/** Responses API shape: the citation URL is flat on the annotation. */
interface OpenAIResponsesAnnotation {
    type?: string
    url?: string
}

interface OpenAIResponsesOutputItem {
    type?: string
    status?: string
    content?: Array<{
        type?: string
        text?: string
        annotations?: OpenAIResponsesAnnotation[]
    }>
}

interface OpenAIResponsesResponse {
    model?: string
    output?: OpenAIResponsesOutputItem[]
}

export class OpenAIAdapter implements EngineAdapter {
    name = 'OpenAI'
    slug = 'openai' as const

    /** `defaults` are per-call `options` fallbacks — e.g. the `model`/`temperature` set for this engine in `crawlpod.config.js`. */
    constructor(private readonly apiKey: string, private readonly defaults: QueryOptions = {}) {}

    async query(prompt: string, options: QueryOptions = {}): Promise<EngineResponse> {
        const model = options.model ?? this.defaults.model ?? DEFAULT_MODEL
        const temperature = options.temperature ?? this.defaults.temperature ?? 0.7
        const maxTokens = options.maxTokens ?? this.defaults.maxTokens ?? 1024

        return wantsWebSearch(options, this.defaults)
            ? this.queryWithSearch(prompt, model, temperature, maxTokens)
            : this.queryWithoutSearch(prompt, model, temperature, maxTokens)
    }

    private get headers(): Record<string, string> {
        return { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' }
    }

    private async queryWithSearch(prompt: string, model: string, temperature: number, maxTokens: number): Promise<EngineResponse> {
        const { result: body, timestamp, latencyMs } = await timedQuery(async () => {
            const res = await fetch(RESPONSES_URL, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    model,
                    input: prompt,
                    tools: [{ type: 'web_search' }],
                    temperature,
                    max_output_tokens: maxTokens,
                }),
            })
            await assertOk(res, this.name)
            return (await res.json()) as OpenAIResponsesResponse
        })

        const output = body.output
        if (!Array.isArray(output)) {
            throw new EngineResponseError(this.name, 'missing output array')
        }

        const messages = output.filter((item) => item.type === 'message')
        if (messages.length === 0) {
            throw new EngineResponseError(this.name, 'missing an output item of type "message"')
        }

        const parts = messages.flatMap((m) => m.content ?? [])
        const content = parts
            .filter((p) => p.type === 'output_text')
            .map((p) => p.text ?? '')
            .join('')

        const citedUrls = parts
            .flatMap((p) => p.annotations ?? [])
            .filter((a) => a.type === 'url_citation')
            .map((a) => a.url)
            .filter((url): url is string => Boolean(url))

        // A `web_search_call` item in the output is the activation signal:
        // the provider is telling us a search ran. Its absence, when a tool
        // was offered, is a real not-activated — the engine had the option
        // and answered from memory instead.
        const searched = output.some((item) => item.type === 'web_search_call')

        const evidence: CitationEvidence = searched
            ? // Opaque, not empty: the call proves a search happened but the
              // API does not enumerate the pages it read, and `[]` there
              // would assert it read nothing.
              activatedOpaqueEvidence(citedUrls)
            : notActivatedEvidence()

        return buildEngineResponse({
            engine: this.name,
            model: body.model ?? model,
            prompt,
            response: content,
            evidence,
            timestamp,
            latencyMs,
        })
    }

    private async queryWithoutSearch(prompt: string, model: string, temperature: number, maxTokens: number): Promise<EngineResponse> {
        const { result: text, timestamp, latencyMs } = await timedQuery(async () => {
            const res = await fetch(CHAT_URL, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature,
                    max_tokens: maxTokens,
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

        // A search-preview model can attach real annotations even here. Those
        // are observed retrieval; anything else on this path is a guess.
        const annotationUrls = (message?.annotations ?? [])
            .map((a) => a.url_citation?.url)
            .filter((url): url is string => Boolean(url))

        const evidence = annotationUrls.length > 0 ? activatedOpaqueEvidence(annotationUrls) : proseExtractedEvidence(content)

        return buildEngineResponse({
            engine: this.name,
            model: text.model ?? model,
            prompt,
            response: content,
            evidence,
            timestamp,
            latencyMs,
        })
    }
}
