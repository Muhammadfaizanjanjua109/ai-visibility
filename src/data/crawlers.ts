// ============================================================
// Known AI Crawlers Database
// Kept in one place so all modules share the same source of truth
// ============================================================

import type { BotInfo } from '../types'

export const AI_CRAWLERS: BotInfo[] = [
    {
        name: 'GPTBot',
        company: 'OpenAI',
        userAgentPattern: 'gptbot',
        purpose: 'training',
    },
    {
        name: 'ChatGPT-User',
        company: 'OpenAI',
        userAgentPattern: 'chatgpt-user',
        purpose: 'search',
    },
    {
        name: 'ClaudeBot',
        company: 'Anthropic',
        userAgentPattern: 'claudebot',
        purpose: 'training',
    },
    {
        name: 'Claude-Web',
        company: 'Anthropic',
        userAgentPattern: 'claude-web',
        purpose: 'search',
    },
    {
        name: 'PerplexityBot',
        company: 'Perplexity AI',
        userAgentPattern: 'perplexitybot',
        purpose: 'search',
    },
    {
        name: 'Google-Extended',
        company: 'Google',
        userAgentPattern: 'google-extended',
        purpose: 'training',
    },
    {
        name: 'Googlebot',
        company: 'Google',
        userAgentPattern: 'googlebot',
        purpose: 'indexing',
    },
    {
        name: 'Bingbot',
        company: 'Microsoft',
        userAgentPattern: 'bingbot',
        purpose: 'indexing',
    },
    {
        name: 'CCBot',
        company: 'Common Crawl',
        userAgentPattern: 'ccbot',
        purpose: 'training',
    },
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
        name: 'meta-externalagent',
        company: 'Meta',
        userAgentPattern: 'meta-externalagent',
        purpose: 'training',
    },
    {
        name: 'Applebot-Extended',
        company: 'Apple',
        userAgentPattern: 'applebot-extended',
        purpose: 'training',
    },
    {
        name: 'Diffbot',
        company: 'Diffbot',
        userAgentPattern: 'diffbot',
        purpose: 'indexing',
    },
    {
        name: 'Bytespider',
        company: 'ByteDance',
        userAgentPattern: 'bytespider',
        purpose: 'training',
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
