// ============================================================
// Brand/competitor detection in AI engine responses (v0.7.0)
// Deliberately simple heuristics, not NLP — matching the "don't overthink
// it" guidance for this feature: case-insensitive substring matching for
// mentions, sentence-window keyword proximity for "recommended", and a
// brand-name-as-domain-slug guess for citation matching.
// ============================================================

/** One entity's (brand or competitor) detected outcome within a single response. */
export interface EntityOutcome {
    name: string
    mentioned: boolean
    recommended: boolean
    /** 1-indexed order of first mention among all analyzed names in this response; null if not mentioned. */
    position: number | null
    /** Whether a cited URL appears to belong to this entity's domain (see `isCitedDomain`). */
    cited: boolean
}

const RECOMMEND_KEYWORDS = /\b(recommend(?:ed|s)?|suggest(?:ed|s)?|best|top pick|great choice|excellent|ideal)\b/i

/** Naive sentence splitter — good enough for a proximity heuristic, not meant to handle every abbreviation/edge case. */
function splitSentences(text: string): string[] {
    return text.split(/(?<=[.!?])\s+/).filter(Boolean)
}

function findFirstIndex(text: string, name: string): number {
    return text.toLowerCase().indexOf(name.toLowerCase())
}

/** True if `name` is mentioned in a sentence within 2 sentences of a recommendation-context keyword. */
function isRecommendedContext(sentences: string[], name: string): boolean {
    const lowerName = name.toLowerCase()
    const mentionSentenceIdxs = sentences.reduce<number[]>((acc, s, i) => {
        if (s.toLowerCase().includes(lowerName)) acc.push(i)
        return acc
    }, [])

    return mentionSentenceIdxs.some((i) => {
        const windowStart = Math.max(0, i - 2)
        const windowEnd = Math.min(sentences.length - 1, i + 2)
        const window = sentences.slice(windowStart, windowEnd + 1).join(' ')
        return RECOMMEND_KEYWORDS.test(window)
    })
}

/**
 * Approximates "a URL from this entity's domain was cited" by turning the
 * brand name into an alphanumeric slug (e.g. "Acme CRM" -> "acmecrm") and
 * checking whether any cited URL's hostname contains that slug. Approximate
 * by design — there's no reliable brand->domain mapping without asking the
 * user for one, which is out of scope for v0.7.0 (see docs/measurement.md).
 */
function isCitedDomain(citedUrls: string[], name: string): boolean {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!slug) return false
    return citedUrls.some((url) => {
        try {
            const hostname = new URL(url).hostname.toLowerCase().replace(/[^a-z0-9]/g, '')
            return hostname.includes(slug)
        } catch {
            return false
        }
    })
}

/**
 * Analyzes a single response against every tracked name (brand +
 * competitors) at once, so `position` reflects their relative first-mention
 * order within that one response.
 */
export function analyzeEntities(responseText: string, citedUrls: string[], names: string[]): Map<string, EntityOutcome> {
    const sentences = splitSentences(responseText)

    const firstIndexByName = new Map<string, number>()
    for (const name of names) {
        const idx = findFirstIndex(responseText, name)
        if (idx >= 0) firstIndexByName.set(name, idx)
    }

    const rankedByFirstMention = [...firstIndexByName.entries()].sort((a, b) => a[1] - b[1]).map(([name]) => name)
    const positionByName = new Map(rankedByFirstMention.map((name, i) => [name, i + 1]))

    const outcomes = new Map<string, EntityOutcome>()
    for (const name of names) {
        const mentioned = firstIndexByName.has(name)
        outcomes.set(name, {
            name,
            mentioned,
            recommended: mentioned && isRecommendedContext(sentences, name),
            position: positionByName.get(name) ?? null,
            cited: isCitedDomain(citedUrls, name),
        })
    }
    return outcomes
}
