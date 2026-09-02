// ============================================================
// Shared TypeScript types for ai-visibility
// ============================================================

// ---- Middleware ----

export interface AIOptimizationOptions {
    /** Remove <script> tags (except JSON-LD schema) */
    stripJs?: boolean
    /** Remove ad-related elements */
    removeAds?: boolean
    /** Remove tracking pixels and analytics */
    removeTracking?: boolean
    /** Simplify navigation to text links */
    simplifyNav?: boolean
    /** Front-load main content */
    structureContent?: boolean
}

export interface AIMiddlewareConfig {
    /** Optimization flags applied to AI bot responses */
    optimizations?: AIOptimizationOptions
    /** Custom list of bot user-agent strings to detect (merged with defaults) */
    additionalBots?: string[]
    /** Bots to explicitly ignore/not optimize for */
    ignoreBots?: string[]
    /** Enable verbose logging */
    verbose?: boolean
}

export interface BotInfo {
    name: string
    company: string
    userAgentPattern: string
    purpose: 'training' | 'search' | 'indexing' | 'unknown'
    /**
     * Whether this entry's user-agent token has been confirmed against the
     * vendor's own published documentation (not a third-party/SEO-blog list).
     * Undefined for user-supplied custom bots, where verification doesn't apply.
     */
    verified?: boolean
    /** Vendor (or best available) documentation URL this entry was checked against. */
    sourceUrl?: string
    /** ISO 8601 date this entry was last checked against `sourceUrl`. */
    lastChecked?: string
}

// ---- Generators ----

export interface RobotsConfig {
    /** AI crawlers to explicitly allow */
    allowAI?: string[]
    /** AI crawlers to explicitly block */
    blockAI?: string[]
    /** Paths to disallow for all bots */
    disallow?: string[]
    /** Your sitemap URL */
    sitemapUrl?: string
    /** Crawl delay in seconds (optional) */
    crawlDelay?: number
}

export interface LLMSPage {
    url: string
    title: string
    /** Optional manual summary. If omitted, will be auto-generated from content */
    summary?: string
    /** Page priority (high | medium | low) */
    priority?: 'high' | 'medium' | 'low'
}

export interface LLMSConfig {
    siteName: string
    description: string
    baseUrl?: string
    pages: LLMSPage[]
    /** Contact/author info */
    contact?: {
        email?: string
        twitter?: string
        github?: string
    }
    /** Auto-fetch summaries from live URLs */
    autoSummarize?: boolean
}

// ---- Schema ----

export interface FAQItem {
    q: string
    a: string
}

export interface ProductSchemaData {
    name: string
    description?: string
    price: number
    currency?: string
    features?: string[]
    url?: string
    image?: string
    brand?: string
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
    author?: { name: string; jobTitle?: string }
}

export interface ArticleSchemaData {
    headline: string
    description?: string
    author?: string
    publisher?: string
    publishedDate?: string
    modifiedDate?: string
    url?: string
    image?: string
    keywords?: string[]
}

export interface OrganizationSchemaData {
    name: string
    url?: string
    logo?: string
    description?: string
    email?: string
    phone?: string
    address?: {
        street?: string
        city?: string
        country?: string
    }
    sameAs?: string[]
}

export interface PersonSchemaData {
    name: string
    jobTitle?: string
    url?: string
    image?: string
    email?: string
    sameAs?: string[]
    worksFor?: string
    description?: string
}

export interface WebSiteSchemaData {
    name: string
    url: string
    description?: string
    /** Sitelinks searchbox. Omit if the site has no search. */
    searchAction?: {
        /** Full URL template, e.g. 'https://example.com/search?q={search_term_string}' */
        urlTemplate: string
        queryInput?: string
    }
}

export interface SoftwareApplicationSchemaData {
    name: string
    description: string
    url: string
    applicationCategory?: string
    operatingSystem?: string
    offers?: OfferSchemaData
    aggregateRating?: AggregateRatingSchemaData
}

export interface BreadcrumbItem {
    name: string
    /** Absolute URL, or relative path when `baseUrl` is passed to breadcrumbList() */
    url: string
}

export interface BreadcrumbListOptions {
    /** Resolves relative `url` values in breadcrumb items against this base */
    baseUrl?: string
}

