// ============================================================
// CLI: citations command
// "Where does AI learn about you?" — runs (or loads via --from) a
// MeasurementReport through the CitationAnalyzer and prints a breakdown of
// citation sources by type, domain vs. third-party coverage, and sources
// that cite competitors but never the brand.
// ============================================================

import type { Command } from 'commander'
import { CitationAnalyzer } from '../../citations/analyzer'
import type { CitationReport, CitationSource, SourceType } from '../../types'
import { getChalk } from '../lib/chalk'
import type { Chalk } from '../lib/chalk'
import { printFooter } from '../lib/footer'
import { resolveMeasurementReport } from '../lib/report-source'

const DIVIDER = '━'.repeat(44)
const DEFAULT_SOURCE_LIMIT = 10

const TYPE_LABEL: Record<SourceType, string> = {
    'own-domain': 'own',
    'review-site': 'review',
    'comparison-site': 'comparison',
    news: 'news',
    forum: 'forum',
    social: 'social',
    documentation: 'docs',
    marketplace: 'marketplace',
    other: 'other',
}

function pct(rate: number): number {
    return Math.round(rate * 100)
}

function renderSourcesTable(sources: CitationSource[], chalk: Chalk): void {
    if (sources.length === 0) {
        console.log(chalk.dim('  (none found)'))
        return
    }

    const domainWidth = Math.max(6, ...sources.map((s) => s.domain.length))
    console.log(chalk.bold(`${'Source'.padEnd(domainWidth)}  Mentions  Type`))
    console.log(chalk.dim('─'.repeat(domainWidth + 24)))
    for (const source of sources) {
        console.log(`${source.domain.padEnd(domainWidth)}  ${String(source.mentions).padStart(8)}  ${TYPE_LABEL[source.type]}`)
    }
}

export function renderCitationReport(report: CitationReport, chalk: Chalk, verbose: boolean): void {
    const shown = verbose ? report.sources : report.sources.slice(0, DEFAULT_SOURCE_LIMIT)

    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log(chalk.bold.cyan('CITATION INTELLIGENCE'))
    console.log(chalk.dim(DIVIDER))
    console.log()
    console.log(`${chalk.bold('Brand:')} ${report.brand}`)
    console.log(`${chalk.bold('Domain:')} ${report.brandDomain}`)
    console.log()

    console.log(chalk.bold('WHERE AI LEARNS ABOUT YOU'))
    console.log()
    renderSourcesTable(shown, chalk)
    if (!verbose && report.sources.length > shown.length) {
        console.log(chalk.dim(`  … and ${report.sources.length - shown.length} more (--verbose to show all)`))
    }
    console.log()
    console.log(`${chalk.bold('YOUR DOMAIN COVERAGE:')} ${pct(report.domainCoverage)}%`)
    console.log(`${chalk.bold('THIRD-PARTY COVERAGE:')} ${pct(report.thirdPartyCoverage)}%`)
    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log()

    console.log(chalk.bold('SOURCES CITING COMPETITORS BUT NOT YOU'))
    console.log()
    if (report.topCompetitorSources.length === 0) {
        console.log(chalk.dim('  (none found)'))
    } else {
        for (const source of report.topCompetitorSources) {
            console.log(`${source.domain} ${chalk.dim('→')} ${source.mentionsCompetitors.join(', ')}`)
        }
    }
    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log()
}

export function registerCitations(program: Command): void {
    program
        .command('citations')
        .description('Analyze where AI engines learn about your brand (citation source breakdown)')
        .requiredOption('--domain <domain>', "Your brand's own domain, e.g. acmecrm.com")
        .option('--brand <name>', 'Brand or product name (required unless --from)')
        .option('--category <category>', 'Product category, e.g. "CRM software" (required unless --from)')
        .option('--competitors <list>', 'Comma-separated competitor names')
        .option('--runs <n>', 'Repetitions per prompt per engine (default 3, max 10)', '3')
        .option('--from <file>', 'Load a previously saved `measure --json` report instead of re-querying engines')
        .option('--json', 'Output the full CitationReport as JSON')
        .option('--verbose', 'Show every source, not just the top ones')
        .action(async (options, command: Command) => {
            const chalk = await getChalk()
            const quiet = Boolean(command.optsWithGlobals().quiet)

            const measurementReport = await resolveMeasurementReport(options, chalk)
            if (!measurementReport) return

            const report = new CitationAnalyzer().analyze(measurementReport, options.domain)

            if (options.json) {
                console.log(JSON.stringify(report, null, 2))
                return
            }

            renderCitationReport(report, chalk, Boolean(options.verbose))
            printFooter(chalk, quiet)
        })
}
