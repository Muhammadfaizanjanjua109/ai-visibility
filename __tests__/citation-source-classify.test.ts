// ============================================================
// Tests: citation source type classification (v0.8.0)
// ============================================================

import { describe, it, expect } from 'vitest'
import { classifySource, normalizeDomain } from '../src/citations/source-classify'

describe('normalizeDomain', () => {
    it('lowercases and strips a leading www.', () => {
        expect(normalizeDomain('WWW.Example.COM')).toBe('example.com')
        expect(normalizeDomain('example.com')).toBe('example.com')
    })
})

describe('classifySource', () => {
    it('matches the brand domain (and its subdomains) as own-domain', () => {
        expect(classifySource('acmecrm.com', 'acmecrm.com')).toBe('own-domain')
        expect(classifySource('www.acmecrm.com', 'acmecrm.com')).toBe('own-domain')
        expect(classifySource('blog.acmecrm.com', 'acmecrm.com')).toBe('own-domain')
    })

    it('own-domain check takes priority over other classifications', () => {
        // Contrived: brand happens to run their site on a domain that would
        // otherwise match a review-site pattern.
        expect(classifySource('g2.com', 'g2.com')).toBe('own-domain')
    })

    it('classifies review sites', () => {
        for (const domain of ['g2.com', 'capterra.com', 'trustpilot.com', 'trustradius.com', 'getapp.com', 'softwareadvice.com']) {
            expect(classifySource(domain, 'acmecrm.com')).toBe('review-site')
        }
    })

    it('classifies comparison sites', () => {
        for (const domain of ['versus.com', 'alternativeto.net', 'slant.co', 'stackshare.io', 'comparably.com']) {
            expect(classifySource(domain, 'acmecrm.com')).toBe('comparison-site')
        }
    })

    it('classifies news domains, including subdomains', () => {
        expect(classifySource('techcrunch.com', 'acmecrm.com')).toBe('news')
        expect(classifySource('www.forbes.com', 'acmecrm.com')).toBe('news')
        expect(classifySource('amp.theverge.com', 'acmecrm.com')).toBe('news')
    })

    it('classifies forums', () => {
        for (const domain of ['reddit.com', 'quora.com', 'stackoverflow.com', 'news.ycombinator.com']) {
            expect(classifySource(domain, 'acmecrm.com')).toBe('forum')
        }
    })

    it('classifies social platforms', () => {
        for (const domain of ['twitter.com', 'x.com', 'linkedin.com', 'facebook.com', 'youtube.com']) {
            expect(classifySource(domain, 'acmecrm.com')).toBe('social')
        }
    })

    it('classifies documentation by domain pattern', () => {
        expect(classifySource('docs.stripe.com', 'acmecrm.com')).toBe('documentation')
        expect(classifySource('developer.mozilla.org', 'acmecrm.com')).toBe('documentation')
        expect(classifySource('en.wikipedia.org', 'acmecrm.com')).toBe('documentation')
        expect(classifySource('wiki.example.com', 'acmecrm.com')).toBe('documentation')
    })

    it('classifies producthunt.com and wordpress.org as marketplace', () => {
        expect(classifySource('producthunt.com', 'acmecrm.com')).toBe('marketplace')
        expect(classifySource('wordpress.org', 'acmecrm.com')).toBe('marketplace')
    })

    it('classifies shopify.com as marketplace only under /app-store', () => {
        expect(classifySource('shopify.com', 'acmecrm.com', 'https://shopify.com/app-store/some-app')).toBe('marketplace')
        expect(classifySource('shopify.com', 'acmecrm.com', 'https://shopify.com/blog/some-post')).toBe('other')
        expect(classifySource('shopify.com', 'acmecrm.com')).toBe('other')
    })

    it('falls back to other for unrecognized domains', () => {
        expect(classifySource('medium.com', 'acmecrm.com')).toBe('other')
        expect(classifySource('random-blog.example', 'acmecrm.com')).toBe('other')
    })

    it('never returns own-domain when brandDomain is empty', () => {
        expect(classifySource('example.com', '')).not.toBe('own-domain')
    })
})
