// ============================================================
// Tests: `measure` CLI output formatting
// Builds a MeasurementReport fixture directly (no engines/network involved)
// to test rendering in isolation from the Measurement Engine itself.
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { getChalk } from '../src/cli/lib/chalk'
import { renderMeasureReport } from '../src/cli/commands/measure'
import type { MeasurementReport } from '../src/types'

function buildReport(): MeasurementReport {
    return {
        brand: 'Acme CRM',
        timestamp: Date.now(),
        summary: { mentionRate: 0.23, recommendRate: 0.12, averagePosition: 2.1, citationRate: 0.1, variance: 0.05, confidence: 0.084, sampleSize: 69 },
        competitors: {
            HubSpot: { mentionRate: 0.71, recommendRate: 0.58, averagePosition: 1.2, citationRate: 0.3, variance: 0.02, confidence: 0.042, sampleSize: 69 },
            Pipedrive: { mentionRate: 0.44, recommendRate: 0.31, averagePosition: 1.8, citationRate: 0.2, variance: 0.03, confidence: 0.061, sampleSize: 69 },
        },
        perEngine: {
            OpenAI: { engine: 'OpenAI', mentionRate: 0.18, recommendRate: 0.1, citationRate: 0.05, variance: 0.03 },
        },
        perPrompt: [
            {
                prompt: 'best CRM software',
                cluster: 'discovery',
                runs: [
                    { engine: 'OpenAI', run: 1, mentioned: true, recommended: false, position: 2, citedUrls: [], competitorsMentioned: ['HubSpot'], rawResponse: 'x' },
                ],
                aggregated: { mentionRate: 1, recommendRate: 0, variance: 0 },
            },
        ],
        stats: { totalQueries: 23, totalRuns: 69, enginesUsed: ['OpenAI'], durationMs: 272000, failedRuns: 0 },
    }
}

describe('renderMeasureReport', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('prints the header, both rate sections, per-engine breakdown, and footer stats', async () => {
        const chalk = await getChalk()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderMeasureReport(buildReport(), chalk)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('AI VISIBILITY MEASUREMENT')
        expect(output).toContain('Brand:')
        expect(output).toContain('Acme CRM')
        expect(output).toContain('Engines:')
        expect(output).toContain('OpenAI')
        expect(output).toContain('OVERALL VISIBILITY')
        expect(output).toContain('RECOMMENDATION RATE')
        expect(output).toContain('PER ENGINE')
        expect(output).toContain('23%')
        expect(output).toContain('71%')
        expect(output).toContain('Sample size:')
        expect(output).toContain('69 queries')
        expect(output).toContain('Confidence: 95%')
        expect(output).toContain('Duration: 4m 32s')
    })

    it('flags failed runs in the sample-size line when present', async () => {
        const chalk = await getChalk()
        const report = buildReport()
        report.stats.failedRuns = 3
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderMeasureReport(report, chalk)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('3 failed')
    })

    it('omits the failed-runs note when there are none', async () => {
        const chalk = await getChalk()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderMeasureReport(buildReport(), chalk)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).not.toContain('failed)')
    })
})
