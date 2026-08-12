// ============================================================
// Tests: CitationAnalyzer (v0.8.0)
// ============================================================

import { describe, it, expect } from 'vitest'
import { CitationAnalyzer } from '../src/citations/analyzer'
import { makeMeasurementReport, makePromptResult, makeRun } from './fixtures/measurement-report'

function buildReport() {
    return makeMeasurementReport({
        brand: 'Acme CRM',
        perPrompt: [
            makePromptResult('best CRM software', 'discovery', [
                makeRun({ engine: 'OpenAI', mentioned: true, citedUrls: ['https://acmecrm.com/pricing'], rawResponse: 'Acme CRM is great. See https://acmecrm.com/pricing' }),
                makeRun({ engine: 'OpenAI', run: 2, mentioned: true, rawResponse: 'Acme CRM works well, according to Reddit users.' }),
            ]),
            makePromptResult('Acme CRM vs HubSpot', 'comparison', [
                makeRun({
                    engine: 'OpenAI',
                    mentioned: false,
                    competitorsMentioned: ['HubSpot'],
                    citedUrls: ['https://capterra.com/p/hubspot'],
                    rawResponse: 'HubSpot is popular, see [Capterra reviews](https://capterra.com/p/hubspot)',
                }),
                makeRun({
                    engine: 'OpenAI',
                    run: 2,
                    mentioned: false,
                    competitorsMentioned: ['HubSpot', 'Pipedrive'],
                    rawResponse: 'Compare on TechCrunch: HubSpot vs Pipedrive',
                }),
            ]),
            makePromptResult('cheapest CRM', 'commercial', [
                makeRun({ engine: 'OpenAI', mentioned: true, citedUrls: ['https://g2.com/products/acme'], rawResponse: 'Check G2 for Acme CRM reviews.' }),
                makeRun({
                    engine: 'OpenAI',
                    run: 2,
                    mentioned: false,
                    competitorsMentioned: ['HubSpot'],
                    rawResponse: 'TrustRadius has reviews of HubSpot.',
                }),
            ]),
            makePromptResult('CRM for beginners', 'problem', [
                makeRun({ engine: 'OpenAI', mentioned: true, citedUrls: ['https://producthunt.com/posts/acme'], rawResponse: 'Acme launched on Product Hunt.' }),
                makeRun({
                    engine: 'OpenAI',
                    run: 2,
                    mentioned: false,
                    competitorsMentioned: ['Pipedrive'],
                    citedUrls: ['https://stackoverflow.com/questions/123'],
                    rawResponse: 'See discussion on Stack Overflow about Pipedrive integration.',
                }),
            ]),
            makePromptResult('recommend a CRM', 'recommendation', [
                makeRun({ engine: 'OpenAI', mentioned: true, citedUrls: ['https://medium.com/@author/best-crms'], rawResponse: 'Featured on Medium in a roundup of top CRMs.' }),
            ]),
        ],
    })
}

describe('CitationAnalyzer.analyze', () => {
    it('extracts, classifies, and aggregates sources across all runs', () => {
        const report = new CitationAnalyzer().analyze(buildReport(), 'acmecrm.com')

        expect(report.brand).toBe('Acme CRM')
        expect(report.brandDomain).toBe('acmecrm.com')
        expect(report.totalMentions).toBe(9)

        const byDomain = new Map(report.sources.map((s) => [s.domain, s]))
        expect(byDomain.get('acmecrm.com')?.type).toBe('own-domain')
        expect(byDomain.get('reddit.com')?.type).toBe('forum')
        expect(byDomain.get('capterra.com')?.type).toBe('review-site')
        expect(byDomain.get('techcrunch.com')?.type).toBe('news')
        expect(byDomain.get('g2.com')?.type).toBe('review-site')
        expect(byDomain.get('trustradius.com')?.type).toBe('review-site')
        expect(byDomain.get('producthunt.com')?.type).toBe('marketplace')
        expect(byDomain.get('stackoverflow.com')?.type).toBe('forum')
        expect(byDomain.get('medium.com')?.type).toBe('other')
    })

    it('groups sources by type in sourcesByType, including empty types', () => {
        const report = new CitationAnalyzer().analyze(buildReport(), 'acmecrm.com')

        expect(report.sourcesByType['own-domain'].map((s) => s.domain)).toEqual(['acmecrm.com'])
        expect(report.sourcesByType['review-site'].map((s) => s.domain).sort()).toEqual(['capterra.com', 'g2.com', 'trustradius.com'])
        expect(report.sourcesByType['forum'].map((s) => s.domain).sort()).toEqual(['reddit.com', 'stackoverflow.com'])
        expect(report.sourcesByType['social']).toEqual([])
        expect(report.sourcesByType['comparison-site']).toEqual([])
    })

    it('computes domainCoverage and thirdPartyCoverage from mention share (they sum to 1)', () => {
        const report = new CitationAnalyzer().analyze(buildReport(), 'acmecrm.com')

        expect(report.domainCoverage).toBeCloseTo(1 / 9, 5)
        expect(report.thirdPartyCoverage).toBeCloseTo(8 / 9, 5)
        expect(report.domainCoverage + report.thirdPartyCoverage).toBeCloseTo(1, 10)
    })

    it('lists sources that cite competitors but never the brand', () => {
        const report = new CitationAnalyzer().analyze(buildReport(), 'acmecrm.com')
        const domains = report.topCompetitorSources.map((s) => s.domain).sort()

        expect(domains).toEqual(['capterra.com', 'stackoverflow.com', 'techcrunch.com', 'trustradius.com'])
        for (const source of report.topCompetitorSources) {
            expect(source.mentionsBrand).toBe(false)
            expect(source.mentionsCompetitors.length).toBeGreaterThan(0)
        }

        const techcrunch = report.topCompetitorSources.find((s) => s.domain === 'techcrunch.com')
        expect(techcrunch?.mentionsCompetitors).toEqual(['HubSpot', 'Pipedrive'])
    })

    it('returns zeroed coverage for a report with no citation activity', () => {
        const empty = makeMeasurementReport({ perPrompt: [makePromptResult('p', 'discovery', [])] })
        const report = new CitationAnalyzer().analyze(empty, 'acmecrm.com')

        expect(report.sources).toEqual([])
        expect(report.totalMentions).toBe(0)
        expect(report.domainCoverage).toBe(0)
        expect(report.thirdPartyCoverage).toBe(0)
        expect(report.topCompetitorSources).toEqual([])
    })
})
