// ============================================================
// Tests: competitor gap-reason detection (v0.8.0)
// Every reason must be backed by real data in the fixture — these tests
// check both that a reason fires when the data supports it, and that it
// doesn't when the data doesn't.
// ============================================================

import { describe, it, expect } from 'vitest'
import { classifyImpactByPercentGap, classifyImpactByRatio, detectGapReasons } from '../src/competitor/gap-reasons'
import { makeMeasurementReport, makePromptResult, makeRun, makeVisibility } from './fixtures/measurement-report'

describe('classifyImpactByRatio', () => {
    it('is high when theirs is more than 3x yours', () => {
        expect(classifyImpactByRatio(1, 4)).toBe('high')
    })
    it('is high when yours is 0 and theirs is positive', () => {
        expect(classifyImpactByRatio(0, 5)).toBe('high')
    })
    it('is low when yours and theirs are both 0', () => {
        expect(classifyImpactByRatio(0, 0)).toBe('low')
    })
    it('is medium for a 1.5x-3x ratio', () => {
        expect(classifyImpactByRatio(10, 20)).toBe('medium')
    })
    it('is low for a sub-1.5x ratio', () => {
        expect(classifyImpactByRatio(10, 12)).toBe('low')
    })
})

describe('classifyImpactByPercentGap', () => {
    it('is high for a gap over 30 points', () => {
        expect(classifyImpactByPercentGap(0.31)).toBe('high')
    })
    it('is medium for a 10-30 point gap', () => {
        expect(classifyImpactByPercentGap(0.2)).toBe('medium')
    })
    it('is low for a gap under 10 points', () => {
        expect(classifyImpactByPercentGap(0.05)).toBe('low')
    })
    it('uses the absolute value of the gap', () => {
        expect(classifyImpactByPercentGap(-0.31)).toBe('high')
    })
})

