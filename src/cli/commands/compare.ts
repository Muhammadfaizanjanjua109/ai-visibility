// ============================================================
// CLI: compare command
// "Why they're winning" — runs (or loads via --from) a MeasurementReport
// through the CompetitorAnalyzer and prints a ranked, evidence-backed
// breakdown of each competitor's visibility advantage.
// ============================================================

import type { Command } from 'commander'
import { CompetitorAnalyzer } from '../../competitor/analyzer'
import type { CompetitorGap, CompetitorReport, GapImpact, GapReason, MeasurementReport } from '../../types'
import { getChalk } from '../lib/chalk'
import type { Chalk } from '../lib/chalk'
import { printFooter } from '../lib/footer'
import { resolveMeasurementReport } from '../lib/report-source'
import { parseCommaList } from './discover'

const DIVIDER = '━'.repeat(44)

const IMPACT_ICON: Record<GapImpact, string> = { high: '●', medium: '▲', low: '○' }
const IMPACT_LABEL: Record<GapImpact, string> = { high: 'HIGH IMPACT', medium: 'MEDIUM IMPACT', low: 'LOW IMPACT' }
const IMPACT_ORDER: GapImpact[] = ['high', 'medium', 'low']

function pct(rate: number): number {
    return Math.round(rate * 100)
}

function impactColor(impact: GapImpact, text: string, chalk: Chalk): string {
    if (impact === 'high') return chalk.red(text)
    if (impact === 'medium') return chalk.yellow(text)
    return chalk.dim(text)
}

function renderReasonsByImpact(reasons: GapReason[], chalk: Chalk): void {
    for (const impact of IMPACT_ORDER) {
        const inGroup = reasons.filter((r) => r.impact === impact)
        if (inGroup.length === 0) continue

        console.log(impactColor(impact, IMPACT_LABEL[impact], chalk))
        console.log()
        for (const reason of inGroup) {
            console.log(`${IMPACT_ICON[impact]} ${reason.reason}`)
            console.log(chalk.dim(`→ ${reason.actionable}`))
            console.log()
        }
    }
}

function renderGap(brand: string, gap: CompetitorGap, chalk: Chalk): void {
    const displayGap = pct(gap.visibility.yours - gap.visibility.theirs)
    console.log(chalk.bold(`${brand} vs ${gap.competitor} (gap: ${displayGap >= 0 ? '+' : ''}${displayGap}%)`))
    console.log()

    if (gap.reasons.length === 0) {
        console.log(chalk.dim('  No clear data-backed gap reasons found.'))
        console.log()
        return
    }

    renderReasonsByImpact(gap.reasons, chalk)
}

export function renderCompetitorReport(report: CompetitorReport, chalk: Chalk): void {
    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log(chalk.bold.cyan("WHY THEY'RE WINNING"))
    console.log(chalk.dim(DIVIDER))
    console.log()

    for (const gap of report.competitors) {
        renderGap(report.brand, gap, chalk)
        console.log(chalk.dim(DIVIDER))
        console.log()
    }
}

/** `MeasurementReport.competitors` already names every measured competitor — use it when `--competitors` isn't explicitly given (mainly for `--from`, where re-typing the list would be redundant). */
export function resolveCompetitors(explicit: string | undefined, report: MeasurementReport): string[] {
    const parsed = parseCommaList(explicit)
    return parsed.length > 0 ? parsed : Object.keys(report.competitors)
}

export function registerCompare(program: Command): void {
    program
        .command('compare')
        .description("Explain why each competitor's AI visibility beats yours, with evidence and action items")
        .option('--brand <name>', 'Brand or product name (required unless --from)')
        .option('--category <category>', 'Product category, e.g. "CRM software" (required unless --from)')
        .option('--competitors <list>', 'Comma-separated competitor names (defaults to every competitor in --from report)')
        .option('--runs <n>', 'Repetitions per prompt per engine (default 3, max 10)', '3')
        .option('--from <file>', 'Load a previously saved `measure --json` report instead of re-querying engines')
        .option('--json', 'Output the full CompetitorReport as JSON')
        .action(async (options, command: Command) => {
            const chalk = await getChalk()
            const quiet = Boolean(command.optsWithGlobals().quiet)

            const measurementReport = await resolveMeasurementReport(options, chalk)
            if (!measurementReport) return

            const competitors = resolveCompetitors(options.competitors, measurementReport)
            if (competitors.length === 0) {
                console.error(chalk.red('No competitors to compare against — pass --competitors, or use a --from report that includes them.'))
                process.exitCode = 1
                return
            }

            const brand = options.brand ?? measurementReport.brand
            const report = new CompetitorAnalyzer().analyze(measurementReport, brand, competitors)

            if (options.json) {
                console.log(JSON.stringify(report, null, 2))
                return
            }

            renderCompetitorReport(report, chalk)
            printFooter(chalk, quiet)
        })
}
