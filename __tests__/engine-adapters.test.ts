// ============================================================
// Tests: AI engine adapters (v0.7.0, BYOK)
// global.fetch is stubbed per test — never hits real provider APIs.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { OpenAIAdapter } from '../src/engines/openai-adapter'
import { PerplexityAdapter } from '../src/engines/perplexity-adapter'
import { GeminiAdapter } from '../src/engines/gemini-adapter'
import { AnthropicAdapter } from '../src/engines/anthropic-adapter'
import { extractUrls } from '../src/engines/shared'

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, statusText: status === 200 ? 'OK' : 'Error' })
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
    it('sends the documented request shape and normalizes the response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                model: 'gpt-4o-mini',
                choices: [{ message: { content: 'Acme CRM is great. See https://acme.example/reviews.' } }],
            })
        )
        vi.stubGlobal('fetch', fetchMock)

        const adapter = new OpenAIAdapter('sk-test')
        const result = await adapter.query('best CRM software')

        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://api.openai.com/v1/chat/completions')
        expect(init.method).toBe('POST')
        expect(init.headers.Authorization).toBe('Bearer sk-test')
        const body = JSON.parse(init.body)
        expect(body.model).toBe('gpt-4o-mini')
        expect(body.messages).toEqual([{ role: 'user', content: 'best CRM software' }])
        expect(body.temperature).toBe(0.7)
        expect(body.max_tokens).toBe(1024)

        expect(result.engine).toBe('OpenAI')
        expect(result.model).toBe('gpt-4o-mini')
        expect(result.response).toContain('Acme CRM is great')
        expect(result.citations).toEqual(['https://acme.example/reviews'])
        expect(result.brands).toEqual([])
        expect(result.latencyMs).toBeGreaterThanOrEqual(0)
        expect(typeof result.timestamp).toBe('number')
    })

    it('uses annotation citations when present, merged with regex-extracted ones', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse({
                    model: 'gpt-4o-mini',
                    choices: [
                        {
                            message: {
                                content: 'Also see https://acme.example/pricing',
                                annotations: [{ type: 'url_citation', url_citation: { url: 'https://acme.example/docs' } }],
                            },
                        },
                    ],
                })
            )
        )

        const result = await new OpenAIAdapter('sk-test').query('prompt')
        expect(result.citations.sort()).toEqual(['https://acme.example/docs', 'https://acme.example/pricing'].sort())
    })

    it('honors a per-call model override and constructor defaults', async () => {
        const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ model: 'gpt-4o', choices: [{ message: { content: 'ok' } }] }))
        vi.stubGlobal('fetch', fetchMock)

        await new OpenAIAdapter('sk-test', { model: 'gpt-4o', temperature: 0.2 }).query('prompt')
        const bodyFromDefaults = JSON.parse(fetchMock.mock.calls[0][1].body)
        expect(bodyFromDefaults.model).toBe('gpt-4o')
        expect(bodyFromDefaults.temperature).toBe(0.2)

        await new OpenAIAdapter('sk-test', { model: 'gpt-4o' }).query('prompt', { model: 'gpt-4o-mini' })
        const bodyFromOverride = JSON.parse(fetchMock.mock.calls[1][1].body)
        expect(bodyFromOverride.model).toBe('gpt-4o-mini')
    })

    it('throws a descriptive error on a non-ok response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'bad key' }, 401)))
        await expect(new OpenAIAdapter('bad-key').query('prompt')).rejects.toThrow(/OpenAI API request failed: 401/)
    })
})

describe('PerplexityAdapter', () => {
    it('sends the documented request shape and prefers the citations array', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                model: 'sonar',
                choices: [{ message: { content: 'Acme CRM is a solid choice.' } }],
                citations: ['https://source-one.example', 'https://source-two.example'],
            })
        )
        vi.stubGlobal('fetch', fetchMock)

        const result = await new PerplexityAdapter('pplx-test').query('best CRM software')

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://api.perplexity.ai/chat/completions')
        expect(init.headers.Authorization).toBe('Bearer pplx-test')
        expect(JSON.parse(init.body).model).toBe('sonar')

        expect(result.engine).toBe('Perplexity')
        expect(result.citations).toEqual(['https://source-one.example', 'https://source-two.example'])
    })

    it('falls back to regex-extracted URLs when the citations array is empty', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse({ model: 'sonar', choices: [{ message: { content: 'See https://acme.example/x' } }], citations: [] })
            )
        )
        const result = await new PerplexityAdapter('pplx-test').query('prompt')
        expect(result.citations).toEqual(['https://acme.example/x'])
    })
})

describe('GeminiAdapter', () => {
    it('sends the API key as a query param and the documented body shape', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                candidates: [{ content: { parts: [{ text: 'Acme CRM is a good option.' }] } }],
            })
        )
        vi.stubGlobal('fetch', fetchMock)

        const result = await new GeminiAdapter('AI-test').query('best CRM software')

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AI-test')
        const body = JSON.parse(init.body)
        expect(body.contents).toEqual([{ parts: [{ text: 'best CRM software' }] }])
        expect(body.generationConfig.temperature).toBe(0.7)

        expect(result.engine).toBe('Gemini')
        expect(result.model).toBe('gemini-2.0-flash')
        expect(result.response).toBe('Acme CRM is a good option.')
    })

    it('prefers grounding metadata URLs over regex extraction', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse({
                    candidates: [
                        {
                            content: { parts: [{ text: 'See https://ignored.example/regex' }] },
                            groundingMetadata: { groundingChunks: [{ web: { uri: 'https://grounded.example/source' } }] },
                        },
                    ],
                })
            )
        )
        const result = await new GeminiAdapter('AI-test').query('prompt')
        expect(result.citations).toEqual(['https://grounded.example/source'])
    })
})

describe('AnthropicAdapter', () => {
    it('sends the anthropic-version header and the documented body shape', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                model: 'claude-sonnet-4-6',
                content: [{ type: 'text', text: 'Acme CRM works well. See https://acme.example/docs' }],
            })
        )
        vi.stubGlobal('fetch', fetchMock)

        const result = await new AnthropicAdapter('sk-ant-test').query('best CRM software')

        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://api.anthropic.com/v1/messages')
        expect(init.headers['x-api-key']).toBe('sk-ant-test')
        expect(init.headers['anthropic-version']).toBe('2023-06-01')
        const body = JSON.parse(init.body)
        expect(body.messages).toEqual([{ role: 'user', content: 'best CRM software' }])

        expect(result.engine).toBe('Anthropic')
        expect(result.citations).toEqual(['https://acme.example/docs'])
    })

    it('throws a descriptive error on a non-ok response', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ error: 'overloaded' }, 529)))
        await expect(new AnthropicAdapter('sk-ant-test').query('prompt')).rejects.toThrow(/Anthropic API request failed: 529/)
    })
})
