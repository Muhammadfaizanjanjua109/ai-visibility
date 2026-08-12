// ============================================================
// CLI: shared "--from <file>, or run measurement live" resolution
// Used by `citations`, `compare`, and `report` — each accepts either a
// previously saved `measure --json` file or --brand/--category to run the
// discover+measure pipeline itself.
// ============================================================

import type { Chalk } from './chalk'
import type { MeasurementReport } from '../../types'
import { loadConfiguredEngines, noEnginesConfiguredMessage } from './engine-config'
import { runMeasurement } from './measure-run'
import { loadReportFromFile } from './report-io'
import { parseCommaList } from '../commands/discover'

export interface ReportSourceOptions {
    from?: string
    brand?: string
    category?: string
    competitors?: string
    runs?: string
}

/** Returns `null` (having already printed an error and set `process.exitCode = 1`) when the report can't be produced. */
export async function resolveMeasurementReport(options: ReportSourceOptions, chalk: Chalk): Promise<MeasurementReport | null> {
    if (options.from) {
        try {
            return loadReportFromFile(options.from)
        } catch (err) {
            console.error(chalk.red(`❌ Failed to load --from file: ${err instanceof Error ? err.message : String(err)}`))
            process.exitCode = 1
            return null
        }
    }

    if (!options.brand || !options.category) {
        console.error(chalk.red('Provide --brand and --category, or --from <file> with a previously saved `measure --json` report.'))
        process.exitCode = 1
        return null
    }

    const engines = loadConfiguredEngines()
    if (engines.length === 0) {
        console.error(chalk.red(noEnginesConfiguredMessage()))
        process.exitCode = 1
        return null
    }

    try {
        return await runMeasurement({
            brand: options.brand,
            category: options.category,
            competitors: parseCommaList(options.competitors),
            engines,
            runs: options.runs ? parseInt(options.runs, 10) : undefined,
        })
    } catch (err) {
        console.error(chalk.red(`❌ Measurement failed: ${err instanceof Error ? err.message : String(err)}`))
        process.exitCode = 1
        return null
    }
}
