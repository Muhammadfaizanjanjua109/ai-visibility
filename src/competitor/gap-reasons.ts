// ============================================================
// Competitor gap reason detection (v0.8.0)
// Every reason is derived directly from MeasurementReport data — if the
// data doesn't support a reason, it's simply not emitted. No hallucinated
// insights, matching the project's "simple heuristics, not NLP" precedent
// (see measure/brand-detection.ts).
// ============================================================

import type { GapImpact, GapReason, MeasurementReport, RunResult } from '../types'
import { classifySource } from '../citations/source-classify'
import { extractSourceRefs } from '../citations/url-extract'

function pct(rate: number): number {
    return Math.round(rate * 100)
}

/** Ratio-based impact: how many times bigger `theirs` is than `yours`. `theirs` must already be known to exceed `yours`. */
export function classifyImpactByRatio(yours: number, theirs: number): GapImpact {
    if (yours <= 0) return theirs > 0 ? 'high' : 'low'
    const ratio = theirs / yours
    if (ratio > 3) return 'high'
    if (ratio >= 1.5) return 'medium'
    return 'low'
}

/** Percentage-point-based impact, for 0-1 rate/fraction gaps. */
export function classifyImpactByPercentGap(gapFraction: number): GapImpact {
    const points = Math.abs(gapFraction) * 100
    if (points > 30) return 'high'
    if (points >= 10) return 'medium'
    return 'low'
}

function uniqueCitingDomains(report: MeasurementReport, isEntity: (run: RunResult) => boolean): Set<string> {
    const domains = new Set<string>()
    for (const promptResult of report.perPrompt) {
        for (const run of promptResult.runs) {
            if (!isEntity(run)) continue
            for (const ref of extractSourceRefs(run.rawResponse, run.citedUrls)) domains.add(ref.domain)
        }
    }
    return domains
}

function reviewOrForumDomains(report: MeasurementReport, isEntity: (run: RunResult) => boolean): Set<string> {
    const domains = new Set<string>()
    for (const promptResult of report.perPrompt) {
        for (const run of promptResult.runs) {
            if (!isEntity(run)) continue
            for (const ref of extractSourceRefs(run.rawResponse, run.citedUrls)) {
                const type = classifySource(ref.domain, '', ref.url)
                if (type === 'review-site' || type === 'forum') domains.add(ref.domain)
            }
        }
    }
    return domains
}

function clustersCoveredBy(report: MeasurementReport, isEntity: (run: RunResult) => boolean): Set<string> {
    const covered = new Set<string>()
    for (const promptResult of report.perPrompt) {
        if (covered.has(promptResult.cluster)) continue
        if (promptResult.runs.some(isEntity)) covered.add(promptResult.cluster)
    }
    return covered
}

function allClusters(report: MeasurementReport): Set<string> {
    return new Set(report.perPrompt.map((p) => p.cluster))
}

function perEngineRatesFor(report: MeasurementReport, isEntity: (run: RunResult) => boolean): Map<string, number> {
    const counts = new Map<string, { mentioned: number; total: number }>()
    for (const promptResult of report.perPrompt) {
        for (const run of promptResult.runs) {
            const c = counts.get(run.engine) ?? { mentioned: 0, total: 0 }
            c.total++
            if (isEntity(run)) c.mentioned++
            counts.set(run.engine, c)
        }
    }
    const rates = new Map<string, number>()
    for (const [engine, c] of counts) rates.set(engine, c.total > 0 ? c.mentioned / c.total : 0)
    return rates
}

const ENGINE_TIPS: Array<{ match: RegExp; tip: string }> = [
    { match: /perplexity/i, tip: 'Perplexity relies heavily on recent web citations — improve web presence' },
    { match: /gemini/i, tip: "Gemini draws on Google's web index — invest in structured data and SEO" },
    { match: /openai|chatgpt|gpt/i, tip: 'ChatGPT leans on training data — strengthen citable, well-structured content' },
    { match: /anthropic|claude/i, tip: 'Claude relies on retrieved web content — strengthen citable, well-structured pages' },
]

