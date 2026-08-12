// ============================================================
// ai-visibility/citations
// Zero-dependency: analyzes a v0.7.0 MeasurementReport to find where AI
// engines cite information about a brand. Pairs with ai-visibility/measure
// and ai-visibility/competitor.
// ============================================================

export { CitationAnalyzer } from '../citations/analyzer'
export { classifySource, normalizeDomain, KNOWN_SOURCE_NAMES } from '../citations/source-classify'
export { extractSourceRefs, extractMarkdownLinkUrls, extractBareDomainMentions, hostnameOf } from '../citations/url-extract'
export type { ExtractedRef } from '../citations/url-extract'
export type { SourceType, CitationSource, CitationReport } from '../types'
