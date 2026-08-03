// ============================================================
// Tests: ai-visibility/detector — detectAndOptimize reachable without `next`
//
// Regression test: detectAndOptimize was originally only exported from
// ai-visibility/next, whose module scope statically imports 'next/server'.
// That meant merely importing the "framework-agnostic" detectAndOptimize
// helper crashed at module load time for anyone without `next` installed
// (e.g. a Nuxt or Vue project) — defeating its entire purpose. It now lives
// in the zero-dependency detector module and is reachable from here without
// pulling in `next` at all. ai-visibility/next continues to re-export it for
// convenience/back-compat, covered separately in next-middleware.test.ts.
// ============================================================

import { describe, it, expect } from 'vitest'
import { detectAndOptimize, AIBotDetector, HTMLOptimizer } from '../src/entrypoints/detector'

describe('ai-visibility/detector exports (no `next` required)', () => {
    it('exposes detectAndOptimize alongside AIBotDetector and HTMLOptimizer', () => {
        expect(typeof detectAndOptimize).toBe('function')
        expect(typeof AIBotDetector).toBe('function')
        expect(typeof HTMLOptimizer).toBe('function')
    })

    it('detects and optimizes for a real bot UA', () => {
        const html = '<html><head><script src="analytics.js"></script></head><body>Hello</body></html>'
        const result = detectAndOptimize(html, 'ClaudeBot/1.0')

        expect(result.isBot).toBe(true)
        expect(result.botName).toBe('ClaudeBot')
        expect(result.html).not.toContain('analytics.js')
    })

    it('passes browser UAs through untouched', () => {
        const html = '<html><body>Hello</body></html>'
        const result = detectAndOptimize(html, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0')

        expect(result.isBot).toBe(false)
        expect(result.botName).toBeNull()
        expect(result.html).toBe(html)
    })
})