describe('detectGapReasons', () => {
    it('detects a citation gap when the competitor is cited by more unique domains', () => {
        const report = makeMeasurementReport({
            perPrompt: [
                makePromptResult('p1', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: true, citedUrls: ['https://acmecrm.com/a'] })]),
                makePromptResult('p2', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://g2.com/x'] })]),
                makePromptResult('p3', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://capterra.com/x'] })]),
                makePromptResult('p4', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://trustradius.com/x'] })]),
                makePromptResult('p5', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://reddit.com/x'] })]),
            ],
        })

        const reasons = detectGapReasons(report, 'Acme', 'HubSpot')
        const reason = reasons.find((r) => r.id === 'citation-gap')

        expect(reason).toBeDefined()
        expect(reason!.impact).toBe('high')
        expect(reason!.evidence).toBe('HubSpot cited by 4 unique domains, you by 1')
        expect(reason!.reason).toContain('4.0x more independent sources')
    })

    it('detects a prompt-coverage gap when the competitor appears in more clusters', () => {
        const report = makeMeasurementReport({
            perPrompt: [
                makePromptResult('d1', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: true })]),
                makePromptResult('c1', 'comparison', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'] })]),
                makePromptResult('m1', 'commercial', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'] })]),
                makePromptResult('p1', 'problem', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'] })]),
                makePromptResult('r1', 'recommendation', [makeRun({ engine: 'OpenAI', mentioned: true })]),
            ],
        })

        const reasons = detectGapReasons(report, 'Acme', 'HubSpot')
        const reason = reasons.find((r) => r.id === 'prompt-coverage-gap')

        expect(reason).toBeDefined()
        expect(reason!.evidence).toBe('HubSpot appears in 3/5 prompt clusters, you in 2/5')
        expect(reason!.impact).toBe('medium')
        expect(reason!.actionable).toContain('comparison')
    })

    it('detects a recommendation gap from summary/competitor recommendRate', () => {
        const report = makeMeasurementReport({
            summary: makeVisibility({ recommendRate: 0.12 }),
            competitors: { HubSpot: makeVisibility({ recommendRate: 0.58 }) },
            perPrompt: [makePromptResult('p', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: true })])],
        })

        const reasons = detectGapReasons(report, 'Acme', 'HubSpot')
        const reason = reasons.find((r) => r.id === 'recommendation-gap')

        expect(reason).toBeDefined()
        expect(reason!.evidence).toBe('HubSpot recommended in 58% of responses, you in 12%')
        expect(reason!.impact).toBe('high')
        expect(reason!.reason).toContain('4.8x more often')
    })

    it('does not detect a recommendation gap when the competitor is missing from report.competitors', () => {
        const report = makeMeasurementReport({
            summary: makeVisibility({ recommendRate: 0.12 }),
            perPrompt: [makePromptResult('p', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: true })])],
        })

        expect(detectGapReasons(report, 'Acme', 'HubSpot').find((r) => r.id === 'recommendation-gap')).toBeUndefined()
    })

    it('detects an engine-specific gap when the brand is invisible on one engine but visible on another', () => {
        const report = makeMeasurementReport({
            perPrompt: [
                makePromptResult('p1', 'discovery', [
                    makeRun({ engine: 'Perplexity', mentioned: false, competitorsMentioned: ['HubSpot'] }),
                    makeRun({ engine: 'Perplexity', run: 2, mentioned: false, competitorsMentioned: ['HubSpot'] }),
                    makeRun({ engine: 'ChatGPT', mentioned: true }),
                    makeRun({ engine: 'ChatGPT', run: 2, mentioned: true }),
                ]),
            ],
        })

        const reasons = detectGapReasons(report, 'Acme', 'HubSpot')
        const reason = reasons.find((r) => r.id === 'engine-specific-gap')

        expect(reason).toBeDefined()
        expect(reason!.evidence).toBe("You're invisible on Perplexity (0% mention) while visible on ChatGPT (100%)")
        expect(reason!.impact).toBe('high')
        expect(reason!.actionable).toContain('Perplexity')
    })

    it('does not detect an engine-specific gap with only one engine measured', () => {
        const report = makeMeasurementReport({
            perPrompt: [makePromptResult('p1', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'] })])],
        })

        expect(detectGapReasons(report, 'Acme', 'HubSpot').find((r) => r.id === 'engine-specific-gap')).toBeUndefined()
    })

    it('detects a position gap when the competitor is listed first most of the time (min 3 co-mentions)', () => {
        const report = makeMeasurementReport({
            perPrompt: [
                makePromptResult('p1', 'discovery', [
                    makeRun({ engine: 'OpenAI', mentioned: true, competitorsMentioned: ['HubSpot'], position: 2 }),
                    makeRun({ engine: 'OpenAI', run: 2, mentioned: true, competitorsMentioned: ['HubSpot'], position: 2 }),
                    makeRun({ engine: 'OpenAI', run: 3, mentioned: true, competitorsMentioned: ['HubSpot'], position: 1 }),
                    makeRun({ engine: 'OpenAI', run: 4, mentioned: true, competitorsMentioned: ['HubSpot'], position: 2 }),
                ]),
            ],
        })

        const reasons = detectGapReasons(report, 'Acme', 'HubSpot')
        const reason = reasons.find((r) => r.id === 'position-gap')

        expect(reason).toBeDefined()
        expect(reason!.evidence).toBe('When both mentioned, HubSpot listed first 75% of the time')
        expect(reason!.impact).toBe('medium')
    })

    it('does not detect a position gap with fewer than 3 co-mentions', () => {
        const report = makeMeasurementReport({
            perPrompt: [
                makePromptResult('p1', 'discovery', [
                    makeRun({ engine: 'OpenAI', mentioned: true, competitorsMentioned: ['HubSpot'], position: 2 }),
                    makeRun({ engine: 'OpenAI', run: 2, mentioned: true, competitorsMentioned: ['HubSpot'], position: 2 }),
                ]),
            ],
        })

        expect(detectGapReasons(report, 'Acme', 'HubSpot').find((r) => r.id === 'position-gap')).toBeUndefined()
    })

    it('detects a comparison-content gap', () => {
        const report = makeMeasurementReport({
            brand: 'Acme',
            perPrompt: [
                makePromptResult('Acme vs HubSpot', 'comparison', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'] })]),
                makePromptResult('HubSpot alternatives', 'comparison', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'] })]),
                makePromptResult('is Acme better than HubSpot', 'comparison', [makeRun({ engine: 'OpenAI', mentioned: true, competitorsMentioned: ['HubSpot'] })]),
                makePromptResult('Acme or HubSpot', 'comparison', [makeRun({ engine: 'OpenAI', mentioned: false })]),
            ],
        })

        const reasons = detectGapReasons(report, 'Acme', 'HubSpot')
        const reason = reasons.find((r) => r.id === 'comparison-content-gap')

        expect(reason).toBeDefined()
        expect(reason!.evidence).toBe('3 comparison prompts mention HubSpot, 1 mention you')
        expect(reason!.actionable).toBe('Create a comparison page: "Acme vs HubSpot"')
    })

    it('detects a review/social-proof gap', () => {
        const report = makeMeasurementReport({
            perPrompt: [
                makePromptResult('p1', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://g2.com/x'] })]),
                makePromptResult('p2', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://capterra.com/x'] })]),
                makePromptResult('p3', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://reddit.com/x'] })]),
            ],
        })

        const reasons = detectGapReasons(report, 'Acme', 'HubSpot')
        const reason = reasons.find((r) => r.id === 'review-social-proof-gap')

        expect(reason).toBeDefined()
        expect(reason!.evidence).toBe('HubSpot cited from capterra.com, g2.com, reddit.com; you from none')
        expect(reason!.impact).toBe('high')
    })

    it('emits no reasons when the brand and competitor perform equally with no supporting data', () => {
        const report = makeMeasurementReport({
            summary: makeVisibility({ mentionRate: 0.5, recommendRate: 0.2 }),
            competitors: { HubSpot: makeVisibility({ mentionRate: 0.5, recommendRate: 0.2 }) },
            perPrompt: [makePromptResult('p', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: true })])],
        })

        expect(detectGapReasons(report, 'Acme', 'HubSpot')).toEqual([])
    })

    it('sorts reasons by impact descending (high before medium before low)', () => {
        const report = makeMeasurementReport({
            perPrompt: [
                makePromptResult('p1', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: true, citedUrls: ['https://acmecrm.com/a'] })]),
                makePromptResult('p2', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://g2.com/x'] })]),
                makePromptResult('p3', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://capterra.com/x'] })]),
                makePromptResult('p4', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://trustradius.com/x'] })]),
                makePromptResult('p5', 'discovery', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'], citedUrls: ['https://reddit.com/x'] })]),
                makePromptResult('c1', 'comparison', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'] })]),
                makePromptResult('m1', 'commercial', [makeRun({ engine: 'OpenAI', mentioned: false, competitorsMentioned: ['HubSpot'] })]),
                makePromptResult('r1', 'recommendation', [makeRun({ engine: 'OpenAI', mentioned: true })]),
            ],
        })

        const reasons = detectGapReasons(report, 'Acme', 'HubSpot')
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
        const values = reasons.map((r) => order[r.impact])

        expect(reasons.length).toBeGreaterThan(1)
        expect(values).toEqual([...values].sort((a, b) => a - b))
        // At least one high and one non-high impact reason, so the sort is actually exercised.
        expect(values).toContain(0)
        expect(Math.max(...values)).toBeGreaterThan(0)
    })
})
