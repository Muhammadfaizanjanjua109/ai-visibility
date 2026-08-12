// ============================================================
// Measurement Engine (v0.7.0)
// Queries every configured engine, `runs` times per prompt, sequentially
// (one call in flight at a time, a delay between calls to the same
// engine), and aggregates the results with statistical rigor — see
// docs/measurement.md for the formulas and design notes.
// ============================================================

import type { MeasureConfig, MeasurementReport, PromptResult, RunResult } from '../types'
import { analyzeEntities, type EntityOutcome } from './brand-detection'
import { aggregateBrandVisibility, aggregateEngineVisibility, mean, variance } from './stats'

const DEFAULT_RUNS = 3
const MAX_RUNS = 10
const DEFAULT_DELAY_MS = 1000

function clampRuns(runs: number | undefined): number {
    return Math.min(MAX_RUNS, Math.max(1, runs ?? DEFAULT_RUNS))
}

function sleep(ms: number): Promise<void> {
    return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}

interface SuccessfulCall {
    prompt: string
    engineName: string
    run: number
    outcomesByName: Map<string, EntityOutcome>
    citedUrls: string[]
    rawResponse: string
}

function aggregatePromptResult(runs: RunResult[]): PromptResult['aggregated'] {
    const mentionIndicator = runs.map((r) => (r.mentioned ? 1 : 0))
    const recommendIndicator = runs.map((r) => (r.recommended ? 1 : 0))
    return {
        mentionRate: mean(mentionIndicator),
        recommendRate: mean(recommendIndicator),
        variance: variance(mentionIndicator),
    }
}

export class MeasurementEngine {
    /** `delayMs` is a test-only seam (not part of the public spec) — production code should use the default 1000ms. */
    constructor(private readonly delayMs: number = DEFAULT_DELAY_MS) {}

    /**
     * `promptClusters` is an optional, non-spec addition: a prompt-text ->
     * cluster-type lookup (e.g. built from `PromptDiscovery.discover()`
     * output) so `PromptResult.cluster` can be populated accurately by
     * callers that have that context — e.g. the `measure` CLI command.
     * `MeasureConfig.prompts` itself is a flat `string[]` with no cluster
     * metadata, so without this a prompt's cluster is reported as 'custom'.
     */
    async measure(config: MeasureConfig, promptClusters?: Record<string, string>): Promise<MeasurementReport> {
        const runsPerPrompt = clampRuns(config.runs)
        const competitors = config.competitors ?? []
        const names = [config.brand, ...competitors]
        const start = Date.now()

        const successfulCalls: SuccessfulCall[] = []
        let failedRuns = 0

        for (const adapter of config.engines) {
            let isFirstCallForEngine = true
            for (const prompt of config.prompts) {
                for (let run = 1; run <= runsPerPrompt; run++) {
                    if (!isFirstCallForEngine) await sleep(this.delayMs)
                    isFirstCallForEngine = false

                    try {
                        const response = await adapter.query(prompt)
                        successfulCalls.push({
                            prompt,
                            engineName: adapter.name,
                            run,
                            outcomesByName: analyzeEntities(response.response, response.citations, names),
                            citedUrls: response.citations,
                            rawResponse: response.response,
                        })
                    } catch (err) {
                        failedRuns++
                        console.error(`[ai-visibility] measurement run failed (engine=${adapter.name}, run=${run}): ${err instanceof Error ? err.message : String(err)}`)
                    }
                }
            }
        }

        return this.buildReport(config, competitors, successfulCalls, failedRuns, runsPerPrompt, start, promptClusters)
    }

    private buildReport(
        config: MeasureConfig,
        competitors: string[],
        successfulCalls: SuccessfulCall[],
        failedRuns: number,
        runsPerPrompt: number,
        start: number,
        promptClusters?: Record<string, string>
    ): MeasurementReport {
        const brandOutcomes: EntityOutcome[] = []
        const competitorOutcomes = new Map<string, EntityOutcome[]>(competitors.map((c) => [c, []]))
        const engineOutcomes = new Map<string, EntityOutcome[]>(config.engines.map((e) => [e.name, []]))
        const runsByPrompt = new Map<string, RunResult[]>(config.prompts.map((p) => [p, []]))

        for (const call of successfulCalls) {
            const brandOutcome = call.outcomesByName.get(config.brand)
            if (!brandOutcome) continue // names always includes config.brand, so this never actually happens

            brandOutcomes.push(brandOutcome)
            engineOutcomes.get(call.engineName)?.push(brandOutcome)

            const mentionedCompetitors: string[] = []
            for (const competitor of competitors) {
                const outcome = call.outcomesByName.get(competitor)
                if (!outcome) continue
                competitorOutcomes.get(competitor)?.push(outcome)
                if (outcome.mentioned) mentionedCompetitors.push(competitor)
            }

            const runResult: RunResult = {
                engine: call.engineName,
                run: call.run,
                mentioned: brandOutcome.mentioned,
                recommended: brandOutcome.recommended,
                position: brandOutcome.position,
                citedUrls: call.citedUrls,
                competitorsMentioned: mentionedCompetitors,
                rawResponse: call.rawResponse,
            }
            runsByPrompt.get(call.prompt)?.push(runResult)
        }

        const perPrompt: PromptResult[] = config.prompts.map((prompt) => {
            const runs = runsByPrompt.get(prompt) ?? []
            return {
                prompt,
                cluster: promptClusters?.[prompt] ?? 'custom',
                runs,
                aggregated: aggregatePromptResult(runs),
            }
        })

        const competitorsReport: Record<string, ReturnType<typeof aggregateBrandVisibility>> = {}
        for (const competitor of competitors) {
            competitorsReport[competitor] = aggregateBrandVisibility(competitorOutcomes.get(competitor) ?? [])
        }

        const perEngine: Record<string, ReturnType<typeof aggregateEngineVisibility>> = {}
        for (const adapter of config.engines) {
            perEngine[adapter.name] = aggregateEngineVisibility(adapter.name, engineOutcomes.get(adapter.name) ?? [])
        }

        const totalQueries = config.prompts.length * config.engines.length

        return {
            brand: config.brand,
            timestamp: Date.now(),
            summary: aggregateBrandVisibility(brandOutcomes),
            competitors: competitorsReport,
            perEngine,
            perPrompt,
            stats: {
                totalQueries,
                totalRuns: totalQueries * runsPerPrompt,
                enginesUsed: config.engines.map((e) => e.name),
                durationMs: Date.now() - start,
                failedRuns,
            },
        }
    }
}
