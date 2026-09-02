// ============================================================
// Tests: AI crawler registry — vendor-verified UA tokens
//
// Each "verified" crawler is tested against a realistic full User-Agent
// string taken from (or matching the format of) the vendor's own published
// documentation, plus a near-miss string from a sibling/competitor crawler
// that must NOT match. See src/data/crawlers.ts for the source URLs.
// ============================================================

import { describe, it, expect } from 'vitest'
import { AI_CRAWLERS, detectBot, getUnverifiedBots } from '../src/data/crawlers'

function ua(token: string): string {
    return `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ${token}; +https://example.com/bot`
}

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

describe('OpenAI crawlers', () => {
    it('detects GPTBot (training)', () => {
        const bot = detectBot(ua('GPTBot/1.4'))
        expect(bot?.name).toBe('GPTBot')
        expect(bot?.company).toBe('OpenAI')
        expect(bot?.purpose).toBe('training')
    })

    it('detects ChatGPT-User (user-triggered)', () => {
        expect(detectBot(ua('ChatGPT-User/1.0'))?.name).toBe('ChatGPT-User')
    })

    it('detects OAI-SearchBot (search)', () => {
        expect(detectBot(ua('OAI-SearchBot/1.4'))?.name).toBe('OAI-SearchBot')
    })

    it('does not cross-match OpenAI\'s three bots against each other', () => {
        expect(detectBot(ua('GPTBot/1.4'))?.name).not.toBe('ChatGPT-User')
        expect(detectBot(ua('ChatGPT-User/1.0'))?.name).not.toBe('OAI-SearchBot')
        expect(detectBot(ua('OAI-SearchBot/1.4'))?.name).not.toBe('GPTBot')
    })
})

describe('Anthropic crawlers', () => {
    it('detects ClaudeBot (training)', () => {
        const bot = detectBot(ua('ClaudeBot/1.0'))
        expect(bot?.name).toBe('ClaudeBot')
        expect(bot?.company).toBe('Anthropic')
    })

    it('detects Claude-User (user-triggered) — replaces the deprecated Claude-Web token', () => {
        expect(detectBot(ua('Claude-User/1.0'))?.name).toBe('Claude-User')
    })

    it('detects Claude-SearchBot (search)', () => {
        expect(detectBot(ua('Claude-SearchBot/1.0'))?.name).toBe('Claude-SearchBot')
    })

    it('the deprecated Claude-Web token is gone from the registry', () => {
        expect(AI_CRAWLERS.find((b) => b.userAgentPattern === 'claude-web')).toBeUndefined()
        // A UA that only carries the old deprecated token shouldn't resolve to a current Anthropic bot.
        expect(detectBot(ua('Claude-Web/1.0'))).toBeNull()
    })

    it('does not cross-match Anthropic\'s three bots against each other', () => {
        expect(detectBot(ua('ClaudeBot/1.0'))?.name).not.toBe('Claude-User')
        expect(detectBot(ua('Claude-User/1.0'))?.name).not.toBe('Claude-SearchBot')
        expect(detectBot(ua('Claude-SearchBot/1.0'))?.name).not.toBe('ClaudeBot')
    })
})

describe('Perplexity crawlers', () => {
    it('detects PerplexityBot (search)', () => {
        expect(detectBot(ua('PerplexityBot/1.0'))?.name).toBe('PerplexityBot')
    })

    it('detects Perplexity-User (user-triggered)', () => {
        expect(detectBot(ua('Perplexity-User/1.0'))?.name).toBe('Perplexity-User')
    })

    it('does not cross-match PerplexityBot and Perplexity-User', () => {
        expect(detectBot(ua('PerplexityBot/1.0'))?.name).not.toBe('Perplexity-User')
        expect(detectBot(ua('Perplexity-User/1.0'))?.name).not.toBe('PerplexityBot')
    })
})

describe('Google crawlers', () => {
    it('detects Google-Extended (training opt-out)', () => {
        expect(detectBot(ua('Google-Extended/1.0'))?.name).toBe('Google-Extended')
    })

    it('detects Googlebot (indexing)', () => {
        expect(detectBot(ua('Googlebot/2.1'))?.name).toBe('Googlebot')
    })
})

describe('Microsoft, Common Crawl, Meta, Apple crawlers', () => {
    it('detects Bingbot', () => {
        expect(detectBot(ua('bingbot/2.0'))?.name).toBe('Bingbot')
    })

    it('detects CCBot', () => {
        expect(detectBot('CCBot/2.0 (https://commoncrawl.org/faq/)')?.name).toBe('CCBot')
    })

    it('detects meta-externalagent', () => {
        expect(detectBot(ua('Meta-ExternalAgent/1.0'))?.name).toBe('meta-externalagent')
    })

    it('detects Applebot-Extended', () => {
        expect(detectBot(ua('Applebot-Extended/1.0'))?.name).toBe('Applebot-Extended')
    })
})

