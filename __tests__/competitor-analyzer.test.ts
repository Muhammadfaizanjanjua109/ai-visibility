// ============================================================
// Tests: CompetitorAnalyzer (v0.8.0)
// ============================================================

import { describe, it, expect } from 'vitest'
import { CompetitorAnalyzer } from '../src/competitor/analyzer'
import { makeMeasurementReport, makePromptResult, makeRun, makeVisibility } from './fixtures/measurement-report'

function buildReport() {
    return makeMeasurementReport({
        brand: 'Acme CRM',
        summary: makeVisibility({ mentionRate: 0.2, recommendRate: 0.1 }),
        competitors: {
            HubSpot: makeVisibility({ mentionRate: 0.68, recommendRate: 0.58 }),
            Pipedrive: makeVisibility({ mentionRate: 0.41, recommendRate: 0.3 }),
        },
        perPrompt: [
            makePromptResult('p', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: true, competitorsMentioned: ['HubSpot', 'Pipedrive'] })]),
        ],
    })
}

describe('CompetitorAnalyzer.analyze', () => {
    it('computes visibility.yours/theirs/gap for every competitor', () => {
        const report = new CompetitorAnalyzer().analyze(buildReport(), 'Acme CRM', ['HubSpot', 'Pipedrive'])

        const hubspot = report.competitors.find((c) => c.competitor === 'HubSpot')
        expect(hubspot!.visibility.yours).toBe(0.2)
        expect(hubspot!.visibility.theirs).toBeCloseTo(0.68, 6)
        expect(hubspot!.visibility.gap).toBeCloseTo(0.48, 6)
    })

    it('sorts competitors by gap descending (biggest gap first)', () => {
        const report = new CompetitorAnalyzer().analyze(buildReport(), 'Acme CRM', ['Pipedrive', 'HubSpot'])
        expect(report.competitors.map((c) => c.competitor)).toEqual(['HubSpot', 'Pipedrive'])
    })

    it('summarizes overallGap with averageGap, biggestGap, and smallestGap', () => {
        const report = new CompetitorAnalyzer().analyze(buildReport(), 'Acme CRM', ['HubSpot', 'Pipedrive'])

        expect(report.overallGap.biggestGap).toBe('HubSpot')
        expect(report.overallGap.smallestGap).toBe('Pipedrive')
        expect(report.overallGap.averageGap).toBeCloseTo((0.48 + 0.21) / 2, 6)
    })

    it('treats a competitor missing from report.competitors as 0 visibility rather than throwing', () => {
        const report = new CompetitorAnalyzer().analyze(buildReport(), 'Acme CRM', ['UnknownCo'])
        expect(report.competitors[0]!.visibility.theirs).toBe(0)
    })

    it('returns a null-valued overallGap summary for an empty competitor list', () => {
        const report = new CompetitorAnalyzer().analyze(buildReport(), 'Acme CRM', [])
        expect(report.competitors).toEqual([])
        expect(report.overallGap).toEqual({ averageGap: 0, biggestGap: null, smallestGap: null })
    })

    it('attaches gap reasons to each competitor', () => {
        const report = new CompetitorAnalyzer().analyze(buildReport(), 'Acme CRM', ['HubSpot'])
        expect(Array.isArray(report.competitors[0]!.reasons)).toBe(true)
    })
})