export interface DefinedTermSchemaData {
    name: string
    description: string
    url?: string
    /** URL of the DefinedTermSet (e.g. glossary index page) this term belongs to */
    inDefinedTermSet?: string
}

export interface DefinedTermSetSchemaData {
    name: string
    url: string
    description?: string
}

export interface OfferSchemaData {
    price: number
    priceCurrency?: string
    availability?: 'InStock' | 'OutOfStock' | 'PreOrder'
    url?: string
    priceValidUntil?: string
}

export interface AggregateRatingSchemaData {
    ratingValue: number
    reviewCount?: number
    ratingCount?: number
    bestRating?: number
    worstRating?: number
}

// ---- Analyzer ----

export interface AnalysisIssue {
    type:
    | 'answer-placement'
    | 'fact-density'
    | 'heading-structure'
    | 'eeat'
    | 'snippability'
    | 'schema'
    | 'crawler-accessibility'
    | 'meta'
    severity: 'high' | 'medium' | 'low'
    message: string
    fix: string
}

export interface AIReadabilityScore {
    overallScore: number
    breakdown: {
        answerFrontLoading: number
        factDensity: number
        headingStructure: number
        eeatSignals: number
        snippability: number
        schemaCoverage: number
        crawlerAccessibility: number
    }
    issues: AnalysisIssue[]
    recommendations: string[]
}

export interface AnalyzerOptions {
    checkAnswerPlacement?: boolean
    checkFactDensity?: boolean
    checkHeadingStructure?: boolean
    checkEEAT?: boolean
    checkSnippability?: boolean
    checkSchema?: boolean
    checkCrawlerAccessibility?: boolean
}

/**
 * Optional site context for the crawlerAccessibility dimension. Without it,
 * that dimension can only check the page's own <meta name="robots"> tag —
 * passing robots.txt content and llms.txt presence (as `audit <url>` and
 * `audit --dir` both do) lets it check AI-crawler-specific rules too.
 *
 * Also consumed by the AI Readiness Engine (`ContentAnalyzer.audit()`) —
 * the additional optional fields below feed CRAWLABILITY checks that need
 * more than the page's own HTML (llms.txt content, ai.txt/sitemap
 * presence, response time). All are best-effort/optional: `undefined`
 * means "not checked", never "checked and absent" — the checks that use
 * them treat `undefined` as neutral (no penalty) rather than a failure.
 */
export interface AnalysisContext {
    /** Raw robots.txt content for the site being analyzed, if known. */
    robotsTxt?: string
    /** Whether an llms.txt file was found for the site being analyzed. */
    hasLlmsTxt?: boolean
    /** Raw llms.txt content, if fetched — enables a validity check beyond mere presence. */
    llmsTxtContent?: string
    /** Whether an ai.txt file was found for the site being analyzed. */
    hasAiTxt?: boolean
    /** Whether a sitemap was found (sitemap.xml, or a `Sitemap:` line in robots.txt). */
    hasSitemap?: boolean
    /** Time in milliseconds the page took to respond, if the page was fetched live. */
    responseTimeMs?: number
}

/** One entry of the published, fixed GEO scoring weights (see `SCORING_WEIGHTS`). */
export interface ScoringDimension {
    key: keyof AIReadabilityScore['breakdown']
    label: string
    weight: number
    description: string
}

// ---- AI Readiness Engine (v0.6.0) ----

/**
 * The seven top-level AI Readiness categories (schemaVersion 3). See
 * `CATEGORY_WEIGHTS` for weights/descriptions.
 *
 * `answerPlacement` is new in v3: it was previously one check inside
 * `structure`, which meant answer front-loading carried ~4% of the overall
 * score despite being the strongest single predictor in our own 50-site
 * study. Folding a strong content-placement signal into a weak structural
 * one understated it, so it is now its own category. See docs/scoring.md.
 *
 * Every category here is computable from a single page's HTML/headers plus
 * site-level files (robots.txt, llms.txt, ai.txt, sitemap). Anything that
 * needs a live engine query is measurement-level and belongs in
 * `VisibilityVectorObservation`, not here.
 */
export type AuditCategoryKey =
    | 'crawlability'
    | 'answerPlacement'
    | 'citationReadiness'
    | 'entitySignals'
    | 'structure'
    | 'content'
    | 'authority'

