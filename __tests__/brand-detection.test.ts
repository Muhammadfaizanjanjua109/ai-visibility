// ============================================================
// Tests: brand/competitor detection heuristics (v0.7.0)
// ============================================================

import { describe, it, expect } from 'vitest'
import { analyzeEntities } from '../src/measure/brand-detection'

describe('analyzeEntities: mention detection', () => {
    it('is case-insensitive, matching common casing variants', () => {
        const outcomes = analyzeEntities('I would go with Hubspot for this.', [], ['HubSpot'])
        expect(outcomes.get('HubSpot')?.mentioned).toBe(true)
    })

    it('marks a name as not mentioned when absent', () => {
        const outcomes = analyzeEntities('Pipedrive is a solid pick.', [], ['HubSpot'])
        expect(outcomes.get('HubSpot')?.mentioned).toBe(false)
        expect(outcomes.get('HubSpot')?.position).toBeNull()
    })
})

describe('analyzeEntities: position', () => {
    it('ranks names by first-mention order within the response', () => {
        const text = 'For CRMs, Pipedrive is decent, but HubSpot is the most popular, and Acme CRM is a newer option.'
        const outcomes = analyzeEntities(text, [], ['Acme CRM', 'HubSpot', 'Pipedrive'])
        expect(outcomes.get('Pipedrive')?.position).toBe(1)
        expect(outcomes.get('HubSpot')?.position).toBe(2)
        expect(outcomes.get('Acme CRM')?.position).toBe(3)
    })
})

describe('analyzeEntities: recommendation heuristic', () => {
    it('flags a mention as recommended when a recommend-context keyword is nearby', () => {
        const text = 'There are many CRMs. I would recommend HubSpot for growing teams. It has great support.'
        const outcomes = analyzeEntities(text, [], ['HubSpot'])
        expect(outcomes.get('HubSpot')?.recommended).toBe(true)
    })

    it('does not flag a mention as recommended with no nearby recommend-context keyword', () => {
        const text = 'HubSpot was founded in 2006. It is based in Cambridge, Massachusetts.'
        const outcomes = analyzeEntities(text, [], ['HubSpot'])
        expect(outcomes.get('HubSpot')?.recommended).toBe(false)
    })

    it('a mention never marked recommended if the brand is never mentioned at all', () => {
        const text = 'I would recommend a good CRM for your team.'
        const outcomes = analyzeEntities(text, [], ['HubSpot'])
        expect(outcomes.get('HubSpot')?.mentioned).toBe(false)
        expect(outcomes.get('HubSpot')?.recommended).toBe(false)
    })
})

describe('analyzeEntities: citation domain matching', () => {
    it('marks cited when a cited URL hostname contains the brand name slug', () => {
        const outcomes = analyzeEntities('HubSpot is popular.', ['https://www.hubspot.com/pricing'], ['HubSpot'])
        expect(outcomes.get('HubSpot')?.cited).toBe(true)
    })

    it('does not mark cited when no URL matches the brand slug', () => {
        const outcomes = analyzeEntities('HubSpot is popular.', ['https://unrelated.example/page'], ['HubSpot'])
        expect(outcomes.get('HubSpot')?.cited).toBe(false)
    })

    it('handles malformed URLs without throwing', () => {
        expect(() => analyzeEntities('HubSpot is popular.', ['not a url'], ['HubSpot'])).not.toThrow()
    })
})
