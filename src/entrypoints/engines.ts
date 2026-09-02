// ============================================================
// ai-visibility/engines
// Zero-dependency (native fetch only): BYOK AI engine adapters.
// ============================================================

export { OpenAIAdapter } from '../engines/openai-adapter'
export { PerplexityAdapter } from '../engines/perplexity-adapter'
export { GeminiAdapter } from '../engines/gemini-adapter'
export { AnthropicAdapter } from '../engines/anthropic-adapter'
export { EngineHttpError, EngineResponseError } from '../engines/shared'
// The citation-evidence seam. Exported so a custom adapter derives
// activation/provenance the same way the shipped four do, rather than
// hand-rolling a fifth interpretation of what a citation is.
export {
    extractUrls,
    retrievedEvidence,
    activatedOpaqueEvidence,
    notActivatedEvidence,
    proseExtractedEvidence,
    buildEngineResponse,
    DEFAULT_MAX_SEARCH_USES,
} from '../engines/shared'
export type { CitationEvidence } from '../engines/shared'
export type {
    EngineAdapter,
    QueryOptions,
    EngineResponse,
    EngineConfigEntry,
    CrawlpodConfigFile,
    CitationProvenance,
    SearchActivation,
    Observed,
} from '../types'
