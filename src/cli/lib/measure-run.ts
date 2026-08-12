// ============================================================
// CLI: shared discover+measure pipeline
// Used by `measure`, and by the v0.8.0 `citations`/`compare`/`report`
// commands when they aren't given a previously saved report via `--from`.
// ============================================================

import { PromptDiscovery } from '../../prompts/prompt-discovery'
import { MeasurementEngine } from '../../measure/measurement-engine'
import type { EngineAdapter, MeasurementReport } from '../../types'

export interface RunMeasurementOptions {
    brand: string
    category: string
    competitors: string[]
    engines: EngineAdapter[]
    /** Repetitions per prompt per engine. @default 3, max 10 */
    runs?: number
}

/** Runs `PromptDiscovery.discover()` then `MeasurementEngine.measure()` against the result — the same pipeline the `measure` CLI command uses. */
export async function runMeasurement(options: RunMeasurementOptions): Promise<MeasurementReport> {
    const clusters = new PromptDiscovery().discover({ brand: options.brand, category: options.category, competitors: options.competitors })
    const promptClusters: Record<string, string> = {}
    for (const cluster of clusters) {
        for (const prompt of cluster.prompts) promptClusters[prompt] = cluster.type
    }
    const prompts = clusters.flatMap((c) => c.prompts)

    return new MeasurementEngine().measure(
        { brand: options.brand, prompts, engines: options.engines, runs: options.runs, competitors: options.competitors },
        promptClusters
    )
}
