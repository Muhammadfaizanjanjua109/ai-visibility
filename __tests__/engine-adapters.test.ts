// ============================================================
// Tests: AI engine adapters (v0.7.0, BYOK; retrieval since v0.10.0)
// global.fetch is stubbed per test — never hits real provider APIs.
//
// The load-bearing assertions here are about *provenance*, not URLs. Every
// adapter can produce a plausible citations array; the question these tests
// answer is whether that array is evidence of retrieval or a regex guess,
// because the two are indistinguishable downstream once the label is lost.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { OpenAIAdapter } from '../src/engines/openai-adapter'
import { PerplexityAdapter } from '../src/engines/perplexity-adapter'
import { GeminiAdapter } from '../src/engines/gemini-adapter'
import { AnthropicAdapter } from '../src/engines/anthropic-adapter'
import { extractUrls, EngineResponseError } from '../src/engines/shared'

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, statusText: status === 200 ? 'OK' : 'Error' })
}

/** A fresh Response per call — a single instance would have its body consumed after the first read. */
function stubFetch(body: unknown, status = 200) {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse(body, status))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

function bodyOf(fetchMock: ReturnType<typeof vi.fn>, call = 0): Record<string, unknown> {
    return JSON.parse(fetchMock.mock.calls[call]![1].body)
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('extractUrls', () => {
    it('extracts and de-duplicates URLs, trimming trailing punctuation', () => {
        const text = 'See https://acme.example/docs. Also https://acme.example/docs and https://other.example/page,'
        expect(extractUrls(text)).toEqual(['https://acme.example/docs', 'https://other.example/page'])
    })

    it('returns an empty array when there are no URLs', () => {
        expect(extractUrls('no links here')).toEqual([])
    })
})

describe('OpenAIAdapter', () => {
    const searched = {
        model: 'gpt-4o-mini',
        output: [
            { type: 'web_search_call', id: 'ws_1', status: 'completed' },
            {
                type: 'message',
                content: [
                    {
                        type: 'output_text',
                        text: 'Acme CRM is well reviewed.',
                        annotations: [{ type: 'url_citation', url: 'https://acme.example/reviews' }],
                    },
                ],
            },
        ],
    }

    it('requests web search by default and reads citations from url_citation annotations', async () => {
        const fetchMock = stubFetch(searched)
        const result = await new OpenAIAdapter('sk-test').query('best CRM software')

        const [url, init] = fetchMock.mock.calls[0]!
        expect(url).toBe('https://api.openai.com/v1/responses')
        expect(init.headers.Authorization).toBe('Bearer sk-test')
        const body = bodyOf(fetchMock)
        expect(body.tools).toEqual([{ type: 'web_search' }])
        expect(body.input).toBe('best CRM software')

        expect(result.searchActivation).toBe('activated')
        expect(result.citationProvenance).toBe('retrieval')
        expect(result.citations).toEqual(['https://acme.example/reviews'])
        expect(result.response).toBe('Acme CRM is well reviewed.')
        expect(result.brands).toEqual([])
    })

    it('reports retrieved sources as not-observable even when the search demonstrably ran', async () => {
        // The Responses API proves activation without enumerating what it
        // read. An empty array here would assert the engine read nothing,
        // which is the opposite of what a completed web_search_call means.
        stubFetch(searched)
        const result = await new OpenAIAdapter('sk-test').query('prompt')
        expect(result.retrievedSources).toEqual({ value: null, status: 'not-observable' })
    })

    it('reports not-activated — with no citations — when the tool was offered and declined', async () => {
        // The URL in the prose was recited from memory: the engine had a
        // search tool available and chose not to use it. Admitting that URL
        // as a citation is the exact bug this release fixes.
        stubFetch({
            model: 'gpt-4o-mini',
            output: [{ type: 'message', content: [{ type: 'output_text', text: 'Try https://acme.example/from-memory' }] }],
        })
        const result = await new OpenAIAdapter('sk-test').query('prompt')

        expect(result.searchActivation).toBe('not-activated')
        expect(result.citationProvenance).toBe('none')
        expect(result.citations).toEqual([])
        // The text is still there for callers who want it.
        expect(result.response).toContain('https://acme.example/from-memory')
    })

    it('falls back to chat/completions and marks the result unknown when web search is disabled', async () => {
        const fetchMock = stubFetch({
            model: 'gpt-4o-mini',
            choices: [{ message: { content: 'Acme CRM is great. See https://acme.example/reviews.' } }],
        })
        const result = await new OpenAIAdapter('sk-test').query('prompt', { webSearch: false })

        expect(fetchMock.mock.calls[0]![0]).toBe('https://api.openai.com/v1/chat/completions')
        expect(bodyOf(fetchMock).tools).toBeUndefined()
        expect(bodyOf(fetchMock).max_tokens).toBe(1024)

        // Never asked, so never observed — not "did not search".
        expect(result.searchActivation).toBe('unknown')
        expect(result.citationProvenance).toBe('prose-extraction')
        expect(result.citations).toEqual(['https://acme.example/reviews'])
        expect(result.retrievedSources.status).toBe('not-observable')
    })

    it('honors webSearch:false set as a constructor default', async () => {
        const fetchMock = stubFetch({ model: 'gpt-4o-mini', choices: [{ message: { content: 'ok' } }] })
        await new OpenAIAdapter('sk-test', { webSearch: false }).query('prompt')
        expect(fetchMock.mock.calls[0]![0]).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('lets a per-call webSearch override the constructor default', async () => {
        const fetchMock = stubFetch(searched)
        await new OpenAIAdapter('sk-test', { webSearch: false }).query('prompt', { webSearch: true })
        expect(fetchMock.mock.calls[0]![0]).toBe('https://api.openai.com/v1/responses')
    })

    it('treats chat/completions annotations as observed retrieval when a search-preview model returns them', async () => {
        stubFetch({
            model: 'gpt-4o-search-preview',
            choices: [
                {
                    message: {
                        content: 'Also see https://acme.example/pricing',
                        annotations: [{ type: 'url_citation', url_citation: { url: 'https://acme.example/docs' } }],
                    },
                },
            ],
        })
        const result = await new OpenAIAdapter('sk-test').query('prompt', { webSearch: false })
        expect(result.citationProvenance).toBe('retrieval')
        expect(result.searchActivation).toBe('activated')
        expect(result.citations).toEqual(['https://acme.example/docs'])
    })

    it('honors a per-call model override and constructor defaults', async () => {
        const fetchMock = stubFetch(searched)

        await new OpenAIAdapter('sk-test', { model: 'gpt-4o', temperature: 0.2 }).query('prompt')
        expect(bodyOf(fetchMock, 0).model).toBe('gpt-4o')
        expect(bodyOf(fetchMock, 0).temperature).toBe(0.2)

        await new OpenAIAdapter('sk-test', { model: 'gpt-4o' }).query('prompt', { model: 'gpt-4o-mini' })
        expect(bodyOf(fetchMock, 1).model).toBe('gpt-4o-mini')
    })

    it('throws a descriptive error on a non-ok response', async () => {
        stubFetch({ error: 'bad key' }, 401)
        await expect(new OpenAIAdapter('bad-key').query('prompt')).rejects.toThrow(/OpenAI API request failed: 401/)
    })

    it('throws EngineResponseError when the response shape is unexpected', async () => {
        stubFetch({ model: 'gpt-4o-mini', output: [{ type: 'web_search_call' }] })
        const err = await new OpenAIAdapter('sk-test').query('prompt').catch((e) => e)
        expect(err).toBeInstanceOf(EngineResponseError)
        expect(err.message).toBe('OpenAI response missing an output item of type "message"')
    })

    it('still reports the chat/completions shape error on the opt-out path', async () => {
        stubFetch({ model: 'gpt-4o-mini', choices: [] })
        const err = await new OpenAIAdapter('sk-test').query('prompt', { webSearch: false }).catch((e) => e)
        expect(err.message).toBe('OpenAI response missing choices[0].message.content')
    })
})

describe('PerplexityAdapter', () => {
    it('reads retrieval from search_results and reports it as observed', async () => {
        const fetchMock = stubFetch({
            model: 'sonar',
            choices: [{ message: { content: 'Acme CRM is a solid choice.' } }],
            search_results: [{ url: 'https://source-one.example' }, { url: 'https://source-two.example' }],
        })
        const result = await new PerplexityAdapter('pplx-test').query('best CRM software')

        expect(fetchMock.mock.calls[0]![0]).toBe('https://api.perplexity.ai/chat/completions')
        expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer pplx-test')

        expect(result.searchActivation).toBe('activated')
        expect(result.citationProvenance).toBe('retrieval')
        expect(result.retrievedSources).toEqual({
            value: ['https://source-one.example', 'https://source-two.example'],
            status: 'observed',
        })
        expect(result.citations).toEqual(['https://source-one.example', 'https://source-two.example'])
    })

    it('still reads the legacy citations array when search_results is absent', async () => {
        stubFetch({
            model: 'sonar',
            choices: [{ message: { content: 'ok' } }],
            citations: ['https://source-one.example'],
        })
        const result = await new PerplexityAdapter('pplx-test').query('prompt')
        expect(result.citationProvenance).toBe('retrieval')
        expect(result.retrievedSources.value).toEqual(['https://source-one.example'])
    })

    it('treats an empty search_results array as an activated run that found nothing', async () => {
        // Present-but-empty is Perplexity saying it searched and came back
        // with nothing — a real observation, not a missing one.
        stubFetch({ model: 'sonar', choices: [{ message: { content: 'See https://acme.example/x' } }], search_results: [] })
        const result = await new PerplexityAdapter('pplx-test').query('prompt')

        expect(result.searchActivation).toBe('activated')
        expect(result.retrievedSources).toEqual({ value: [], status: 'observed' })
        expect(result.citations).toEqual([])
    })

    it('falls back to unknown when the response carries no retrieval field at all', async () => {
        stubFetch({ model: 'sonar', choices: [{ message: { content: 'See https://acme.example/x' } }] })
        const result = await new PerplexityAdapter('pplx-test').query('prompt')
        expect(result.searchActivation).toBe('unknown')
        expect(result.citationProvenance).toBe('prose-extraction')
    })

    it('throws EngineResponseError when the response shape is unexpected', async () => {
        stubFetch({ model: 'sonar', choices: [] })
        const err = await new PerplexityAdapter('pplx-test').query('prompt').catch((e) => e)
        expect(err).toBeInstanceOf(EngineResponseError)
        expect(err.message).toBe('Perplexity response missing choices[0].message.content')
    })
})

describe('GeminiAdapter', () => {
    it('sends the google_search tool by default and reads grounding chunks', async () => {
        const fetchMock = stubFetch({
            candidates: [
                {
                    content: { parts: [{ text: 'Acme CRM is a good option.' }] },
                    groundingMetadata: {
                        webSearchQueries: ['best crm'],
                        groundingChunks: [{ web: { uri: 'https://grounded.example/source' } }],
                    },
                },
            ],
        })
        const result = await new GeminiAdapter('AI-test').query('best CRM software')

        const [url] = fetchMock.mock.calls[0]!
        expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AI-test')
        expect(bodyOf(fetchMock).tools).toEqual([{ google_search: {} }])

        expect(result.searchActivation).toBe('activated')
        expect(result.citationProvenance).toBe('retrieval')
        expect(result.retrievedSources.value).toEqual(['https://grounded.example/source'])
    })

    it('counts webSearchQueries without grounding chunks as an activated, ungrounded run', async () => {
        stubFetch({
            candidates: [
                {
                    content: { parts: [{ text: 'See https://ignored.example/regex' }] },
                    groundingMetadata: { webSearchQueries: ['best crm'] },
                },
            ],
        })
        const result = await new GeminiAdapter('AI-test').query('prompt')
        expect(result.searchActivation).toBe('activated')
        expect(result.retrievedSources).toEqual({ value: [], status: 'observed' })
        expect(result.citations).toEqual([])
    })

    it('reports not-activated when grounding metadata is absent entirely', async () => {
        stubFetch({ candidates: [{ content: { parts: [{ text: 'See https://acme.example/from-memory' }] } }] })
        const result = await new GeminiAdapter('AI-test').query('prompt')
        expect(result.searchActivation).toBe('not-activated')
        expect(result.citations).toEqual([])
    })

    it('omits the tool and marks the run unknown when web search is disabled', async () => {
        const fetchMock = stubFetch({ candidates: [{ content: { parts: [{ text: 'See https://acme.example/x' }] } }] })
        const result = await new GeminiAdapter('AI-test').query('prompt', { webSearch: false })
        expect(bodyOf(fetchMock).tools).toBeUndefined()
        expect(result.searchActivation).toBe('unknown')
        expect(result.citations).toEqual(['https://acme.example/x'])
    })

    it('throws EngineResponseError when the response shape is unexpected', async () => {
        stubFetch({ candidates: [] })
        const err = await new GeminiAdapter('AI-test').query('prompt').catch((e) => e)
        expect(err).toBeInstanceOf(EngineResponseError)
        expect(err.message).toBe('Gemini response missing candidates[0].content.parts')
    })
})

describe('AnthropicAdapter', () => {
    it('sends the web search tool by default with a use cap', async () => {
        const fetchMock = stubFetch({
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Acme CRM works well.' }],
        })
        await new AnthropicAdapter('sk-ant-test').query('best CRM software')

        const [url, init] = fetchMock.mock.calls[0]!
        expect(url).toBe('https://api.anthropic.com/v1/messages')
        expect(init.headers['anthropic-version']).toBe('2023-06-01')
        expect(bodyOf(fetchMock).tools).toEqual([{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }])
    })

    it('honors maxSearchUses as a cost bound', async () => {
        const fetchMock = stubFetch({ model: 'claude-sonnet-4-6', content: [{ type: 'text', text: 'ok' }] })
        await new AnthropicAdapter('sk-ant-test').query('prompt', { maxSearchUses: 2 })
        expect((bodyOf(fetchMock).tools as Array<{ max_uses: number }>)[0]!.max_uses).toBe(2)
    })

    it('separates retrieved sources from cited ones — the only adapter that can', async () => {
        stubFetch({
            model: 'claude-sonnet-4-6',
            content: [
                { type: 'server_tool_use', name: 'web_search', input: { query: 'best crm' } },
                {
                    type: 'web_search_tool_result',
                    content: [
                        { type: 'web_search_result', url: 'https://acme.example/docs' },
                        { type: 'web_search_result', url: 'https://other.example/blog' },
                    ],
                },
                {
                    type: 'text',
                    text: 'Acme CRM works well.',
                    citations: [{ type: 'web_search_result_location', url: 'https://acme.example/docs' }],
                },
            ],
        })
        const result = await new AnthropicAdapter('sk-ant-test').query('prompt')

        expect(result.searchActivation).toBe('activated')
        expect(result.citationProvenance).toBe('retrieval')
        // Read two, leaned on one. Collapsing these would make
        // pCitedGivenRetrieved unmeasurable.
        expect(result.retrievedSources.value).toEqual(['https://acme.example/docs', 'https://other.example/blog'])
        expect(result.citations).toEqual(['https://acme.example/docs'])
    })

    it('records retrieved-but-cited-nothing as an activated run with zero citations', async () => {
        stubFetch({
            model: 'claude-sonnet-4-6',
            content: [
                { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://other.example/blog' }] },
                { type: 'text', text: 'Nothing relevant found. See https://acme.example/from-memory' },
            ],
        })
        const result = await new AnthropicAdapter('sk-ant-test').query('prompt')
        expect(result.retrievedSources.value).toEqual(['https://other.example/blog'])
        expect(result.citations).toEqual([])
    })

    it('treats a failed search as activated with zero sources, not as no search', async () => {
        // The tool ran and came back an error. That consumed a retrieval
        // opportunity; folding it into "never searched" hides the failure.
        stubFetch({
            model: 'claude-sonnet-4-6',
            content: [
                { type: 'server_tool_use', name: 'web_search', input: { query: 'best crm' } },
                { type: 'web_search_tool_result', content: { type: 'web_search_tool_result_error', error_code: 'max_uses_exceeded' } },
                { type: 'text', text: 'I could not search.' },
            ],
        })
        const result = await new AnthropicAdapter('sk-ant-test').query('prompt')
        expect(result.searchActivation).toBe('activated')
        expect(result.retrievedSources).toEqual({ value: [], status: 'observed' })
    })

    it('reports not-activated — with no citations — when the tool was offered and declined', async () => {
        stubFetch({
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Acme CRM works well. See https://acme.example/docs' }],
        })
        const result = await new AnthropicAdapter('sk-ant-test').query('prompt')
        expect(result.searchActivation).toBe('not-activated')
        expect(result.citationProvenance).toBe('none')
        expect(result.citations).toEqual([])
    })

    it('omits the tool and marks the run unknown when web search is disabled', async () => {
        const fetchMock = stubFetch({
            model: 'claude-sonnet-4-6',
            content: [{ type: 'text', text: 'Acme CRM works well. See https://acme.example/docs' }],
        })
        const result = await new AnthropicAdapter('sk-ant-test').query('prompt', { webSearch: false })
        expect(bodyOf(fetchMock).tools).toBeUndefined()
        expect(result.searchActivation).toBe('unknown')
        expect(result.citationProvenance).toBe('prose-extraction')
        expect(result.citations).toEqual(['https://acme.example/docs'])
    })

    it('throws a descriptive error on a non-ok response', async () => {
        stubFetch({ error: 'overloaded' }, 529)
        await expect(new AnthropicAdapter('sk-ant-test').query('prompt')).rejects.toThrow(/Anthropic API request failed: 529/)
    })

    it('throws EngineResponseError when the response shape is unexpected', async () => {
        stubFetch({ model: 'claude-sonnet-4-6' })
        const err = await new AnthropicAdapter('sk-ant-test').query('prompt').catch((e) => e)
        expect(err).toBeInstanceOf(EngineResponseError)
        expect(err.message).toBe('Anthropic response missing content array')
    })
})

describe('provenance is never silently upgraded', () => {
    it('marks every disabled-search run unknown across all four adapters', async () => {
        const cases: Array<[string, () => Promise<{ searchActivation: string; citationProvenance: string }>]> = [
            ['OpenAI', () => new OpenAIAdapter('k').query('p', { webSearch: false })],
            ['Gemini', () => new GeminiAdapter('k').query('p', { webSearch: false })],
            ['Anthropic', () => new AnthropicAdapter('k').query('p', { webSearch: false })],
        ]
        const bodies: Record<string, unknown> = {
            OpenAI: { choices: [{ message: { content: 'See https://acme.example/x' } }] },
            Gemini: { candidates: [{ content: { parts: [{ text: 'See https://acme.example/x' }] } }] },
            Anthropic: { content: [{ type: 'text', text: 'See https://acme.example/x' }] },
        }

        for (const [name, call] of cases) {
            stubFetch(bodies[name])
            const result = await call()
            expect(result.searchActivation, name).toBe('unknown')
            expect(result.citationProvenance, name).toBe('prose-extraction')
            vi.unstubAllGlobals()
        }
    })
})