/**
 * How well-supported a dimension's weight is by published evidence.
 *
 * Deliberately coarse. `strong` is reserved for effects that are
 * definitional or replicated across independent studies; a single
 * correlational finding — including our own — is `moderate` at best.
 */
export type EvidenceGrade = 'strong' | 'moderate' | 'weak'

/** One entry of the published, fixed AI Readiness category weights (see `CATEGORY_WEIGHTS`). */
export interface AuditCategoryWeight {
    key: AuditCategoryKey
    label: string
    weight: number
    description: string
    /** How well-supported this dimension's weight is. See `EvidenceGrade`. */
    evidenceGrade: EvidenceGrade
    /**
     * The specific finding this weight rests on, named in prose. Findings
     * are cited descriptively rather than by identifier: we publish this
     * file to downstream vendors, and a wrong arXiv ID in a vendored file
     * is worse than no ID at all.
     */
    rationale: string
}

export type AuditSeverity = 'critical' | 'warning' | 'suggestion'

/**
 * A single failed (or partially failed) check, surfaced to explain *why* a
 * score is what it is. `score_impact` is how many of the check's own 0-100
 * points were lost (not category- or overall-weighted) — a rough "how bad
 * is this one thing" number for sorting/display.
 */
export interface AuditIssue {
    id: string
    category: AuditCategoryKey
    severity: AuditSeverity
    title: string
    description: string
    impact: string
    score_impact: number
}

/** One check's 0-100 subscore within a category. */
export interface AuditCheckResult {
    id: string
    label: string
    score: number
}

export interface CategoryResult {
    key: AuditCategoryKey
    label: string
    weight: number
    /** Equal-weighted average of this category's check scores. */
    score: number
    checks: AuditCheckResult[]
}

/**
 * Result of `ContentAnalyzer.audit()` — the AI Readiness Engine. Replaces
 * the flat 7-dimension `AIReadabilityScore` with six weighted categories,
 * each broken into named checks, plus a structured issue list.
 *
 * `score` and `dimensions` are kept for backward compatibility with
 * consumers of the old `AIReadabilityScore` shape (`score` mirrors
 * `overall`; `dimensions` is derived from the new checks — see
 * docs/scoring.md for the mapping). Both are deprecated: accessing either
 * logs a one-time `console.warn` pointing at `overall`/`categories`.
 */
export interface AuditResult {
    overall: number
    categories: Record<AuditCategoryKey, CategoryResult>
    issues: AuditIssue[]
    /** @deprecated Use `overall` instead. */
    score: number
    /** @deprecated Use `categories` instead. */
    dimensions: Record<string, number>
}

// ---- Page-level scoring schema (scoring-weights.json v3) ----

/**
 * Shape of the published `dist/scoring-weights.json`. Page-level only:
 * every dimension is computable from one page's HTML/headers plus
 * site-level files. Measurement-level signal lives in a separate file with
 * its own independent `schemaVersion` — see `VisibilityVectorFile`.
 *
 * `legacy_dimensions` carries the pre-v0.6.0 flat GEO dimensions, retained
 * only so already-shipped consumers that parse the old shape have something
 * to pin to while they migrate. New consumers must read `dimensions`.
 */
export interface ScoringWeightsFile {
    schemaVersion: number
    packageVersion: string
    generatedAt: string
    source: string
    docs: string
    /** What this file does and does not claim to measure. New in v3. */
    scope: {
        level: 'page'
        computableFrom: string[]
        excludes: string
    }
    dimensions: AuditCategoryWeight[]
    legacy_dimensions: ScoringDimension[]
}

/**
 * A category key is present only when some check actually measured it for
 * this page. Absent means not-applicable — a page with no commercial
 * surface, or a fetch that never resolved site-level files — and is
 * excluded from both the numerator and the weight denominator rather than
 * scored as 0. Absent is not zero.
 */
export type CategoryScores = Partial<Record<AuditCategoryKey, number>>

export interface OverallScoreResult {
    /** Weighted 0-100 score, renormalized over only the categories present in `scores`. */
    score: number
    /** Categories with no applicable check — excluded from both the score and the weight renormalization. */
    skippedCategories: AuditCategoryKey[]
    /** True when a crawler hard block forced `score` to 0 regardless of every other category. */
    hardGated: boolean
}

// ---- Measurement-level schema (visibility-vector.json v1) ----

