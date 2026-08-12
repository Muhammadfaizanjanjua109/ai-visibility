// ============================================================
// Tests: `discover` CLI output formatting
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { getChalk } from '../src/cli/lib/chalk'
import { parseCommaList, renderDiscoverReport } from '../src/cli/commands/discover'
import { PromptDiscovery } from '../src/prompts/prompt-discovery'

describe('parseCommaList', () => {
    it('splits, trims, and drops empty entries', () => {
        expect(parseCommaList('HubSpot, Pipedrive ,, Salesforce')).toEqual(['HubSpot', 'Pipedrive', 'Salesforce'])
    })

    it('returns [] for undefined or empty input', () => {
        expect(parseCommaList(undefined)).toEqual([])
        expect(parseCommaList('')).toEqual([])
    })
})

describe('renderDiscoverReport', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('prints every cluster and the total prompt count', async () => {
        const chalk = await getChalk()
        const clusters = new PromptDiscovery().discover({ brand: 'Acme CRM', category: 'CRM software', competitors: ['HubSpot'] })
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderDiscoverReport('Acme CRM', 'CRM software', clusters, chalk)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('PROMPT DISCOVERY')
        expect(output).toContain('Acme CRM — CRM software')
        expect(output).toContain('DISCOVERY')
        expect(output).toContain('COMPARISON')
        expect(output).toContain('COMMERCIAL')
        expect(output).toContain('PROBLEM')
        expect(output).toContain('RECOMMENDATION')

        const totalPrompts = clusters.reduce((sum, c) => sum + c.prompts.length, 0)
        expect(output).toContain(`${totalPrompts} prompts`)
    })

    it('omits the COMPARISON section when there are no competitors', async () => {
        const chalk = await getChalk()
        const clusters = new PromptDiscovery().discover({ brand: 'Acme CRM', category: 'CRM software' })
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderDiscoverReport('Acme CRM', 'CRM software', clusters, chalk)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).not.toContain('COMPARISON')
    })
})
