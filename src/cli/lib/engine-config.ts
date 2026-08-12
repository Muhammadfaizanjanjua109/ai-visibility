// ============================================================
// CLI: BYOK engine configuration loader
// Builds EngineAdapter instances from crawlpod.config.js (best-effort,
// same "missing is fine" pattern as audit.ts's fetchTextFile) merged with
// CRAWLPOD_*_KEY env vars. Only engines that end up with an apiKey are
// returned — this is what "only configured engines are used" means.
// ============================================================

import path from 'path'
import { OpenAIAdapter } from '../../engines/openai-adapter'
import { PerplexityAdapter } from '../../engines/perplexity-adapter'
import { GeminiAdapter } from '../../engines/gemini-adapter'
import { AnthropicAdapter } from '../../engines/anthropic-adapter'
import type { CrawlpodConfigFile, EngineAdapter, EngineConfigEntry } from '../../types'

export const ENGINE_ENV_VARS: Record<EngineAdapter['slug'], string> = {
    openai: 'CRAWLPOD_OPENAI_KEY',
    perplexity: 'CRAWLPOD_PERPLEXITY_KEY',
    gemini: 'CRAWLPOD_GEMINI_KEY',
    anthropic: 'CRAWLPOD_ANTHROPIC_KEY',
}

export const CONFIG_FILE_NAME = 'crawlpod.config.js'

/** Best-effort require() of crawlpod.config.js from `cwd`. Missing file, or any load error, is silently `undefined` — never throws. */
export function loadConfigFile(cwd: string): CrawlpodConfigFile | undefined {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const loaded = require(path.join(cwd, CONFIG_FILE_NAME))
        return (loaded?.default ?? loaded) as CrawlpodConfigFile
    } catch {
        return undefined
    }
}

function resolveEntry(slug: EngineAdapter['slug'], configFile: CrawlpodConfigFile | undefined): EngineConfigEntry {
    const fromConfig = configFile?.engines?.[slug]
    return {
        apiKey: fromConfig?.apiKey ?? process.env[ENGINE_ENV_VARS[slug]],
        model: fromConfig?.model,
        temperature: fromConfig?.temperature,
        maxTokens: fromConfig?.maxTokens,
    }
}

/** Builds one `EngineAdapter` per configured engine (constructor `apiKey`/env var/config file, in that lookup order). Returns `[]` if nothing is configured. */
export function loadConfiguredEngines(cwd: string = process.cwd()): EngineAdapter[] {
    const configFile = loadConfigFile(cwd)
    const adapters: EngineAdapter[] = []

    const openai = resolveEntry('openai', configFile)
    if (openai.apiKey) adapters.push(new OpenAIAdapter(openai.apiKey, openai))

    const perplexity = resolveEntry('perplexity', configFile)
    if (perplexity.apiKey) adapters.push(new PerplexityAdapter(perplexity.apiKey, perplexity))

    const gemini = resolveEntry('gemini', configFile)
    if (gemini.apiKey) adapters.push(new GeminiAdapter(gemini.apiKey, gemini))

    const anthropic = resolveEntry('anthropic', configFile)
    if (anthropic.apiKey) adapters.push(new AnthropicAdapter(anthropic.apiKey, anthropic))

    return adapters
}

export function noEnginesConfiguredMessage(): string {
    const envVarList = Object.values(ENGINE_ENV_VARS).map((v) => `  ${v}=...`).join('\n')
    return [
        'No AI engines configured.',
        '',
        'Set one or more of these environment variables:',
        envVarList,
        '',
        `Or create a ${CONFIG_FILE_NAME} in your project root:`,
        '  module.exports = {',
        '    engines: {',
        "      openai: { apiKey: '...', model: 'gpt-4o-mini' },",
        '      // only configure the engines you want to use',
        '    },',
        '  }',
    ].join('\n')
}
