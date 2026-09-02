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

const SCHEMA_VERSION = 1

const { ENGINE_OBSERVABILITY } = require(path.join(__dirname, '..', 'dist', 'measure.js'))
const { version: packageVersion } = require(path.join(__dirname, '..', 'package.json'))

if (!Array.isArray(ENGINE_OBSERVABILITY) || ENGINE_OBSERVABILITY.length === 0) {
    throw new Error('ENGINE_OBSERVABILITY is empty or missing from dist/measure.js — refusing to publish a visibility-vector.json that claims nothing is observable')
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

    F('searchActivation', 'Search activation', 'discoverability', '"activated" | "not-activated" | "unknown"', false, 'Whether the engine performed a live retrieval. Tri-state, not boolean: most adapters cannot observe this, and recording false for them would assert something never measured.'),

    F('retrievedSourceCount', 'Retrieved source count', 'retrieval', 'Observed<integer>', true, 'Distinct sources the engine retrieved. null with status not-observable for engines that do not expose retrieval.'),
    F('brandRetrieved', 'Brand retrieved', 'retrieval', 'Observed<boolean>', true, 'Whether any retrieved source belonged to the tracked brand.'),

    F('contextPosition', 'Context position', 'contextPosition', 'Observed<integer>', true, 'Rank of the brand source within the retrieved context. Currently not-observable on every shipped adapter — none exposes context ordering.'),

    F('brandCited', 'Brand cited', 'citation', 'boolean', false, 'Whether a cited URL resolved to the brand.'),
    F('citedUrls', 'Cited URLs', 'citation', 'string[]', false, 'All URLs the engine cited. Empty array is a real observation, not a missing one.'),
    F('brandCitedUrlCount', 'Brand cited URL count', 'citation', 'integer', false, 'How many of citedUrls resolved to the brand.'),

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
