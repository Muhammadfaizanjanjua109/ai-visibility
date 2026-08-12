// ============================================================
// Tests: `citations` CLI output formatting
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { getChalk } from '../src/cli/lib/chalk'
import { renderCitationReport } from '../src/cli/commands/citations'
import type { CitationReport, CitationSource } from '../src/types'

function source(overrides: Partial<CitationSource> & { domain: string; type: CitationSource['type'] }): CitationSource {
    return { mentions: 1, mentionsBrand: false, mentionsCompetitors: [], firstSeen: 'discovery', ...overrides }
}

function buildReport(): CitationReport {
    const sources: CitationSource[] = [
        source({ domain: 'acmecrm.com', type: 'own-domain', mentions: 11, mentionsBrand: true }),
        source({ domain: 'reddit.com', type: 'forum', mentions: 8, mentionsBrand: true }),
        source({ domain: 'g2.com', type: 'review-site', mentions: 5, mentionsBrand: true }),
        source({ domain: 'producthunt.com', type: 'marketplace', mentions: 3, mentionsBrand: true }),
        source({ domain: 'medium.com', type: 'other', mentions: 2, mentionsBrand: true }),
        source({ domain: 'capterra.com', type: 'review-site', mentions: 2, mentionsCompetitors: ['HubSpot', 'Pipedrive'] }),
        source({ domain: 'trustradius.com', type: 'review-site', mentions: 1, mentionsCompetitors: ['HubSpot'] }),
        source({ domain: 'techcrunch.com', type: 'news', mentions: 1, mentionsCompetitors: ['HubSpot', 'Pipedrive'] }),
        source({ domain: 'stackoverflow.com', type: 'forum', mentions: 1, mentionsCompetitors: ['Pipedrive'] }),
    ]

    return {
        brand: 'Acme CRM',
        brandDomain: 'acmecrm.com',
        sources,
        sourcesByType: {
            'own-domain': [sources[0]!],
            'review-site': [sources[2]!, sources[5]!, sources[6]!],
            'comparison-site': [],
            news: [sources[7]!],
            forum: [sources[1]!, sources[8]!],
            social: [],
            documentation: [],
            marketplace: [sources[3]!],
            other: [sources[4]!],
        },
        totalMentions: 34,
        domainCoverage: 0.28,
        thirdPartyCoverage: 0.72,
        topCompetitorSources: [sources[5]!, sources[6]!, sources[7]!, sources[8]!],
    }
}

describe('renderCitationReport', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('prints the header, source table, coverage split, and competitor-only sources', async () => {
        const chalk = await getChalk()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderCitationReport(buildReport(), chalk, false)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('CITATION INTELLIGENCE')
        expect(output).toContain('Brand:')
        expect(output).toContain('Acme CRM')
        expect(output).toContain('Domain:')
        expect(output).toContain('acmecrm.com')
        expect(output).toContain('WHERE AI LEARNS ABOUT YOU')
        expect(output).toContain('acmecrm.com')
        expect(output).toContain('reddit.com')
        expect(output).toContain('YOUR DOMAIN COVERAGE: 28%')
        expect(output).toContain('THIRD-PARTY COVERAGE: 72%')
        expect(output).toContain('SOURCES CITING COMPETITORS BUT NOT YOU')
        expect(output).toContain('capterra.com')
        expect(output).toContain('HubSpot, Pipedrive')
    })

    it('caps the source table at 10 by default, with a note about --verbose', async () => {
        const chalk = await getChalk()
        const report = buildReport()
        report.sources = Array.from({ length: 15 }, (_, i) => source({ domain: `site${i}.com`, type: 'other', mentions: 1 }))
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderCitationReport(report, chalk, false)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('and 5 more')
        expect(output).not.toContain('site14.com')
    })

    it('shows every source with --verbose', async () => {
        const chalk = await getChalk()
        const report = buildReport()
        report.sources = Array.from({ length: 15 }, (_, i) => source({ domain: `site${i}.com`, type: 'other', mentions: 1 }))
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderCitationReport(report, chalk, true)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('site14.com')
        expect(output).not.toContain('more (--verbose')
    })

    it('shows a placeholder when there are no competitor-only sources', async () => {
        const chalk = await getChalk()
        const report = buildReport()
        report.topCompetitorSources = []
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderCitationReport(report, chalk, false)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('(none found)')
    })
})
