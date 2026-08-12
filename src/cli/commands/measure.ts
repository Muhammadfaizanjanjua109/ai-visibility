// ============================================================
// CLI: measure command
// Runs prompt discovery + the Measurement Engine against every configured
// AI engine (BYOK — env vars or crawlpod.config.js, see cli/lib/engine-config.ts)
// and prints a visibility report with confidence intervals.
// ============================================================

import type { Command } from 'commander'
import { PromptDiscovery } from '../../prompts/prompt-discovery'
import { MeasurementEngine } from '../../measure/measurement-engine'
import type { BrandVisibility, MeasurementReport } from '../../types'
import { getChalk } from '../lib/chalk'
import type { Chalk } from '../lib/chalk'
import { renderBar } from '../lib/format'
import { printFooter } from '../lib/footer'
import { loadConfiguredEngines, noEnginesConfiguredMessage } from '../lib/engine-config'
import { parseCommaList } from './discover'

const DIVIDER = '━'.repeat(44)

function pct(rate: number): number {
    return Math.round(rate * 100)
}

function formatConfidence(confidence: number): string {
    return `±${(confidence * 100).toFixed(1)}%`
}

function formatDuration(ms: number): string {
    const totalSeconds = Math.round(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
}

function renderRateRow(name: string, rate: number, confidence: number, nameWidth: number, chalk: Chalk): string {
    const p = pct(rate)
    return `${chalk.bold(name.padEnd(nameWidth))} ${renderBar(p)} ${String(p).padStart(3)}% ${chalk.dim(formatConfidence(confidence))}`
}

/**
 * Per-engine mention rate for the brand and every competitor. Derived from
 * `report.perPrompt[].runs` (each `RunResult` carries its own `engine`)
 * rather than a new field — `EngineVisibility` only covers the primary
 * brand per the spec'd type, so the competitor breakdown for the PER ENGINE
 * section is reconstructed here instead of stored on the report.
 */
function computePerEngineMentionRates(report: MeasurementReport): Map<string, Map<string, number>> {
    const competitorNames = Object.keys(report.competitors)
    const counts = new Map<string, Map<string, { mentioned: number; total: number }>>()

    for (const promptResult of report.perPrompt) {
        for (const run of promptResult.runs) {
            let engineCounts = counts.get(run.engine)
            if (!engineCounts) {
                engineCounts = new Map()
                counts.set(run.engine, engineCounts)
            }

            const brandEntry = engineCounts.get(report.brand) ?? { mentioned: 0, total: 0 }
            brandEntry.total++
            if (run.mentioned) brandEntry.mentioned++
            engineCounts.set(report.brand, brandEntry)

            for (const name of competitorNames) {
                const entry = engineCounts.get(name) ?? { mentioned: 0, total: 0 }
                entry.total++
                if (run.competitorsMentioned.includes(name)) entry.mentioned++
                engineCounts.set(name, entry)
            }
        }
    }

    const rates = new Map<string, Map<string, number>>()
    for (const [engine, nameCounts] of counts) {
        const engineRates = new Map<string, number>()
        for (const [name, c] of nameCounts) engineRates.set(name, c.total > 0 ? c.mentioned / c.total : 0)
        rates.set(engine, engineRates)
    }
    return rates
}

export function renderMeasureReport(report: MeasurementReport, chalk: Chalk): void {
    const competitorEntries = Object.entries(report.competitors) as Array<[string, BrandVisibility]>
    const allNames = [report.brand, ...competitorEntries.map(([name]) => name)]
    const nameWidth = Math.max(...allNames.map((n) => n.length))
    const runsPerPrompt = report.stats.totalQueries > 0 ? report.stats.totalRuns / report.stats.totalQueries : 0

    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log(chalk.bold.cyan('AI VISIBILITY MEASUREMENT'))
    console.log(chalk.dim(DIVIDER))
    console.log()
    console.log(`${chalk.bold('Brand:')} ${report.brand}`)
    console.log(`${chalk.bold('Engines:')} ${report.stats.enginesUsed.join(', ')}`)
    console.log(`${chalk.bold('Prompts:')} ${report.perPrompt.length} | ${chalk.bold('Runs:')} ${runsPerPrompt} each | ${chalk.bold('Total queries:')} ${report.stats.totalRuns}`)
    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log()

    console.log(chalk.bold('OVERALL VISIBILITY'))
    console.log()
    console.log(renderRateRow(report.brand, report.summary.mentionRate, report.summary.confidence, nameWidth, chalk))
    for (const [name, visibility] of competitorEntries) {
        console.log(renderRateRow(name, visibility.mentionRate, visibility.confidence, nameWidth, chalk))
    }
    console.log()

    console.log(chalk.bold('RECOMMENDATION RATE'))
    console.log()
    console.log(renderRateRow(report.brand, report.summary.recommendRate, report.summary.confidence, nameWidth, chalk))
    for (const [name, visibility] of competitorEntries) {
        console.log(renderRateRow(name, visibility.recommendRate, visibility.confidence, nameWidth, chalk))
    }
    console.log()

    console.log(chalk.dim(DIVIDER))
    console.log()
    console.log(chalk.bold('PER ENGINE'))
    console.log()
    const perEngineRates = computePerEngineMentionRates(report)
    for (const engine of report.stats.enginesUsed) {
        const rates = perEngineRates.get(engine)
        const parts = allNames.map((name) => `${name} ${pct(rates?.get(name) ?? 0)}%`)
        console.log(`${chalk.bold(engine.padEnd(nameWidth))} ${parts.join('   ')}`)
    }
    console.log()

    console.log(chalk.dim(DIVIDER))
    console.log()
    console.log(`${chalk.bold('Sample size:')} ${report.stats.totalRuns} queries${report.stats.failedRuns > 0 ? chalk.yellow(` (${report.stats.failedRuns} failed)`) : ''}`)
    console.log(`${chalk.bold('Confidence:')} 95%`)
    console.log(`${chalk.bold('Duration:')} ${formatDuration(report.stats.durationMs)}`)
    console.log()
}

export function registerMeasure(program: Command): void {
    program
        .command('measure')
        .description('Query configured AI engines and measure brand visibility with repeated sampling (BYOK — see docs/measurement.md)')
        .requiredOption('--brand <name>', 'Brand or product name')
        .requiredOption('--category <category>', 'Product category, e.g. "CRM software"')
        .option('--competitors <list>', 'Comma-separated competitor names')
        .option('--runs <n>', 'Repetitions per prompt per engine (default 3, max 10)', '3')
        .option('--json', 'Output the full MeasurementReport as JSON')
        .action(async (options, command: Command) => {
            const chalk = await getChalk()
            const quiet = Boolean(command.optsWithGlobals().quiet)

            const engines = loadConfiguredEngines()
            if (engines.length === 0) {
                console.error(chalk.red(noEnginesConfiguredMessage()))
                process.exitCode = 1
                return
            }

            const competitors = parseCommaList(options.competitors)
            const clusters = new PromptDiscovery().discover({ brand: options.brand, category: options.category, competitors })
            const promptClusters: Record<string, string> = {}
            for (const cluster of clusters) {
                for (const prompt of cluster.prompts) promptClusters[prompt] = cluster.type
            }
            const prompts = clusters.flatMap((c) => c.prompts)

            let report: MeasurementReport
            try {
                report = await new MeasurementEngine().measure(
                    { brand: options.brand, prompts, engines, runs: parseInt(options.runs, 10), competitors },
                    promptClusters
                )
            } catch (err) {
                console.error(chalk.red(`❌ Measurement failed: ${err instanceof Error ? err.message : String(err)}`))
                process.exitCode = 1
                return
            }

            if (options.json) {
                console.log(JSON.stringify(report, null, 2))
                return
            }

            renderMeasureReport(report, chalk)
            printFooter(chalk, quiet)
        })
}