/**
 * Why a field has no value. Never `undefined` — an absent measurement must
 * be distinguishable from a measurement of zero, and "this engine cannot
 * report it" must be distinguishable from "we did not look".
 */
export type ObservationStatus =
    /** The engine reported it and the value is trustworthy. */
    | 'observed'
    /** This engine structurally cannot report it (e.g. OpenAI/Anthropic give no search-activation signal). */
    | 'not-observable'
    /** Observable in principle, but this run did not evaluate it (e.g. fidelity with no claim-checking configured). */
    | 'not-evaluated'

/** A value that may be legitimately absent, carrying the reason for its absence. */
export interface Observed<T> {
    value: T | null
    status: ObservationStatus
}

/**
 * Whether the engine performed a live web retrieval for this run.
 *
 * Tri-state, not boolean, and deliberately so: of the four shipped adapters
 * only Perplexity (always searches) and Gemini (via `groundingMetadata`)
 * expose this at all. Recording `false` for OpenAI and Anthropic would
 * assert something we did not observe, and every downstream rate would
 * inherit that fabrication.
 */
export type SearchActivation = 'activated' | 'not-activated' | 'unknown'

/**
 * How a single run terminated. Non-`observed` outcomes are retained in
 * every denominator: a run that errored still consumed an opportunity to be
 * cited, and dropping it inflates every rate computed over it.
 */
export type RunOutcome = 'observed' | 'engine-error' | 'empty-response'

/** Which measurement-level fields a given engine adapter is capable of reporting. */
export interface EngineObservability {
    engine: string
    searchActivation: boolean
    retrievedSources: boolean
    contextPosition: boolean
    citations: boolean
    /**
     * The concrete response field the adapter reads to obtain retrieval
     * signal, named so a consumer can verify the claim against the provider's
     * API docs rather than taking this table on faith.
     */
    mechanism: string
    /**
     * True when `searchActivation` is only observable if the adapter was
     * called with `QueryOptions.webSearch` enabled. An engine that is never
     * asked to search cannot report that it didn't — the honest value in that
     * case is `unknown`, not `not-activated`.
     */
    requiresWebSearch: boolean
}

/**
 * One (query, engine, run) observation — the atomic unit the visibility
 * vector is built from. Produced per run by `MeasurementEngine`, including
 * for runs that failed or returned nothing.
 */
export interface VisibilityVectorObservation {
    prompt: string
    promptCluster: string
    engine: string
    model: string
    /** 1-indexed repetition number for this (prompt, engine) pair. */
    run: number
    observedAt: number
    outcome: RunOutcome

    // -- Discoverability --
    searchActivation: SearchActivation

    // -- Retrieval presence --
    /** Count of distinct sources the engine retrieved, when the engine reports them. */
    retrievedSourceCount: Observed<number>
    /** Whether any retrieved source belonged to the tracked brand. */
    brandRetrieved: Observed<boolean>

    // -- Context position --
    /** Rank of the brand's source within the retrieved context, where the engine exposes ordering. */
    contextPosition: Observed<number>

    // -- Citation --
    brandCited: boolean
    citedUrls: string[]
    brandCitedUrlCount: number

    // -- Prominence --
    mentioned: boolean
    recommended: boolean
    /** 1-indexed first-mention order among all tracked names; null when not mentioned. */
    mentionRank: Observed<number>

    // -- Fidelity --
    /** Claims attributed to the brand that were checked against the source page. */
    claimsChecked: Observed<number>
    /** Of those, how many were reproduced accurately. */
    claimsAccurate: Observed<number>
}

/**
 * The three denominators of the citation chain, kept separate so no rate is
 * ever computed against a silently filtered population.
 *
 * Each is a subset of the one above it:
 * `runsCited` subset-of `runsRetrieved` subset-of `runsActivated` subset-of `runsAttempted`.
 */
