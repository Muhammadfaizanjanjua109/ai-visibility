// ============================================================
// Tests: root barrel backward compatibility
//
// The subpath exports added in 0.3.0 (ai-visibility/detector, /schema,
// /generators, /express, /next) must not change what importing from the
// package root gives you. Existing 0.2.x code has to keep working unchanged.
// ============================================================

import { describe, it, expect } from 'vitest'
import * as AiVisibility from '../src/index'

describe('root barrel exports (backward compatibility)', () => {
    it('exposes the full public value surface unchanged', () => {
        const valueExportNames = Object.keys(AiVisibility).sort()

        expect(valueExportNames).toEqual(
            [
                'AIBotDetector',
                'AIVisitorLogger',
                'ContentAnalyzer',
                'Dashboard',
                'HTMLOptimizer',
                'LLMSTextGenerator',
                'RobotsGenerator',
                'SchemaBuilder',
                'createAIMiddleware',
                'createDashboard',
                'optimizeResponseForAI',
            ].sort()
        )
    })

    it('all exported values are classes or functions', () => {
        for (const [name, value] of Object.entries(AiVisibility)) {
            expect(typeof value === 'function', `${name} should be a class or function`).toBe(true)
        }
    })
})
