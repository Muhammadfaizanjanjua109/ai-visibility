// ============================================================
// CLI: report command
// The "Lighthouse run" — audit + discover + measure + citations + compare
// in one pipeline, one combined report. Each stage reuses its own command's
// analyzer/renderer; this file only wires them together.
// ============================================================

import type { Command } from 'commander'
import path from 'path'
import { auditDir, auditUrl, renderOneReport } from './audit'
import type { AuditFileResult } from './audit'
import { CitationAnalyzer } from '../../citations/analyzer'
import { CompetitorAnalyzer } from '../../competitor/analyzer'
import type { CitationReport, CompetitorReport, MeasurementReport } from '../../types'
import { getChalk } from '../lib/chalk'
import type { Chalk } from '../lib/chalk'
import { printFooter } from '../lib/footer'
import { resolveMeasurementReport } from '../lib/report-source'
import { renderCitationReport } from './citations'
import { renderCompetitorReport, resolveCompetitors } from './compare'
import { renderMeasureReport } from './measure'

const DIVIDER = '━'.repeat(44)

interface FullReport {
    audit?: AuditFileResult[]
    measurement: MeasurementReport
    citations: CitationReport
    compare: CompetitorReport
}

async function runAuditSection(url: string | undefined, dir: string | undefined, chalk: Chalk): Promise<AuditFileResult[] | undefined> {
    if (!url && !dir) return undefined
    try {
        return url ? await auditUrl(url) : await auditDir(path.resolve(dir!))
    } catch (err) {
        console.error(chalk.yellow(`⚠️  Audit section skipped — ${err instanceof Error ? err.message : String(err)}`))
        return undefined
    }
}

function renderFullReport(report: FullReport, chalk: Chalk, verbose: boolean): void {
    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log(chalk.bold.cyan('AI VISIBILITY REPORT'))
    console.log(chalk.dim(DIVIDER))

    if (report.audit) {
        for (const { file, result } of report.audit) renderOneReport(file, result, chalk, verbose)
    } else {
        console.log()
        console.log(chalk.dim('Audit section skipped — pass --url or --dir to include it.'))
    }

    renderMeasureReport(report.measurement, chalk)
    renderCitationReport(report.citations, chalk, verbose)
    renderCompetitorReport(report.compare, chalk)
}

export function registerReport(program: Command): void {
    program
        .command('report')
        .description('Full pipeline: audit + discover + measure + citations + compare, in one combined report')
        .requiredOption('--domain <domain>', "Your brand's own domain, e.g. acmecrm.com")
        .option('--brand <name>', 'Brand or product name (required unless --from)')
        .option('--category <category>', 'Product category, e.g. "CRM software" (required unless --from)')
        .option('--competitors <list>', 'Comma-separated competitor names (defaults to every competitor in --from report)')
        .argument('[url]', 'URL to audit (optional — omit to skip the audit section)')
        .option('--dir <path>', 'Audit a local build directory instead of a live URL')
        .option('--runs <n>', 'Repetitions per prompt per engine (default 3, max 10)', '3')
        .option('--from <file>', 'Load a previously saved `measure --json` report instead of re-querying engines')
        .option('--json', 'Output the full combined report as JSON')
        .option('--verbose', 'Show every individual check/source, not just the top ones')
        .action(async (url: string | undefined, options, command: Command) => {
            const chalk = await getChalk()
            const quiet = Boolean(command.optsWithGlobals().quiet)

            if (url && options.dir) {
                console.error(chalk.red('Pass either a URL or --dir, not both.'))
                process.exitCode = 1
                return
            }

            const measurementReport = await resolveMeasurementReport(options, chalk)
            if (!measurementReport) return

            const audit = await runAuditSection(url, options.dir, chalk)
            const brand = options.brand ?? measurementReport.brand
            const competitors = resolveCompetitors(options.competitors, measurementReport)

            const citations = new CitationAnalyzer().analyze(measurementReport, options.domain)
            const compare = new CompetitorAnalyzer().analyze(measurementReport, brand, competitors)

            const full: FullReport = { audit, measurement: measurementReport, citations, compare }

            if (options.json) {
                console.log(JSON.stringify(full, null, 2))
                return
            }

            renderFullReport(full, chalk, Boolean(options.verbose))
            printFooter(chalk, quiet)
        })
}