export interface VisibilityDenominators {
    /** Every run we tried, including engine errors and empty responses. */
    runsAttempted: number
    /** Runs where the engine performed a live retrieval. `unknown` activation does NOT count as activated. */
    runsActivated: number
    /** Runs (of the activated ones) that retrieved at least one source. */
    runsRetrieved: number
    /** Runs (of the retrieved ones) that cited the brand. */
    runsCited: number
    /** Runs whose activation could not be observed — reported so an `unknown`-dominated sample stays visible rather than being folded into `not-activated`. */
    runsActivationUnknown: number
    /**
     * Runs that activated but whose retrieved-source set the engine does not
     * enumerate (the OpenAI adapter proves search ran without listing what it
     * read). They stay in `runsActivated`, so they legitimately depress
     * `pRetrievedGivenActivated` — that factor is only interpretable when
     * this is 0. Decompose per-engine, or read this before trusting it.
     */
    runsRetrievalUnknown: number
}

/**
 * The decomposition itself:
 *
 *   Pr(cited) = Pr(activated) x Pr(retrieved | activated) x Pr(cited | retrieved)
 *
 * Reported as separate quantities, never pre-multiplied into a single
 * citation rate. A low `pCited` caused by an engine that rarely searches is
 * a completely different problem from one caused by content that never gets
 * cited once retrieved, and a single scalar cannot tell them apart.
 *
 * Conditionals are `null` — not 0, not 1 — when their denominator is empty:
 * with no activated runs, Pr(retrieved | activated) is undefined, not zero.
 */
export interface VisibilityDecomposition {
    denominators: VisibilityDenominators
    /** runsActivated / runsAttempted. Null only when no runs were attempted at all. */
    pActivated: number | null
    /** runsRetrieved / runsActivated. Null when nothing activated. */
    pRetrievedGivenActivated: number | null
    /** runsCited / runsRetrieved. Null when nothing was retrieved. */
    pCitedGivenRetrieved: number | null
    /** runsCited / runsAttempted — the unconditional rate. Derived; the chain identity is asserted in tests. */
    pCited: number | null
}

/** Shape of the published `dist/visibility-vector.json` — a field manifest for measurement-level observations. */
export interface VisibilityVectorFile {
    schemaVersion: number
    packageVersion: string
    generatedAt: string
    source: string
    docs: string
    scope: {
        level: 'measurement'
        unit: string
        excludes: string
    }
    /** The Pr(cited) chain, published so downstream consumers reconstruct it identically. */
    decomposition: {
        identity: string
        factors: Array<{
            key: string
            label: string
            numerator: string
            denominator: string
            nullWhen: string
        }>
        retentionRule: string
    }
    /** Every field of `VisibilityVectorObservation`, with its null semantics. */
    fields: Array<{
        key: string
        label: string
        facet: 'identity' | 'discoverability' | 'retrieval' | 'contextPosition' | 'citation' | 'prominence' | 'fidelity'
        type: string
        nullable: boolean
        description: string
    }>
    /** Which adapters can observe which facets — so an `unknown`-heavy sample is explicable. */
    observability: EngineObservability[]
}

// ---- Monitor ----

export interface CrawlerLog {
    botName: string
    company: string
    url: string
    method: string
    timestamp: string
    statusCode: number
    responseTimeMs: number
    userAgent: string
    ip?: string
}

export interface BotStatsSerialized {
    botName: string
    company: string
    totalVisits: number
    uniqueUrlCount: number
    lastSeen: string
    avgResponseTimeMs: number
    successRate: number
    successCount: number
}

export interface LoggerConfig {
    /** Where to store logs: 'file' | 'memory' | 'both' */
    storage?: 'file' | 'memory' | 'both'
    /** Path to log file (default: ./logs/ai-crawler.json) */
    logFilePath?: string
    /** Specific crawlers to track (default: all known AI crawlers) */
    trackCrawlers?: string[]
    /** Max log entries to keep in memory */
    maxMemoryEntries?: number
}

// ---- AI Engine Adapters (v0.7.0, BYOK) ----

export interface QueryOptions {
    /** Overrides the adapter's default model. */
    model?: string
    /** @default 0.7 */
    temperature?: number
    /** @default 1024 */
    maxTokens?: number
    /**
     * Request live web retrieval from the engine.
     *
     * `true` (the default as of v0.10.0) is what makes `searchActivation` and
     * `citationProvenance` meaningful: without it the engine answers from
     * parametric memory, every URL in the output is recited rather than
     * retrieved, and a citation rate computed over those URLs measures
     * recall, not citation.
     *
     * Set `false` to keep the pre-v0.10.0 behaviour — no tool is sent, and
     * the response is reported as `searchActivation: 'unknown'` with
     * `citationProvenance: 'prose-extraction'` so nothing downstream mistakes
     * it for observed retrieval. Web search is billed per call by every
     * provider that offers it; this is the switch for turning that off.
     *
     * Ignored by Perplexity, which always retrieves.
     *
     * @default true
     */
    webSearch?: boolean
    /**
     * Cap on searches the engine may run per call, where the provider
     * supports one (Anthropic's `max_uses`). A cost bound, not a correctness
     * knob.
     * @default 5
     */
    maxSearchUses?: number
}

