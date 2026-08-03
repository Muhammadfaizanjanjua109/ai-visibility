// ============================================================
// Known AI Crawlers Database
// Kept in one place so all modules share the same source of truth
//
// Every entry marked `verified: true` was checked against the vendor's own
// published documentation (not a third-party SEO-blog list) on `lastChecked`.
// Entries without `verified`/`sourceUrl`/`lastChecked` haven't been through
// that audit yet — that's an honest gap, not a claim that they're wrong.
// `verified: false` (Bytespider) means the opposite of "not yet audited": it
// was checked, and no official vendor documentation exists at all.
//
// Patterns match on a stable substring only — never a version number
// (vendor UAs embed one, e.g. "GPTBot/1.4", and it changes over time).
// ============================================================

import type { BotInfo } from '../types'

export const AI_CRAWLERS: BotInfo[] = [
    // ---- OpenAI ----
    // https://developers.openai.com/api/docs/bots (checked 2026-08-03)
    {
        name: 'GPTBot',
        company: 'OpenAI',
        userAgentPattern: 'gptbot',
        purpose: 'training',
        verified: true,
        sourceUrl: 'https://developers.openai.com/api/docs/bots',
        lastChecked: '2026-08-03',
    },
    {
        name: 'ChatGPT-User',
        company: 'OpenAI',
        userAgentPattern: 'chatgpt-user',
        purpose: 'search',
        verified: true,
        sourceUrl: 'https://developers.openai.com/api/docs/bots',
        lastChecked: '2026-08-03',
    },
    {
        name: 'OAI-SearchBot',
        company: 'OpenAI',
        userAgentPattern: 'oai-searchbot',
        purpose: 'search',
        verified: true,
        sourceUrl: 'https://developers.openai.com/api/docs/bots',
        lastChecked: '2026-08-03',
    },

    // ---- Anthropic ----
    // https://support.claude.com/en/articles/8896518 (checked 2026-08-03)
    // Anthropic's predecessor tokens Claude-Web and ANTHROPIC-AI are
    // explicitly deprecated per Anthropic — do not reintroduce them.
    {
        name: 'ClaudeBot',
        company: 'Anthropic',
        userAgentPattern: 'claudebot',
        purpose: 'training',
        verified: true,
        sourceUrl: 'https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',
        lastChecked: '2026-08-03',
    },
    {
        name: 'Claude-User',
        company: 'Anthropic',
        userAgentPattern: 'claude-user',
        purpose: 'search',
        verified: true,
        sourceUrl: 'https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',
        lastChecked: '2026-08-03',
    },
    {
        name: 'Claude-SearchBot',
        company: 'Anthropic',
        userAgentPattern: 'claude-searchbot',
        purpose: 'search',
        verified: true,
        sourceUrl: 'https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler',
        lastChecked: '2026-08-03',
    },

    // ---- Perplexity ----
    // https://docs.perplexity.ai/guides/bots (checked 2026-08-03)
    {
        name: 'PerplexityBot',
        company: 'Perplexity AI',
        userAgentPattern: 'perplexitybot',
        purpose: 'search',
        verified: true,
        sourceUrl: 'https://docs.perplexity.ai/guides/bots',
        lastChecked: '2026-08-03',
    },
    {
        name: 'Perplexity-User',
        company: 'Perplexity AI',
        userAgentPattern: 'perplexity-user',
        purpose: 'search',
        verified: true,
        sourceUrl: 'https://docs.perplexity.ai/guides/bots',
        lastChecked: '2026-08-03',
    },

    // ---- Google ----
    // https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers (checked 2026-08-03)
    {
        name: 'Google-Extended',
        company: 'Google',
        userAgentPattern: 'google-extended',
        purpose: 'training',
        verified: true,
        sourceUrl: 'https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers',
        lastChecked: '2026-08-03',
    },
    {
        name: 'Googlebot',
        company: 'Google',
        userAgentPattern: 'googlebot',
        purpose: 'indexing',
        verified: true,
        sourceUrl: 'https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers',
        lastChecked: '2026-08-03',
    },

    // ---- Microsoft ----
    // https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0 (checked 2026-08-03)
    {
        name: 'Bingbot',
        company: 'Microsoft',
        userAgentPattern: 'bingbot',
        purpose: 'indexing',
        verified: true,
        sourceUrl: 'https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0',
        lastChecked: '2026-08-03',
    },

    // ---- Common Crawl ----
    // https://commoncrawl.org/ccbot (checked 2026-08-03)
    {
        name: 'CCBot',
        company: 'Common Crawl',
        userAgentPattern: 'ccbot',
        purpose: 'training',
        verified: true,
        sourceUrl: 'https://commoncrawl.org/ccbot',
        lastChecked: '2026-08-03',
    },

    // ---- Amazon ----
    // https://developer.amazon.com/amazonbot (checked 2026-08-03)
    // Amazon runs the same three-tier split as OpenAI/Anthropic/Perplexity:
    // a training crawler, a search-surfacing crawler, and a user-triggered
    // fetcher (for Alexa). Amzn-SearchBot/Amzn-User explicitly do not crawl
    // for AI model training per Amazon's own docs.
    {
        name: 'Amazonbot',
        company: 'Amazon',
        userAgentPattern: 'amazonbot',
        purpose: 'training',
        verified: true,
        sourceUrl: 'https://developer.amazon.com/amazonbot',
        lastChecked: '2026-08-03',
    },
    {
        name: 'Amzn-SearchBot',
        company: 'Amazon',
        userAgentPattern: 'amzn-searchbot',
        purpose: 'search',
        verified: true,
        sourceUrl: 'https://developer.amazon.com/amazonbot',
        lastChecked: '2026-08-03',
    },
    {
        name: 'Amzn-User',
        company: 'Amazon',
        userAgentPattern: 'amzn-user',
        purpose: 'search',
        verified: true,
        sourceUrl: 'https://developer.amazon.com/amazonbot',
        lastChecked: '2026-08-03',
    },

    // ---- Meta ----
    // https://developers.facebook.com/docs/sharing/webmasters/crawler (checked 2026-08-03)
    {
        name: 'meta-externalagent',
        company: 'Meta',
        userAgentPattern: 'meta-externalagent',
        purpose: 'training',
        verified: true,
        sourceUrl: 'https://developers.facebook.com/docs/sharing/webmasters/crawler',
        lastChecked: '2026-08-03',
    },

    // ---- Apple ----
    // https://support.apple.com/en-us/119829 (checked 2026-08-03)
    {
        name: 'Applebot-Extended',
        company: 'Apple',
        userAgentPattern: 'applebot-extended',
        purpose: 'training',
        verified: true,
        sourceUrl: 'https://support.apple.com/en-us/119829',
        lastChecked: '2026-08-03',
    },

    // ---- ByteDance ----
    // No official ByteDance documentation exists for this crawler as of the
    // last check — every source is third-party. Included because the token
    // is real and widely observed, but flagged unverified rather than
    // presented with the same confidence as the entries above.
    {
        name: 'Bytespider',
        company: 'ByteDance',
        userAgentPattern: 'bytespider',
        purpose: 'training',
        verified: false,
        lastChecked: '2026-08-03',
    },

    // ---- Not re-verified this audit pass ----
    // Present in earlier versions of this list; left as-is rather than
    // guessed at. Re-verify against vendor docs before trusting purpose/name.
    {
        name: 'YouBot',
        company: 'You.com',
        userAgentPattern: 'youbot',
        purpose: 'search',
    },
    {
        name: 'cohere-ai',
        company: 'Cohere',
        userAgentPattern: 'cohere-ai',
        purpose: 'training',
    },
    {
        name: 'Diffbot',
        company: 'Diffbot',
        userAgentPattern: 'diffbot',
        purpose: 'indexing',
    },
]

/**
 * Detect which AI bot is making the request based on User-Agent string.
 * Returns the BotInfo if matched, null otherwise.
 */
export function detectBot(userAgent: string): BotInfo | null {
    if (!userAgent) return null
    const ua = userAgent.toLowerCase()
    return AI_CRAWLERS.find((bot) => ua.includes(bot.userAgentPattern)) ?? null
}

/**
 * Get all known bot names (for robots.txt generation, etc.)
 */
export function getAllBotNames(): string[] {
    return AI_CRAWLERS.map((b) => b.name)
}

/**
 * Get bots by purpose
 */
export function getBotsByPurpose(
    purpose: BotInfo['purpose']
): BotInfo[] {
    return AI_CRAWLERS.filter((b) => b.purpose === purpose)
}

/**
 * Get bots whose user-agent token has NOT been confirmed against the
 * vendor's own documentation — either because no official documentation
 * exists (e.g. Bytespider) or because this entry predates the verification
 * audit and hasn't been rechecked yet. Surface this in UIs/logs so users
 * can judge how much to trust a given match.
 */
export function getUnverifiedBots(): BotInfo[] {
    return AI_CRAWLERS.filter((b) => b.verified !== true)
}