function engineTip(engine: string): string {
    return ENGINE_TIPS.find((t) => t.match.test(engine))?.tip ?? `${engine} may rely on different signals — strengthen your presence there`
}

function citationGapReason(report: MeasurementReport, competitor: string): GapReason | null {
    const yours = uniqueCitingDomains(report, (r) => r.mentioned).size
    const theirs = uniqueCitingDomains(report, (r) => r.competitorsMentioned.includes(competitor)).size
    if (theirs <= yours) return null

    const ratioText = yours > 0 ? `${(theirs / yours).toFixed(1)}x` : `${theirs}x`
    return {
        id: 'citation-gap',
        reason: `Cited by ${ratioText} more independent sources`,
        impact: classifyImpactByRatio(yours, theirs),
        evidence: `${competitor} cited by ${theirs} unique domain${theirs === 1 ? '' : 's'}, you by ${yours}`,
        actionable: 'Build presence on review sites and comparison platforms',
    }
}

function promptCoverageGapReason(report: MeasurementReport, competitor: string): GapReason | null {
    const total = allClusters(report)
    if (total.size === 0) return null

    const yours = clustersCoveredBy(report, (r) => r.mentioned)
    const theirs = clustersCoveredBy(report, (r) => r.competitorsMentioned.includes(competitor))
    if (theirs.size <= yours.size) return null

    const missing = [...total].filter((c) => theirs.has(c) && !yours.has(c))
    return {
        id: 'prompt-coverage-gap',
        reason: `Appears in ${theirs.size}/${total.size} prompt clusters vs your ${yours.size}/${total.size}`,
        impact: classifyImpactByPercentGap(theirs.size / total.size - yours.size / total.size),
        evidence: `${competitor} appears in ${theirs.size}/${total.size} prompt clusters, you in ${yours.size}/${total.size}`,
        actionable: missing.length > 0 ? `Create content targeting: ${missing.join(', ')}` : 'Create content targeting the clusters where you have no presence',
    }
}

function recommendationGapReason(report: MeasurementReport, competitor: string): GapReason | null {
    const yours = report.summary.recommendRate
    const theirsVisibility = report.competitors[competitor]
    if (!theirsVisibility) return null
    const theirs = theirsVisibility.recommendRate
    if (theirs <= yours) return null

    return {
        id: 'recommendation-gap',
        reason: yours > 0 ? `Recommended ${(theirs / yours).toFixed(1)}x more often` : `Recommended in ${pct(theirs)}% of responses, never for you`,
        impact: classifyImpactByRatio(yours, theirs),
        evidence: `${competitor} recommended in ${pct(theirs)}% of responses, you in ${pct(yours)}%`,
        actionable: 'Strengthen unique value proposition signals',
    }
}

function engineSpecificGapReason(report: MeasurementReport, competitor: string): GapReason | null {
    const yourRates = perEngineRatesFor(report, (r) => r.mentioned)
    const theirRates = perEngineRatesFor(report, (r) => r.competitorsMentioned.includes(competitor))
    const engines = [...yourRates.keys()]
    if (engines.length < 2) return null

    let weakest: string | null = null
    let weakestScore = Infinity
    for (const engine of engines) {
        const yours = yourRates.get(engine) ?? 0
        const theirs = theirRates.get(engine) ?? 0
        if (yours < 0.1 && theirs > yours && yours < weakestScore) {
            weakestScore = yours
            weakest = engine
        }
    }
    if (!weakest) return null

    let strongest: string | null = null
    let strongestScore = -1
    for (const engine of engines) {
        if (engine === weakest) continue
        const yours = yourRates.get(engine) ?? 0
        if (yours > strongestScore) {
            strongestScore = yours
            strongest = engine
        }
    }
    if (!strongest || strongestScore <= weakestScore) return null

    return {
        id: 'engine-specific-gap',
        reason: `Invisible on ${weakest} while visible elsewhere`,
        impact: classifyImpactByPercentGap(strongestScore - weakestScore),
        evidence: `You're invisible on ${weakest} (${pct(weakestScore)}% mention) while visible on ${strongest} (${pct(strongestScore)}%)`,
        actionable: engineTip(weakest),
    }
}

