// ============================================================
// Statistics helpers for the Measurement Engine (v0.7.0)
// ============================================================

import type { BrandVisibility, EngineVisibility } from '../types'
import type { EntityOutcome } from './brand-detection'

export function mean(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Population variance (divides by n, not n-1) — avoids a divide-by-zero at sampleSize 1, which single-run measurements can hit. */
export function variance(values: number[]): number {
    if (values.length === 0) return 0
    const m = mean(values)
    return mean(values.map((v) => (v - m) ** 2))
}

/** 95% confidence interval half-width. Zero when there's no sample to speak of. */
export function confidenceInterval(sampleVariance: number, sampleSize: number): number {
    if (sampleSize === 0) return 0
    return 1.96 * Math.sqrt(sampleVariance / sampleSize)
}

const indicator = (flags: boolean[]): number[] => flags.map((f) => (f ? 1 : 0))

/** Builds a full `BrandVisibility` from every outcome recorded for one entity (brand or competitor) across all measured runs. */
export function aggregateBrandVisibility(outcomes: EntityOutcome[]): BrandVisibility {
    const sampleSize = outcomes.length
    const mentionIndicator = indicator(outcomes.map((o) => o.mentioned))
    const recommendIndicator = indicator(outcomes.map((o) => o.recommended))
    const citeIndicator = indicator(outcomes.map((o) => o.cited))
    const positions = outcomes.filter((o) => o.position !== null).map((o) => o.position as number)
    const mentionVariance = variance(mentionIndicator)

    return {
        mentionRate: mean(mentionIndicator),
        recommendRate: mean(recommendIndicator),
        averagePosition: positions.length > 0 ? mean(positions) : 0,
        citationRate: mean(citeIndicator),
        variance: mentionVariance,
        confidence: confidenceInterval(mentionVariance, sampleSize),
        sampleSize,
    }
}

export function aggregateEngineVisibility(engine: string, outcomes: EntityOutcome[]): EngineVisibility {
    const mentionIndicator = indicator(outcomes.map((o) => o.mentioned))
    const recommendIndicator = indicator(outcomes.map((o) => o.recommended))
    const citeIndicator = indicator(outcomes.map((o) => o.cited))

    return {
        engine,
        mentionRate: mean(mentionIndicator),
        recommendRate: mean(recommendIndicator),
        citationRate: mean(citeIndicator),
        variance: variance(mentionIndicator),
    }
}