/**
 * Where an `EngineResponse.citations` array came from — the difference
 * between a measured citation and a plausible-looking one.
 *
 * The distinction is the entire reason this field exists. Regex-scraping
 * URLs out of prose cannot tell a source the engine actually read from one
 * the model reproduced from memory, and treating the two alike is how a
 * citation rate ends up measuring something other than citation.
 */
export type CitationProvenance =
    /** From the engine's own retrieval fields (grounding chunks, search results, url_citation annotations). Trustworthy. */
    | 'retrieval'
    /** Regex-extracted from the response text because no retrieval was requested. Indistinguishable from recall — do not count as a citation. */
    | 'prose-extraction'
    /** Retrieval was requested and the engine did not search, so there is nothing to cite. Distinct from an empty prose extraction. */
    | 'none'

/**
 * Normalized response from any `EngineAdapter`. `brands` is always `[]` at
 * this layer — a bare `query(prompt)` call has no brand list to check
 * against. Brand/competitor detection happens in `MeasurementEngine`, which
 * does have that context (see docs/measurement.md).
 */
export interface EngineResponse {
    engine: string
    model: string
    prompt: string
    response: string
    /**
     * URLs the engine cited. **Read `citationProvenance` before using this**:
     * on `'prose-extraction'` these are scraped from the response text and
     * carry no evidence that the engine retrieved anything.
     */
    citations: string[]
    brands: string[]
    timestamp: number
    latencyMs: number

    /** Whether the engine performed a live retrieval for this call. `'unknown'` when retrieval was not requested. */
    searchActivation: SearchActivation
    /** How `citations` was obtained. */
    citationProvenance: CitationProvenance
    /**
     * Sources the engine reported retrieving, when it enumerates them.
     * `not-observable` where the provider proves a search ran but does not
     * list what it read — an empty array would falsely assert it read nothing.
     */
    retrievedSources: Observed<string[]>
}

export interface EngineAdapter {
    name: string
    slug: 'openai' | 'perplexity' | 'gemini' | 'anthropic'
    query(prompt: string, options?: QueryOptions): Promise<EngineResponse>
}

/** One engine's entry in `crawlpod.config.js`'s `engines` object. */
export interface EngineConfigEntry {
    apiKey?: string
    model?: string
    temperature?: number
    maxTokens?: number
}

/** Shape of the optional `crawlpod.config.js` the CLI loads from the current working directory. */
export interface CrawlpodConfigFile {
    engines?: Partial<Record<EngineAdapter['slug'], EngineConfigEntry>>
}

// ---- Prompt Discovery (v0.7.0) ----

export type PromptClusterType = 'discovery' | 'comparison' | 'commercial' | 'problem' | 'recommendation'

export interface DiscoveryConfig {
    brand: string
    category: string
    competitors?: string[]
    /** @default 'en-US' */
    locale?: string
}

export interface PromptCluster {
    type: PromptClusterType
    prompts: string[]
}

// ---- Measurement Engine (v0.7.0) ----

export interface MeasureConfig {
    brand: string
    /** From `PromptDiscovery.discover()`, or custom. */
    prompts: string[]
    engines: EngineAdapter[]
    /** Repetitions per prompt per engine. @default 3, max 10 */
    runs?: number
    competitors?: string[]
    /**
     * Passed through to every adapter call. Defaults to requesting web
     * search — measuring citation against engines that were never asked to
     * retrieve measures the wrong thing (see `QueryOptions.webSearch`).
     */
    queryOptions?: QueryOptions
}

export interface RunResult {
    engine: string
    run: number
    mentioned: boolean
    recommended: boolean
    /** 1-indexed order of first mention among all brands detected in the response; null if not mentioned. */
    position: number | null
    citedUrls: string[]
    competitorsMentioned: string[]
    rawResponse: string
    /** Whether the engine retrieved for this run. Carried up from the adapter so a rate over `citedUrls` can be qualified. */
    searchActivation: SearchActivation
    /** Whether `citedUrls` is evidence of retrieval or scraped from prose. */
    citationProvenance: CitationProvenance
}