const MIN_CO_MENTION_SAMPLE = 3

function positionGapReason(report: MeasurementReport, competitor: string): GapReason | null {
    let both = 0
    let brandFirst = 0
    for (const promptResult of report.perPrompt) {
        for (const run of promptResult.runs) {
            if (run.mentioned && run.competitorsMentioned.includes(competitor)) {
                both++
                if (run.position === 1) brandFirst++
            }
        }
    }
    if (both < MIN_CO_MENTION_SAMPLE) return null

    const competitorFirstRate = (both - brandFirst) / both
    if (competitorFirstRate <= 0.5) return null

    return {
        id: 'position-gap',
        reason: `Listed first ${pct(competitorFirstRate)}% of the time when both mentioned`,
        impact: competitorFirstRate >= 0.8 ? 'high' : competitorFirstRate >= 0.6 ? 'medium' : 'low',
        evidence: `When both mentioned, ${competitor} listed first ${pct(competitorFirstRate)}% of the time`,
        actionable: 'Improve brand authority and E-E-A-T signals',
    }
}

function comparisonContentGapReason(report: MeasurementReport, brand: string, competitor: string): GapReason | null {
    const comparisonPrompts = report.perPrompt.filter((p) => p.cluster === 'comparison')
    if (comparisonPrompts.length === 0) return null

    const competitorCount = comparisonPrompts.filter((p) => p.runs.some((r) => r.competitorsMentioned.includes(competitor))).length
    const brandCount = comparisonPrompts.filter((p) => p.runs.some((r) => r.mentioned)).length
    if (competitorCount <= brandCount) return null

    return {
        id: 'comparison-content-gap',
        reason: `Benefits from comparison content you don't have`,
        impact: classifyImpactByPercentGap(competitorCount / comparisonPrompts.length - brandCount / comparisonPrompts.length),
        evidence: `${competitorCount} comparison prompts mention ${competitor}, ${brandCount} mention you`,
        actionable: `Create a comparison page: "${brand} vs ${competitor}"`,
    }
}

function reviewSocialProofGapReason(report: MeasurementReport, competitor: string): GapReason | null {
    const yours = reviewOrForumDomains(report, (r) => r.mentioned)
    const theirs = reviewOrForumDomains(report, (r) => r.competitorsMentioned.includes(competitor))
    if (theirs.size === 0 || theirs.size <= yours.size) return null

    return {
        id: 'review-social-proof-gap',
        reason: `Cited from ${theirs.size} review/forum source${theirs.size === 1 ? '' : 's'} you aren't`,
        impact: classifyImpactByRatio(yours.size, theirs.size),
        evidence: `${competitor} cited from ${[...theirs].sort().join(', ')}; you from ${yours.size > 0 ? [...yours].sort().join(', ') : 'none'}`,
        actionable: 'Build review profiles on G2, Capterra; engage on Reddit',
    }
}

const IMPACT_ORDER: Record<GapImpact, number> = { high: 0, medium: 1, low: 2 }

/** Runs every gap-reason detector for one competitor and returns the ones the data actually supports, sorted by impact descending. */
export function detectGapReasons(report: MeasurementReport, brand: string, competitor: string): GapReason[] {
    const reasons = [
        citationGapReason(report, competitor),
        promptCoverageGapReason(report, competitor),
        recommendationGapReason(report, competitor),
        engineSpecificGapReason(report, competitor),
        positionGapReason(report, competitor),
        comparisonContentGapReason(report, brand, competitor),
        reviewSocialProofGapReason(report, competitor),
    ].filter((r): r is GapReason => r !== null)

    return reasons.sort((a, b) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact])
}
