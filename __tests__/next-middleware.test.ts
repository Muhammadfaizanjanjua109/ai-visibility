// ============================================================
// Tests: ai-visibility/next (createNextMiddleware + detectAndOptimize)
// ============================================================

import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createNextMiddleware, detectAndOptimize } from '../src/entrypoints/next'

const BOT_UA = 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)'
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
const MALFORMED_UA = ''
// Near-miss: contains "gpt" and "bot" but not the exact "gptbot" substring the detector matches on.
const NEAR_MISS_UA = 'Mozilla/5.0 GPT-Bot/2.0 (compatible; not-a-real-crawler)'

function makeRequest(userAgent: string): NextRequest {
    return new NextRequest('https://example.com/page', {
        headers: userAgent ? { 'user-agent': userAgent } : {},
    })
}

describe('createNextMiddleware', () => {
    it('marks a real AI bot request with the header and fires onDetect', () => {
        const onDetect = vi.fn()
        const middleware = createNextMiddleware({ onDetect })
        const res = middleware(makeRequest(BOT_UA))

        expect(res.headers.get('x-ai-crawler')).toBe('GPTBot')
        expect(onDetect).toHaveBeenCalledTimes(1)
        expect(onDetect.mock.calls[0][0].name).toBe('GPTBot')
    })

    it('passes a real browser request through with no header', () => {
        const onDetect = vi.fn()
        const middleware = createNextMiddleware({ onDetect })
        const res = middleware(makeRequest(BROWSER_UA))

        expect(res.headers.get('x-ai-crawler')).toBeNull()
        expect(onDetect).not.toHaveBeenCalled()
    })

    it('passes a malformed/empty user-agent through with no header', () => {
        const middleware = createNextMiddleware()
        const res = middleware(makeRequest(MALFORMED_UA))

        expect(res.headers.get('x-ai-crawler')).toBeNull()
    })

    it('does not falsely match a near-miss user-agent', () => {
        const middleware = createNextMiddleware()
        const res = middleware(makeRequest(NEAR_MISS_UA))

        expect(res.headers.get('x-ai-crawler')).toBeNull()
    })

    it('supports a custom header name', () => {
        const middleware = createNextMiddleware({ headerName: 'x-bot-detected' })
        const res = middleware(makeRequest(BOT_UA))

        expect(res.headers.get('x-bot-detected')).toBe('GPTBot')
    })

    it('rewrites to the configured path when a bot is detected', () => {
        const middleware = createNextMiddleware({ rewrite: '/ai-landing' })
        const res = middleware(makeRequest(BOT_UA))

        expect(res.headers.get('x-middleware-rewrite')).toContain('/ai-landing')
        expect(res.headers.get('x-ai-crawler')).toBe('GPTBot')
    })

    it('supports a rewrite function receiving the detected bot', () => {
        const rewrite = vi.fn((bot: { name: string }) => `/ai/${bot.name.toLowerCase()}`)
        const middleware = createNextMiddleware({ rewrite })
        const res = middleware(makeRequest(BOT_UA))

        expect(rewrite).toHaveBeenCalled()
        expect(res.headers.get('x-middleware-rewrite')).toContain('/ai/gptbot')
    })
})

describe('createNextMiddleware onDetect + waitUntil', () => {
    function makeEvent() {
        return { waitUntil: vi.fn() }
    }

    it('registers an async onDetect promise with event.waitUntil() before returning', async () => {
        let resolveOnDetect: () => void
        const onDetect = vi.fn(() => new Promise<void>((resolve) => { resolveOnDetect = resolve }))
        const event = makeEvent()
        const middleware = createNextMiddleware({ onDetect })

        const res = middleware(makeRequest(BOT_UA), event as any)

        // The response comes back immediately — waitUntil is what keeps the
        // async onDetect work alive after that, not something blocking it.
        expect(res.headers.get('x-ai-crawler')).toBe('GPTBot')
        // event.waitUntil must already be registered by the time the call
        // returns — synchronously, not on some later microtask — otherwise
        // the runtime has no way to know to keep the context alive at all.
        expect(event.waitUntil).toHaveBeenCalledTimes(1)

        const registeredPromise = event.waitUntil.mock.calls[0][0]
        resolveOnDetect!()
        await expect(registeredPromise).resolves.toBeUndefined()
    })

    it('a rejecting onDetect does not throw and does not break the response', async () => {
        const onDetect = vi.fn(() => Promise.reject(new Error('analytics endpoint down')))
        const event = makeEvent()
        const middleware = createNextMiddleware({ onDetect })

        const res = middleware(makeRequest(BOT_UA), event as any)

        expect(res.headers.get('x-ai-crawler')).toBe('GPTBot')
        expect(event.waitUntil).toHaveBeenCalledTimes(1)

        const registeredPromise = event.waitUntil.mock.calls[0][0]
        // Must not reject — a failing onDetect is swallowed here specifically
        // so it can never become an unhandled rejection.
        await expect(registeredPromise).resolves.toBeUndefined()
    })

    it('a synchronous onDetect never touches event.waitUntil', () => {
        const onDetect = vi.fn()
        const event = makeEvent()
        const middleware = createNextMiddleware({ onDetect })

        middleware(makeRequest(BOT_UA), event as any)

        expect(onDetect).toHaveBeenCalledTimes(1)
        expect(event.waitUntil).not.toHaveBeenCalled()
    })

    it('still works with no event argument at all (back-compat)', () => {
        const onDetect = vi.fn(() => Promise.resolve())
        const middleware = createNextMiddleware({ onDetect })

        expect(() => middleware(makeRequest(BOT_UA))).not.toThrow()
    })
})

describe('detectAndOptimize', () => {
    const html = '<html><head><script src="analytics.js"></script></head><body>Hello</body></html>'

    it('optimizes HTML for a real AI bot UA', () => {
        const result = detectAndOptimize(html, BOT_UA)

        expect(result.isBot).toBe(true)
        expect(result.botName).toBe('GPTBot')
        expect(result.html).not.toContain('analytics.js')
        expect(result.html).toContain('Hello')
    })

    it('leaves HTML untouched for a real browser UA', () => {
        const result = detectAndOptimize(html, BROWSER_UA)

        expect(result.isBot).toBe(false)
        expect(result.botName).toBeNull()
        expect(result.html).toBe(html)
    })

    it('leaves HTML untouched for a malformed/empty UA', () => {
        const result = detectAndOptimize(html, MALFORMED_UA)

        expect(result.isBot).toBe(false)
        expect(result.html).toBe(html)
    })

    it('does not falsely match a near-miss UA', () => {
        const result = detectAndOptimize(html, NEAR_MISS_UA)

        expect(result.isBot).toBe(false)
        expect(result.html).toBe(html)
    })
})
