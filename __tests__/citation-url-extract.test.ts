// ============================================================
// Tests: citation URL/domain extraction (v0.8.0)
// ============================================================

import { describe, it, expect } from 'vitest'
import { extractMarkdownLinkUrls, extractBareDomainMentions, extractSourceRefs, hostnameOf } from '../src/citations/url-extract'

describe('extractMarkdownLinkUrls', () => {
    it('extracts URLs from markdown-style links', () => {
        const text = 'See [G2 reviews](https://g2.com/products/acme) and [Capterra](https://capterra.com/p/acme).'
        expect(extractMarkdownLinkUrls(text)).toEqual(['https://g2.com/products/acme', 'https://capterra.com/p/acme'])
    })

    it('de-duplicates repeated links', () => {
        const text = '[a](https://g2.com/x) [b](https://g2.com/x)'
        expect(extractMarkdownLinkUrls(text)).toEqual(['https://g2.com/x'])
    })

    it('returns [] when there are no markdown links', () => {
        expect(extractMarkdownLinkUrls('No links here, just https://g2.com bare text.')).toEqual([])
    })
})

describe('hostnameOf', () => {
    it('extracts a normalized hostname from a URL', () => {
        expect(hostnameOf('https://WWW.G2.com/products/acme')).toBe('g2.com')
    })

    it('returns undefined for an unparseable URL', () => {
        expect(hostnameOf('not a url')).toBeUndefined()
    })
})

describe('extractBareDomainMentions', () => {
    it('finds known source names mentioned without a URL', () => {
        const refs = extractBareDomainMentions('According to G2 and Reddit, Acme is well liked.', new Set())
        expect(refs).toEqual(expect.arrayContaining([{ domain: 'g2.com' }, { domain: 'reddit.com' }]))
    })

    it('skips domains already covered by excludeDomains', () => {
        const refs = extractBareDomainMentions('According to G2, Acme is well liked.', new Set(['g2.com']))
        expect(refs).toEqual([])
    })

    it('matches whole words only (does not match "greddit" as Reddit)', () => {
        const refs = extractBareDomainMentions('greddit is not a real site', new Set())
        expect(refs.find((r) => r.domain === 'reddit.com')).toBeUndefined()
    })

    it('returns [] when no known names are mentioned', () => {
        expect(extractBareDomainMentions('Nothing relevant here.', new Set())).toEqual([])
    })
})

describe('extractSourceRefs', () => {
    it('combines citedUrls, markdown links, and bare mentions, de-duplicated by domain', () => {
        const rawResponse = 'Great tool, see [reviews](https://g2.com/products/acme). Also mentioned on Reddit.'
        const citedUrls = ['https://acmecrm.com/features']

        const refs = extractSourceRefs(rawResponse, citedUrls)
        const domains = refs.map((r) => r.domain).sort()

        expect(domains).toEqual(['acmecrm.com', 'g2.com', 'reddit.com'])
    })

    it('prefers a real URL over a bare mention for the same domain', () => {
        const rawResponse = 'According to G2, [see here](https://g2.com/products/acme).'
        const refs = extractSourceRefs(rawResponse, [])
        const g2 = refs.find((r) => r.domain === 'g2.com')
        expect(g2?.url).toBe('https://g2.com/products/acme')
        expect(refs.filter((r) => r.domain === 'g2.com')).toHaveLength(1)
    })

    it('leaves url undefined for a domain only ever bare-mentioned', () => {
        const refs = extractSourceRefs('Also on Reddit.', [])
        expect(refs).toEqual([{ domain: 'reddit.com', url: undefined }])
    })
})
