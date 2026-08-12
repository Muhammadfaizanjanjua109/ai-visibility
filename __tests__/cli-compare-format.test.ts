// ============================================================
// Tests: `compare` CLI output formatting + resolveCompetitors
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { getChalk } from '../src/cli/lib/chalk'
import { renderCompetitorReport, resolveCompetitors } from '../src/cli/commands/compare'
import type { CompetitorReport, GapReason, MeasurementReport } from '../src/types'
import { makeMeasurementReport } from './fixtures/measurement-report'

function reason(overrides: Partial<GapReason> & Pick<GapReason, 'id' | 'impact'>): GapReason {
    return { reason: 'stub reason', evidence: 'stub evidence', actionable: 'stub action', ...overrides }
}

function buildReport(): CompetitorReport {
    return {
        brand: 'Acme CRM',
        competitors: [
            {
                competitor: 'HubSpot',
                visibility: { yours: 0.2, theirs: 0.68, gap: 0.48 },
                reasons: [
                    reason({ id: 'citation-gap', impact: 'high', reason: 'Cited by 4.3x more independent sources', actionable: 'Build presence on G2, Capterra, TrustRadius' }),
                    reason({ id: 'prompt-coverage-gap', impact: 'high', reason: 'Appears in 4/5 prompt clusters vs your 2/5', actionable: 'Create content for: commercial, problem' }),
                    reason({ id: 'position-gap', impact: 'medium', reason: 'Listed first 84% of the time when both mentioned', actionable: 'Improve brand authority and E-E-A-T signals' }),
                ],
            },
            {
                competitor: 'Pipedrive',
                visibility: { yours: 0.2, theirs: 0.41, gap: 0.21 },
                reasons: [],
            },
        ],
        overallGap: { averageGap: 0.345, biggestGap: 'HubSpot', smallestGap: 'Pipedrive' },
    }
}

describe('renderCompetitorReport', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('prints the header, per-competitor gap headline, and grouped reasons', async () => {
        const chalk = await getChalk()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderCompetitorReport(buildReport(), chalk)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain("WHY THEY'RE WINNING")
        expect(output).toContain('Acme CRM vs HubSpot (gap: -48%)')
        expect(output).toContain('Acme CRM vs Pipedrive (gap: -21%)')
        expect(output).toContain('HIGH IMPACT')
        expect(output).toContain('MEDIUM IMPACT')
        expect(output).toContain('Cited by 4.3x more independent sources')
        expect(output).toContain('Build presence on G2, Capterra, TrustRadius')
    })

    it('shows a placeholder for a competitor with no data-backed reasons', async () => {
        const chalk = await getChalk()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderCompetitorReport(buildReport(), chalk)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('No clear data-backed gap reasons found.')
    })
})

describe('resolveCompetitors', () => {
    function report(competitors: string[]): MeasurementReport {
        return makeMeasurementReport({
            competitors: Object.fromEntries(competitors.map((c) => [c, { mentionRate: 0, recommendRate: 0, averagePosition: 0, citationRate: 0, variance: 0, confidence: 0, sampleSize: 0 }])),
            perPrompt: [],
        })
    }

    it('uses the explicit --competitors list when given', () => {
        expect(resolveCompetitors('HubSpot, Pipedrive', report(['Salesforce']))).toEqual(['HubSpot', 'Pipedrive'])
    })

    it('falls back to every competitor already in the report when --competitors is omitted', () => {
        expect(resolveCompetitors(undefined, report(['HubSpot', 'Pipedrive']))).toEqual(['HubSpot', 'Pipedrive'])
    })

    it('returns [] when neither is available', () => {
        expect(resolveCompetitors(undefined, report([]))).toEqual([])
    })
})
