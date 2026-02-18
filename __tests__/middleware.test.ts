// ============================================================
// Tests: AI Bot Detector
// ============================================================

import { describe, it, expect } from 'vitest'
import { AIBotDetector, HTMLOptimizer } from '../src/middleware/ai-detector'

describe('AIBotDetector', () => {
    const detector = new AIBotDetector()

    it('detects GPTBot', () => {
        const result = detector.detect('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)')
        expect(result).not.toBeNull()
        expect(result?.name).toBe('GPTBot')
        expect(result?.company).toBe('OpenAI')
    })

    it('detects ClaudeBot', () => {
        const result = detector.detect('claudebot/1.0')
        expect(result).not.toBeNull()
        expect(result?.name).toBe('ClaudeBot')
    })

    it('detects PerplexityBot', () => {
        const result = detector.detect('PerplexityBot/1.0')
        expect(result).not.toBeNull()
        expect(result?.name).toBe('PerplexityBot')
    })

    it('returns null for regular browser', () => {
        const result = detector.detect(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0'
        )
        expect(result).toBeNull()
    })

    it('returns null for empty user agent', () => {
        expect(detector.detect('')).toBeNull()
    })

    it('respects ignoreBots config', () => {
        const d = new AIBotDetector({ ignoreBots: ['gptbot'] })
        const result = d.detect('GPTBot/1.0')
        expect(result).toBeNull()
    })

    it('detects custom additional bots', () => {
        const d = new AIBotDetector({ additionalBots: ['MyCustomBot'] })
        const result = d.detect('MyCustomBot/2.0 crawler')
        expect(result).not.toBeNull()
        expect(result?.name).toBe('MyCustomBot')
    })

    it('is case-insensitive', () => {
        expect(detector.detect('GPTBOT/1.0')).not.toBeNull()
        expect(detector.detect('claudebot')).not.toBeNull()
    })
})

describe('HTMLOptimizer', () => {
    it('strips regular script tags', () => {
        const html = '<html><head><script src="app.js"></script></head><body>Hello</body></html>'
        const optimizer = new HTMLOptimizer({ stripJs: true })
        const result = optimizer.optimize(html)
        expect(result).not.toContain('<script src="app.js">')
        expect(result).toContain('Hello')
    })

    it('preserves JSON-LD schema scripts', () => {
        const html = `<html><head>
      <script type="application/ld+json">{"@type":"FAQPage"}</script>
      <script src="analytics.js"></script>
    </head><body>Content</body></html>`
        const optimizer = new HTMLOptimizer({ stripJs: true })
        const result = optimizer.optimize(html)
        expect(result).toContain('application/ld+json')
        expect(result).not.toContain('analytics.js')
    })

    it('removes inline event handlers', () => {
        const html = '<html><body><button onclick="doSomething()">Click</button></body></html>'
        const optimizer = new HTMLOptimizer({ stripJs: true })
        const result = optimizer.optimize(html)
        expect(result).not.toContain('onclick')
        expect(result).toContain('Click')
    })

    it('removes tracking pixels', () => {
        const html = '<html><body><img width="1" height="1" src="track.gif"><p>Content</p></body></html>'
        const optimizer = new HTMLOptimizer({ removeTracking: true })
        const result = optimizer.optimize(html)
        expect(result).not.toContain('track.gif')
        expect(result).toContain('Content')
    })

    it('adds AI-friendly meta comment', () => {
        const html = '<html><head></head><body></body></html>'
        const optimizer = new HTMLOptimizer()
        const result = optimizer.optimize(html)
        expect(result).toContain('Optimized for AI crawlers')
    })
})