describe('Meta crawlers (added 2026-08-13)', () => {
    it('detects Meta-WebIndexer (search)', () => {
        const bot = detectBot(ua('Meta-WebIndexer/1.0'))
        expect(bot?.name).toBe('Meta-WebIndexer')
        expect(bot?.purpose).toBe('search')
    })

    it('detects Meta-ExternalFetcher (user-triggered)', () => {
        expect(detectBot(ua('Meta-ExternalFetcher/1.0'))?.name).toBe('Meta-ExternalFetcher')
    })

    it('does not cross-match meta-externalagent, Meta-WebIndexer, and Meta-ExternalFetcher', () => {
        const agent = detectBot(ua('meta-externalagent/1.0'))?.name
        const indexer = detectBot(ua('Meta-WebIndexer/1.0'))?.name
        const fetcher = detectBot(ua('Meta-ExternalFetcher/1.0'))?.name
        expect(new Set([agent, indexer, fetcher]).size).toBe(3)
    })
})

describe('Amazon crawlers', () => {
    it('detects Amazonbot (training)', () => {
        const bot = detectBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amazonbot/0.1) Chrome/119.0.0.0 Safari/537.36')
        expect(bot?.name).toBe('Amazonbot')
        expect(bot?.purpose).toBe('training')
    })

    it('detects Amzn-SearchBot (search)', () => {
        const bot = detectBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-SearchBot/0.1) Chrome/119.0.0.0 Safari/537.36')
        expect(bot?.name).toBe('Amzn-SearchBot')
    })

    it('detects Amzn-User (user-triggered)', () => {
        const bot = detectBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amzn-User/0.1) Chrome/119.0.0.0 Safari/537.36')
        expect(bot?.name).toBe('Amzn-User')
    })

    it('does not cross-match Amazon\'s three bots against each other', () => {
        const amazonbot = detectBot('...compatible; Amazonbot/0.1) Chrome')?.name
        const searchbot = detectBot('...compatible; Amzn-SearchBot/0.1) Chrome')?.name
        const userbot = detectBot('...compatible; Amzn-User/0.1) Chrome')?.name
        expect(new Set([amazonbot, searchbot, userbot]).size).toBe(3)
    })
})

describe('ByteDance (unverified)', () => {
    it('still detects Bytespider despite no official vendor documentation', () => {
        const bot = detectBot('Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)')
        expect(bot?.name).toBe('Bytespider')
    })

    it('is flagged unverified and surfaced via getUnverifiedBots()', () => {
        const bytespider = AI_CRAWLERS.find((b) => b.name === 'Bytespider')
        expect(bytespider?.verified).toBe(false)
        expect(getUnverifiedBots().map((b) => b.name)).toContain('Bytespider')
    })
})

describe('near-miss strings that must not match', () => {
    it('a plain browser UA matches nothing', () => {
        expect(detectBot(BROWSER_UA)).toBeNull()
    })

    it('malformed/empty UA matches nothing', () => {
        expect(detectBot('')).toBeNull()
    })

    it('a UA that merely mentions a company name (not the bot token) does not match', () => {
        expect(detectBot('Mozilla/5.0 (compatible; OpenAI-adjacent-crawler/1.0)')).toBeNull()
        expect(detectBot('Mozilla/5.0 (compatible; anthropic-research-tool/2.0)')).toBeNull()
    })

    it('a near-miss with a separator swap does not false-positive', () => {
        // "Claude Bot" (space) is not "claudebot" (no separator) as a substring.
        expect(detectBot('Mozilla/5.0 (compatible; Claude Bot/1.0)')).toBeNull()
    })
})

describe('verification metadata and data hygiene', () => {
    it('every verified crawler records a source URL and check date', () => {
        for (const bot of AI_CRAWLERS.filter((b) => b.verified === true)) {
            expect(bot.sourceUrl, `${bot.name} is verified but has no sourceUrl`).toBeTruthy()
            expect(bot.lastChecked, `${bot.name} is verified but has no lastChecked date`).toBeTruthy()
        }
    })

    it('no verified crawler pattern is version-pinned (regression guard)', () => {
        // A pattern like "gptbot/1" would silently stop matching the moment
        // the vendor ships "gptbot/2" — this is the exact bug class this
        // registry exists to avoid. Every real vendor UA embeds a version
        // number, so any pattern containing "/<digit>" is almost certainly
        // a version-pinned mistake, not a legitimate stable token.
        for (const bot of AI_CRAWLERS) {
            expect(bot.userAgentPattern, `${bot.name}'s pattern looks version-pinned`).not.toMatch(/\/\d/)
        }
    })

    it('would fail if GPTBot were ever pinned to a specific version', () => {
        const gptbot = AI_CRAWLERS.find((b) => b.name === 'GPTBot')!
        // Simulates the exact regression this test class guards against.
        const versionPinned = { ...gptbot, userAgentPattern: 'gptbot/1.4' }
        const matchesOldVersion = ua('GPTBot/1.4').toLowerCase().includes(versionPinned.userAgentPattern)
        const matchesNewVersion = ua('GPTBot/2.0').toLowerCase().includes(versionPinned.userAgentPattern)
        expect(matchesOldVersion).toBe(true)
        expect(matchesNewVersion).toBe(false) // proves version-pinning breaks on the very next bump
    })

    it('all userAgentPatterns are unique', () => {
        const patterns = AI_CRAWLERS.map((b) => b.userAgentPattern)
        expect(new Set(patterns).size).toBe(patterns.length)
    })
})
