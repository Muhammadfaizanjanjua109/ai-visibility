// ============================================================
// Tests: `--from <file>` loading and live-measurement fallback
// (src/cli/lib/report-io.ts, src/cli/lib/report-source.ts)
// ============================================================

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { getChalk } from '../src/cli/lib/chalk'
import { loadReportFromFile } from '../src/cli/lib/report-io'
import { resolveMeasurementReport } from '../src/cli/lib/report-source'
import { makeMeasurementReport, makePromptResult } from './fixtures/measurement-report'

describe('loadReportFromFile', () => {
    let file: string

    afterEach(() => {
        if (file) fs.rmSync(file, { force: true })
    })

    it('parses a saved MeasurementReport JSON file', () => {
        const report = makeMeasurementReport({ brand: 'Acme', perPrompt: [] })
        file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-visibility-from-')), 'report.json')
        fs.writeFileSync(file, JSON.stringify(report))

        expect(loadReportFromFile(file)).toEqual(report)
    })

    it('throws for a missing file', () => {
        expect(() => loadReportFromFile(path.join(os.tmpdir(), 'does-not-exist-ai-visibility.json'))).toThrow()
    })
})

describe('resolveMeasurementReport', () => {
    let file: string
    let originalExitCode: number | undefined

    beforeEach(() => {
        originalExitCode = process.exitCode
        process.exitCode = undefined
    })

    afterEach(() => {
        vi.restoreAllMocks()
        if (file) fs.rmSync(file, { force: true })
        process.exitCode = originalExitCode
    })

    it('loads from --from when given, without touching engine config', async () => {
        const chalk = await getChalk()
        const report = makeMeasurementReport({ brand: 'Acme', perPrompt: [makePromptResult('p', 'discovery', [])] })
        file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ai-visibility-from-')), 'report.json')
        fs.writeFileSync(file, JSON.stringify(report))

        const result = await resolveMeasurementReport({ from: file }, chalk)
        expect(result).toEqual(report)
        expect(process.exitCode).toBeUndefined()
    })

    it('errors and sets exitCode=1 when --from points to a missing file', async () => {
        const chalk = await getChalk()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const result = await resolveMeasurementReport({ from: path.join(os.tmpdir(), 'nope-ai-visibility.json') }, chalk)

        expect(result).toBeNull()
        expect(process.exitCode).toBe(1)
        expect(errorSpy).toHaveBeenCalled()
    })

    it('errors when neither --from nor --brand/--category are given', async () => {
        const chalk = await getChalk()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const result = await resolveMeasurementReport({}, chalk)

        expect(result).toBeNull()
        expect(process.exitCode).toBe(1)
        expect(errorSpy.mock.calls[0]![0]).toContain('--brand and --category')
    })

    it('errors when no engines are configured for a live run', async () => {
        const chalk = await getChalk()
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        const originalEnv = { ...process.env }
        for (const key of Object.keys(process.env)) {
            if (key.startsWith('CRAWLPOD_')) delete process.env[key]
        }

        const result = await resolveMeasurementReport({ brand: 'Acme', category: 'CRM software' }, chalk)

        expect(result).toBeNull()
        expect(process.exitCode).toBe(1)
        expect(errorSpy.mock.calls[0]![0]).toContain('No AI engines configured')

        process.env = originalEnv
    })
})
