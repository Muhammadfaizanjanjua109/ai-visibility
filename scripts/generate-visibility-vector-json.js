#!/usr/bin/env node

// Emits dist/visibility-vector.json — the measurement-level schema, a field
// manifest for the per-(query, engine, run) observations MeasurementEngine
// produces. Companion to scripts/generate-scoring-weights-json.js.
//
// The two files version INDEPENDENTLY and deliberately so. scoring-weights
// describes what is computable from a page; this describes what one engine
// did for one query at one moment. They move on different clocks, and a
// shared version counter would force a meaningless bump on one every time
// the other changed — which is how the page/measurement distinction got
// blurred in the first place. A consumer that assumes a matching scoring
// schemaVersion implies a matching vector schemaVersion is wrong.
//
// The central contract published here is the denominator decomposition:
//
//   Pr(cited) = Pr(activated) x Pr(retrieved | activated) x Pr(cited | retrieved)
//
// reported as three separate quantities, never pre-multiplied. Runs where
// search did not activate, or that returned no citations, are OUTCOMES and
// stay in the denominators. Filtering them silently inflates every rate.
//
// Reads dist/measure.js, which is zero-dependency (see the zero-deps test).

const fs = require('fs')
const path = require('path')

const SCHEMA_VERSION = 2

const { ENGINE_OBSERVABILITY } = require(path.join(__dirname, '..', 'dist', 'measure.js'))
const { version: packageVersion } = require(path.join(__dirname, '..', 'package.json'))

if (!Array.isArray(ENGINE_OBSERVABILITY) || ENGINE_OBSERVABILITY.length === 0) {
    throw new Error('ENGINE_OBSERVABILITY is empty or missing from dist/measure.js — refusing to publish a visibility-vector.json that claims nothing is observable')
}

// The observability table is the thing a consumer uses to decide whether a
// low pActivated is a finding or an artifact. An unexplained row makes that
// call impossible, so every row must name the response field it reads and
// state whether that reading depends on webSearch being enabled.
for (const row of ENGINE_OBSERVABILITY) {
    if (typeof row.mechanism !== 'string' || row.mechanism.length < 20) {
        throw new Error(
            `ENGINE_OBSERVABILITY row for "${row.engine}" has no substantive "mechanism" — name the concrete response field the adapter reads, so the claim is verifiable against the provider's docs rather than taken on faith`
        )
    }
    if (typeof row.requiresWebSearch !== 'boolean') {
        throw new Error(
            `ENGINE_OBSERVABILITY row for "${row.engine}" is missing "requiresWebSearch" — without it a consumer cannot tell an engine that declined to search from one that was never asked`
        )
    }
    if (row.searchActivation && row.retrievedSources === undefined) {
        throw new Error(`ENGINE_OBSERVABILITY row for "${row.engine}" claims searchActivation without declaring retrievedSources`)
    }
}

const DECOMPOSITION = {
    identity: 'Pr(cited) = Pr(activated) * Pr(retrieved | activated) * Pr(cited | retrieved)',
    factors: [
        {
            key: 'pActivated',
            label: 'Search activation rate',
            numerator: 'runsActivated',
            denominator: 'runsAttempted',
            nullWhen: 'runsAttempted === 0',
        },
        {
            key: 'pRetrievedGivenActivated',
            label: 'Retrieval rate given activation',
            numerator: 'runsRetrieved',
            denominator: 'runsActivated',
            nullWhen: 'runsActivated === 0 — the ratio is undefined, NOT zero. Reporting 0 here asserts that content failed to be retrieved when it was never given the chance.',
        },
        {
            key: 'pCitedGivenRetrieved',
            label: 'Citation rate given retrieval',
            numerator: 'runsCited',
            denominator: 'runsRetrieved',
            nullWhen: 'runsRetrieved === 0 — undefined, not zero.',
        },
        {
            key: 'pCited',
            label: 'Unconditional citation rate',
            numerator: 'runsCited',
            denominator: 'runsAttempted',
            nullWhen: 'runsAttempted === 0. Computed directly, not as the product of the three factors above — the two agree whenever all factors are defined, which is asserted in tests rather than relied on.',
        },
    ],
    interpretationRule:
        'pRetrievedGivenActivated is only interpretable when runsRetrievalUnknown is 0. Runs against an engine that proves a search ran without enumerating what it read (OpenAI) stay in runsActivated but can never enter runsRetrieved, so they depress that factor for a measurement reason rather than a retrieval one. Decompose per-engine, or read runsRetrievalUnknown before trusting the middle factor.',
    retentionRule:
        'Every attempted run stays in runsAttempted, including engine-error and empty-response outcomes and runs where search never activated. These are outcomes, not absences: a run that errored still consumed an opportunity to be cited. One reviewed configuration found 57.8% of ChatGPT repetitions never activated web search — filtering those would have reported a citation rate more than twice its true value. searchActivation "unknown" counts toward NEITHER activated nor not-activated; it is tracked separately in runsActivationUnknown so a sample dominated by engines that cannot report activation stays visible as such.',
}

