// ============================================================
// Tests: CLI BYOK engine configuration loader
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { ENGINE_ENV_VARS, loadConfigFile, loadConfiguredEngines, noEnginesConfiguredMessage } from '../src/cli/lib/engine-config'
import { OpenAIAdapter } from '../src/engines/openai-adapter'

function tmpDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'ai-visibility-engines-'))
}

describe('loadConfiguredEngines', () => {
    let dir: string

    afterEach(() => {
        if (dir) fs.rmSync(dir, { recursive: true, force: true })
        for (const key of Object.values(ENGINE_ENV_VARS)) delete process.env[key]
        vi.unstubAllGlobals()
    })

    it('returns an empty array when nothing is configured', () => {
        dir = tmpDir()
        expect(loadConfiguredEngines(dir)).toEqual([])
    })

    it('picks up an engine from its env var', () => {
        dir = tmpDir()
        process.env.CRAWLPOD_OPENAI_KEY = 'sk-env'
        const engines = loadConfiguredEngines(dir)
        expect(engines).toHaveLength(1)
        expect(engines[0]).toBeInstanceOf(OpenAIAdapter)
    })

    it('only returns engines that end up with an apiKey (config-file-only entries without a key are skipped)', () => {
        dir = tmpDir()
        fs.writeFileSync(path.join(dir, 'crawlpod.config.js'), "module.exports = { engines: { openai: { model: 'gpt-4o' }, perplexity: {} } }")
        expect(loadConfiguredEngines(dir)).toEqual([])
    })

    it('merges a config-file model setting with an env-var-supplied key', () => {
        dir = tmpDir()
        fs.writeFileSync(path.join(dir, 'crawlpod.config.js'), "module.exports = { engines: { openai: { model: 'gpt-4o' } } }")
        process.env.CRAWLPOD_OPENAI_KEY = 'sk-env'
        expect(loadConfiguredEngines(dir)).toHaveLength(1)
    })

    it("an engine's own apiKey in the config file takes priority over the env var", async () => {
        dir = tmpDir()
        fs.writeFileSync(path.join(dir, 'crawlpod.config.js'), "module.exports = { engines: { openai: { apiKey: 'sk-file' } } }")
        process.env.CRAWLPOD_OPENAI_KEY = 'sk-env'

        const fetchMock = vi
            .fn()
            .mockResolvedValue(
                new Response(JSON.stringify({ output: [{ type: 'message', content: [{ type: 'output_text', text: 'ok' }] }] }), { status: 200 })
            )
        vi.stubGlobal('fetch', fetchMock)

        const [engine] = loadConfiguredEngines(dir)
        await engine!.query('hi')
        expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer sk-file')
    })

    it('is tolerant of a missing crawlpod.config.js', () => {
        dir = tmpDir()
        expect(loadConfigFile(dir)).toBeUndefined()
    })

    it('is tolerant of a broken crawlpod.config.js (never throws)', () => {
        dir = tmpDir()
        fs.writeFileSync(path.join(dir, 'crawlpod.config.js'), 'this is not valid javascript {{{')
        expect(loadConfigFile(dir)).toBeUndefined()
        expect(() => loadConfiguredEngines(dir)).not.toThrow()
    })
})

describe('noEnginesConfiguredMessage', () => {
    it('mentions every engine env var and the config file name', () => {
        const message = noEnginesConfiguredMessage()
        for (const envVar of Object.values(ENGINE_ENV_VARS)) expect(message).toContain(envVar)
        expect(message).toContain('crawlpod.config.js')
    })
})