export interface PromptResult {
    prompt: string
    cluster: string
    runs: RunResult[]
    aggregated: {
        mentionRate: number
        recommendRate: number
        variance: number
    }
}

export interface BrandVisibility {
    /** 0-1: how often the brand appears in responses. */
    mentionRate: number
    /** 0-1: how often the brand appears in a positive-recommendation context. */
    recommendRate: number
    /** Average 1-indexed position when mentioned (lower = more prominent). */
    averagePosition: number
    /** 0-1: how often a URL from the brand's domain is cited. */
    citationRate: number
    /** Statistical variance of per-run mention scores (0/1). */
    variance: number
    /** 95% confidence interval half-width: 1.96 * sqrt(variance / sampleSize). */
    confidence: number
    sampleSize: number
}

export interface EngineVisibility {
    engine: string
    mentionRate: number
    recommendRate: number
    citationRate: number
    variance: number
}

export interface MeasurementReport {
    brand: string
    timestamp: number
    summary: BrandVisibility
    competitors: Record<string, BrandVisibility>
    perEngine: Record<string, EngineVisibility>
    perPrompt: PromptResult[]
    /**
     * Every attempted run as a measurement-level observation, **including
     * runs that errored or returned nothing**. This is the input
     * `decomposeVisibility()` expects, and the reason it exists separately
     * from `perPrompt`: `perPrompt` drops failed runs, so a rate computed
     * over it silently measures the subset that happened to succeed.
     *
     * `summary.citationRate` and friends predate this and still compute over
     * successful calls only. Prefer `decomposeVisibility(observations)`
     * wherever the denominator matters.
     */
    observations: VisibilityVectorObservation[]
    stats: {
        totalQueries: number
        totalRuns: number
        enginesUsed: string[]
        durationMs: number
        /** Count of runs where the underlying engine call failed (logged, then skipped — not retried). */
        failedRuns: number
    }
}

// ---- Citation Intelligence (v0.8.0) ----

export type SourceType =
    | 'own-domain'
    | 'review-site'
    | 'comparison-site'
    | 'news'
    | 'forum'
    | 'social'
    | 'documentation'
    | 'marketplace'
    | 'other'

export interface CitationSource {
    domain: string
    url?: string
    mentions: number
    type: SourceType
    mentionsBrand: boolean
    mentionsCompetitors: string[]
    /** Prompt cluster (e.g. 'discovery', 'comparison') that first surfaced this source. */
    firstSeen: string
}

export interface CitationReport {
    brand: string
    brandDomain: string
    sources: CitationSource[]
    sourcesByType: Record<SourceType, CitationSource[]>
    totalMentions: number
    /** 0-1: share of all source mentions that are the brand's own domain. */
    domainCoverage: number
    /** 0-1: share of all source mentions that are third-party (non-own-domain) sources. */
    thirdPartyCoverage: number
    /** Sources that cite at least one competitor but never the brand, sorted by mentions descending. */
    topCompetitorSources: CitationSource[]
}

// ---- Competitor Gap Analysis (v0.8.0) ----

export type GapImpact = 'high' | 'medium' | 'low'

export interface GapReason {
    id: string
    reason: string
    impact: GapImpact
    evidence: string
    actionable: string
}

export interface CompetitorGap {
    competitor: string
    visibility: {
        yours: number
        theirs: number
        /** theirs - yours; positive = they're winning. */
        gap: number
    }
    /** Sorted by impact, descending (high -> medium -> low). */
    reasons: GapReason[]
}

export interface GapSummary {
    /** Mean of `gap` across all analyzed competitors. */
    averageGap: number
    biggestGap: string | null
    smallestGap: string | null
}

export interface CompetitorReport {
    brand: string
    /** Sorted by visibility.gap descending — the competitor winning by the most first. */
    competitors: CompetitorGap[]
    overallGap: GapSummary
}

// ---- Express augmentation ----
declare global {
    namespace Express {
        interface Request {
            isAIBot?: boolean
            aiBotInfo?: BotInfo
        }
    }
}
