// ============================================================
// Citation URL/domain extraction (v0.8.0)
// Builds on the URL extraction already done in engines/shared.ts
// (RunResult.citedUrls) by also pulling markdown-style links and
// known-domain bare mentions ("according to G2") out of the raw response
// text — see docs/measurement.md for how citedUrls itself is populated.
// ============================================================

import { KNOWN_SOURCE_NAMES, normalizeDomain } from './source-classify'

export interface ExtractedRef {
    domain: string
    url?: string
}

/** Matches `[text](https://...)` markdown links. */
const MARKDOWN_LINK_RE = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g

/** Extracts and de-duplicates URLs from markdown-style links, trimming common trailing punctuation. */
export function extractMarkdownLinkUrls(text: string): string[] {
    const urls: string[] = []
    let match: RegExpExecArray | null
    MARKDOWN_LINK_RE.lastIndex = 0
    while ((match = MARKDOWN_LINK_RE.exec(text)) !== null) {
        urls.push(match[2].replace(/[.,;:!?]+$/, ''))
    }
    return [...new Set(urls)]
}

/** Hostname of a URL, normalized (lowercased, `www.` stripped). `undefined` if `url` doesn't parse. */
export function hostnameOf(url: string): string | undefined {
    try {
        return normalizeDomain(new URL(url).hostname)
    } catch {
        return undefined
    }
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Finds known sources (e.g. "G2", "Reddit", "TechCrunch") mentioned by name
 * in `text` with no accompanying URL. `excludeDomains` skips names whose
 * domain was already found via a real URL, so a response with both a
 * "[G2](https://g2.com/...)" link and the word "G2" elsewhere doesn't
 * double-count.
 */
export function extractBareDomainMentions(text: string, excludeDomains: Set<string>): ExtractedRef[] {
    const found: ExtractedRef[] = []
    const seen = new Set<string>()

    for (const { name, domain } of KNOWN_SOURCE_NAMES) {
        if (excludeDomains.has(domain) || seen.has(domain)) continue
        const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i')
        if (re.test(text)) {
            found.push({ domain })
            seen.add(domain)
        }
    }

    return found
}

/**
 * Combines an engine response's already-extracted `citedUrls`, markdown
 * links found in the raw response text, and known-domain bare mentions into
 * one de-duplicated (by domain) list of source references.
 */
export function extractSourceRefs(rawResponse: string, citedUrls: string[]): ExtractedRef[] {
    const refs = new Map<string, ExtractedRef>()

    const addUrl = (url: string): void => {
        const domain = hostnameOf(url)
        if (!domain) return
        const existing = refs.get(domain)
        if (existing) {
            if (!existing.url) existing.url = url
        } else {
            refs.set(domain, { domain, url })
        }
    }

    for (const url of citedUrls) addUrl(url)
    for (const url of extractMarkdownLinkUrls(rawResponse)) addUrl(url)

    for (const bare of extractBareDomainMentions(rawResponse, new Set(refs.keys()))) {
        if (!refs.has(bare.domain)) refs.set(bare.domain, bare)
    }

    return [...refs.values()]
}
