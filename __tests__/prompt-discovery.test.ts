// ============================================================
// Tests: Prompt Discovery (v0.7.0)
// ============================================================

import { describe, it, expect } from 'vitest'
import { PromptDiscovery } from '../src/prompts/prompt-discovery'
import { inferVerb } from '../src/prompts/verb-map'

describe('PromptDiscovery.discover', () => {
    const discovery = new PromptDiscovery()

    it('always includes a 5-prompt discovery cluster', () => {
        const clusters = discovery.discover({ brand: 'Acme CRM', category: 'CRM software' })
        const discoveryCluster = clusters.find((c) => c.type === 'discovery')
        expect(discoveryCluster?.prompts).toHaveLength(5)
        expect(discoveryCluster?.prompts[0]).toContain('CRM software')
    })

    it('omits the comparison cluster entirely when there are no competitors', () => {
        const clusters = discovery.discover({ brand: 'Acme CRM', category: 'CRM software' })
        expect(clusters.find((c) => c.type === 'comparison')).toBeUndefined()
    })

    it('generates 4 comparison prompts per competitor', () => {
        const clusters = discovery.discover({ brand: 'Acme CRM', category: 'CRM software', competitors: ['HubSpot', 'Pipedrive'] })
        const comparison = clusters.find((c) => c.type === 'comparison')
        expect(comparison?.prompts).toHaveLength(8)
        expect(comparison?.prompts).toContain('Acme CRM vs HubSpot')
        expect(comparison?.prompts).toContain('Pipedrive alternatives')
    })

    it('caps comparison prompts at 10 even with many competitors', () => {
        const clusters = discovery.discover({
            brand: 'Acme CRM',
            category: 'CRM software',
            competitors: ['HubSpot', 'Pipedrive', 'Salesforce'],
        })
        const comparison = clusters.find((c) => c.type === 'comparison')
        expect(comparison?.prompts).toHaveLength(10)
    })

    it('always includes 5 commercial prompts and 3 recommendation prompts', () => {
        const clusters = discovery.discover({ brand: 'Acme CRM', category: 'CRM software' })
        expect(clusters.find((c) => c.type === 'commercial')?.prompts).toHaveLength(5)
        expect(clusters.find((c) => c.type === 'recommendation')?.prompts).toHaveLength(3)
    })

    it('produces verb-based problem prompts when the category has a verb mapping', () => {
        const clusters = discovery.discover({ brand: 'Acme CRM', category: 'CRM software' })
        const problem = clusters.find((c) => c.type === 'problem')
        expect(problem?.prompts).toHaveLength(5)
        expect(problem?.prompts).toContain('how to manage customer relationships')
    })

    it('falls back to generic problem prompts when the category has no verb mapping', () => {
        const clusters = discovery.discover({ brand: 'Widgetly', category: 'quantum flux calibration tools' })
        const problem = clusters.find((c) => c.type === 'problem')
        expect(problem?.prompts).toHaveLength(5)
        expect(problem?.prompts.some((p) => p.startsWith('how to get started with'))).toBe(true)
        expect(problem?.prompts.some((p) => p.includes('how to '))).toBe(true)
        // still includes the 3 non-verb templates regardless
        expect(problem?.prompts).toContain('quantum flux calibration tools for beginners')
        expect(problem?.prompts).toContain('how to choose a quantum flux calibration tools')
        expect(problem?.prompts).toContain('what to look for in a quantum flux calibration tools')
    })
})

describe('inferVerb', () => {
    it('matches a known category keyword case-insensitively', () => {
        expect(inferVerb('CRM Software')).toBe('manage customer relationships')
        expect(inferVerb('crm')).toBe('manage customer relationships')
    })

    it('returns undefined for an unmapped category', () => {
        expect(inferVerb('quantum flux calibration tools')).toBeUndefined()
    })
})
