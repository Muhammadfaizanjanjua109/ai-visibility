// ============================================================
// Tests: Robots Generator
// ============================================================

import { describe, it, expect } from 'vitest'
import { RobotsGenerator } from '../src/generators/robots-generator'

describe('RobotsGenerator', () => {
    it('generates robots.txt with allowed AI bots', () => {
        const gen = new RobotsGenerator({
            allowAI: ['GPTBot', 'ClaudeBot'],
            blockAI: [],
            disallow: ['/admin'],
        })
        const content = gen.generate()
        expect(content).toContain('User-agent: GPTBot')
        expect(content).toContain('Allow: /')
        expect(content).toContain('User-agent: ClaudeBot')
    })

    it('generates robots.txt with blocked bots', () => {
        const gen = new RobotsGenerator({
            allowAI: ['GPTBot'],
            blockAI: ['CCBot'],
            disallow: [],
        })
        const content = gen.generate()
        expect(content).toContain('User-agent: CCBot')
        expect(content).toContain('Disallow: /')
    })

    it('includes sitemap URL when provided', () => {
        const gen = new RobotsGenerator({
            sitemapUrl: 'https://example.com/sitemap.xml',
        })
        const content = gen.generate()
        expect(content).toContain('Sitemap: https://example.com/sitemap.xml')
    })

    it('includes disallow paths', () => {
        const gen = new RobotsGenerator({
            disallow: ['/admin', '/private', '/api'],
        })
        const content = gen.generate()
        expect(content).toContain('Disallow: /admin')
        expect(content).toContain('Disallow: /private')
        expect(content).toContain('Disallow: /api')
    })

    it('allowAll() static method allows all known bots', () => {
        const content = RobotsGenerator.allowAll()
        expect(content).toContain('GPTBot')
        expect(content).toContain('ClaudeBot')
        expect(content).toContain('PerplexityBot')
    })

    it('blockTraining() blocks training bots', () => {
        const content = RobotsGenerator.blockTraining()
        // CCBot is a training bot
        expect(content).toMatch(/User-agent: CCBot[\s\S]*?Disallow: \//)
    })

    it('does not allow blocked bots in allow section', () => {
        const gen = new RobotsGenerator({
            allowAI: ['GPTBot', 'CCBot'],
            blockAI: ['CCBot'],
        })
        const content = gen.generate()
        // CCBot should appear in block section, not allow section
        const ccbotIndex = content.indexOf('User-agent: CCBot')
        const disallowAfterCCBot = content.indexOf('Disallow: /', ccbotIndex)
        const allowAfterCCBot = content.indexOf('Allow: /', ccbotIndex)
        expect(disallowAfterCCBot).toBeLessThan(allowAfterCCBot === -1 ? Infinity : allowAfterCCBot)
    })

    it('includes crawl delay when specified', () => {
        const gen = new RobotsGenerator({
            allowAI: ['GPTBot'],
            crawlDelay: 10,
        })
        const content = gen.generate()
        expect(content).toContain('Crawl-delay: 10')
    })
})