const F = (key, label, facet, type, nullable, description) => ({ key, label, facet, type, nullable, description })

const FIELDS = [
    F('prompt', 'Prompt', 'identity', 'string', false, 'The query text as sent to the engine.'),
    F('promptCluster', 'Prompt cluster', 'identity', 'string', false, 'Cluster type (discovery, comparison, commercial, problem, recommendation, custom).'),
    F('engine', 'Engine', 'identity', 'string', false, 'Adapter name, e.g. "Perplexity". Join key into observability[].'),
    F('model', 'Model', 'identity', 'string', false, 'Model identifier the engine reported, which may differ from the one requested.'),
    F('run', 'Run index', 'identity', 'integer', false, '1-indexed repetition for this (prompt, engine) pair.'),
    F('observedAt', 'Observed at', 'identity', 'epoch-ms', false, 'When the observation was recorded. Engine behaviour is time-varying; an observation without a timestamp is not reproducible.'),
    F('outcome', 'Run outcome', 'identity', '"observed" | "engine-error" | "empty-response"', false, 'How the run terminated. Non-observed outcomes are RETAINED in every denominator.'),

    F('searchActivation', 'Search activation', 'discoverability', '"activated" | "not-activated" | "unknown"', false, 'Whether the engine performed a live retrieval, read from a named response field per engine (see observability[].mechanism). Tri-state, not boolean: an engine called without web search enabled cannot report that it declined to search, and recording false there would assert something never measured. "unknown" counts toward neither.'),

    F('retrievedSourceCount', 'Retrieved source count', 'retrieval', 'Observed<integer>', true, 'Distinct sources the engine retrieved. not-observable — never 0 — for an engine that proves a search ran without enumerating what it read; 0 would assert it read nothing.'),
    F('brandRetrieved', 'Brand retrieved', 'retrieval', 'Observed<boolean>', true, 'Whether any retrieved source belonged to the tracked brand.'),

    F('contextPosition', 'Context position', 'contextPosition', 'Observed<integer>', true, 'Rank of the brand source within the retrieved context. Currently not-observable on every shipped adapter — none exposes context ordering.'),

    F('brandCited', 'Brand cited', 'citation', 'boolean', false, 'Whether a retrieval-backed cited URL resolved to the brand. URLs scraped out of prose never set this: a URL the model reproduced from memory is recall, not citation.'),
    F('citedUrls', 'Cited URLs', 'citation', 'string[]', false, 'All URLs the engine cited. Empty array is a real observation, not a missing one.'),
    F('brandCitedUrlCount', 'Brand cited URL count', 'citation', 'integer', false, 'How many of citedUrls resolved to the brand, counted only when their provenance is retrieval.'),

    F('mentioned', 'Mentioned', 'prominence', 'boolean', false, 'Whether the brand appears in the response text.'),
    F('recommended', 'Recommended', 'prominence', 'boolean', false, 'Whether the brand appears in a positive-recommendation context.'),
    F('mentionRank', 'Mention rank', 'prominence', 'Observed<integer>', true, '1-indexed first-mention order among tracked names. null when not mentioned.'),

    F('claimsChecked', 'Claims checked', 'fidelity', 'Observed<integer>', true, 'Claims attributed to the brand that were verified against the source page. not-evaluated when no claim-checking ran.'),
    F('claimsAccurate', 'Claims accurate', 'fidelity', 'Observed<integer>', true, 'Of those checked, how many were reproduced accurately.'),
]

const output = {
    schemaVersion: SCHEMA_VERSION,
    packageVersion,
    generatedAt: new Date().toISOString(),
    source: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/src/measure/visibility-vector.ts',
    docs: 'https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/measurement.md',
    scope: {
        level: 'measurement',
        unit: 'One (query, engine, run) observation.',
        excludes:
            'Anything computable from a page\'s HTML or site-level files. Those are page-level scoring dimensions and live in scoring-weights.json, which versions independently.',
    },
    nullStates: {
        observed: 'The engine reported it and the value is trustworthy.',
        'not-observable': 'This engine structurally cannot report it. Distinct from a zero.',
        'not-evaluated': 'Observable in principle, but this run did not evaluate it.',
        note: 'No field is ever undefined. An absent measurement must be distinguishable from a measurement of zero, and "this engine cannot report it" must be distinguishable from "we did not look".',
    },
    decomposition: DECOMPOSITION,
    fields: FIELDS,
    observability: ENGINE_OBSERVABILITY,
}

const outPath = path.join(__dirname, '..', 'dist', 'visibility-vector.json')
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n')
console.log(`✅ Generated ${path.relative(process.cwd(), outPath)} (${FIELDS.length} fields, ${ENGINE_OBSERVABILITY.length} engines, schemaVersion ${SCHEMA_VERSION})`)
