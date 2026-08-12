// ============================================================
// CLI: audit + lint commands
// `audit` — the headline CLI feature: run the AI Readiness Engine against a
//   live URL or a local build directory, with a JSON mode, a --verbose
//   full-check mode, and a CI exit-code gate.
// `lint`  — a thin wrapper around the same core with CI-friendly defaults
//   (--dir . --fail-under 50). This *is* the "build-time GEO linter" —
//   building a second analysis engine would just be `audit` again.
// ============================================================

import type { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { ContentAnalyzer } from '../../analyzer/content-analyzer'
import type { AnalysisContext, AuditResult, AuditSeverity } from '../../types'
import { getChalk } from '../lib/chalk'
import type { Chalk } from '../lib/chalk'
import { findFiles, markdownToHTML, readSiteFile, SUPPORTED_EXTENSIONS } from '../lib/scan'
import { auditSeverityIcon, colorByScore, renderBar, scoreColor } from '../lib/format'
import { printFooter } from '../lib/footer'

export interface AuditFileResult {
    file: string
    score: number
    result: AuditResult
}

interface RunAuditOptions {
    url?: string
    dir?: string
    json: boolean
    verbose: boolean
    failUnder?: number
}

/**
 * Pure exit-code logic: non-zero only when `failUnder` is set and at least
 * one score falls below it. No implicit default — CI gating is opt-in.
 */
export function computeExitCode(scores: number[], failUnder?: number): 0 | 1 {
    if (failUnder === undefined || scores.length === 0) return 0
    return scores.some((s) => s < failUnder) ? 1 : 0
}

function parseThreshold(value: string | undefined): number | undefined {
    if (value === undefined) return undefined
    const n = parseInt(value, 10)
    if (Number.isNaN(n)) return undefined
    return Math.max(0, Math.min(100, n))
}

async function fetchPage(url: string): Promise<string> {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'ai-visibility-cli (+https://crawlpod.com)' },
        signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.text()
}

/** Best-effort — a failed/missing fetch is "unknown", never a hard error. */
async function fetchTextFile(url: string): Promise<string | undefined> {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
        return res.ok ? await res.text() : undefined
    } catch {
        return undefined
    }
}

async function auditUrl(rawUrl: string): Promise<AuditFileResult[]> {
    const url = new URL(rawUrl)

    const pageStart = Date.now()
    const pagePromise = fetchPage(url.toString()).then((html) => ({ html, responseTimeMs: Date.now() - pageStart }))

    const [{ html, responseTimeMs }, robotsTxt, llmsTxtContent, aiTxtContent, sitemapContent] = await Promise.all([
        pagePromise,
        fetchTextFile(`${url.origin}/robots.txt`),
        fetchTextFile(`${url.origin}/llms.txt`),
        fetchTextFile(`${url.origin}/ai.txt`),
        fetchTextFile(`${url.origin}/sitemap.xml`),
    ])

    const context: AnalysisContext = {
        robotsTxt,
        hasLlmsTxt: llmsTxtContent !== undefined,
        llmsTxtContent,
        hasAiTxt: aiTxtContent !== undefined,
        hasSitemap: sitemapContent !== undefined || /sitemap\s*:/i.test(robotsTxt ?? ''),
        responseTimeMs,
    }

    const analyzer = new ContentAnalyzer()
    const result = await analyzer.audit(html, context)
    return [{ file: url.toString(), score: result.overall, result }]
}

export async function auditDir(dir: string): Promise<AuditFileResult[]> {
    const files = findFiles(dir, SUPPORTED_EXTENSIONS)
    const robotsTxt = readSiteFile(dir, 'robots.txt')
    const llmsTxtContent = readSiteFile(dir, 'llms.txt')
    const aiTxtContent = readSiteFile(dir, 'ai.txt')
    const sitemapContent = readSiteFile(dir, 'sitemap.xml')

    const context: AnalysisContext = {
        robotsTxt,
        hasLlmsTxt: llmsTxtContent !== undefined,
        llmsTxtContent,
        hasAiTxt: aiTxtContent !== undefined,
        hasSitemap: sitemapContent !== undefined || /sitemap\s*:/i.test(robotsTxt ?? ''),
    }

    const analyzer = new ContentAnalyzer()
    const results: AuditFileResult[] = []

    for (const file of files) {
        let content = fs.readFileSync(file, 'utf-8')
        const ext = path.extname(file).toLowerCase()
        if (ext === '.md' || ext === '.mdx') content = markdownToHTML(content)

        const result = await analyzer.audit(content, context)
        results.push({ file, score: result.overall, result })
    }

    return results
}

const DIVIDER = '━'.repeat(44)

function renderIssueSummary(result: AuditResult, chalk: Chalk): string {
    const counts: Record<AuditSeverity, number> = { critical: 0, warning: 0, suggestion: 0 }
    for (const issue of result.issues) counts[issue.severity]++
    return [
        `${auditSeverityIcon('critical', chalk)} ${counts.critical} Critical`,
        `${auditSeverityIcon('warning', chalk)} ${counts.warning} Warning${counts.warning === 1 ? '' : 's'}`,
        `${auditSeverityIcon('suggestion', chalk)} ${counts.suggestion} Suggestion${counts.suggestion === 1 ? '' : 's'}`,
    ].join('   ')
}

export function renderOneReport(file: string, result: AuditResult, chalk: Chalk, verbose: boolean): void {
    console.log(chalk.dim(DIVIDER))
    console.log(chalk.bold.cyan('AI VISIBILITY AUDIT'))
    console.log(chalk.gray(file))
    console.log(chalk.dim(DIVIDER))
    console.log()
    console.log(`${chalk.bold('Overall AI Readiness:')} ${scoreColor(result.overall, chalk)}`)
    console.log()

    for (const category of Object.values(result.categories)) {
        const bar = renderBar(category.score)
        const line = `${category.label.toUpperCase().padEnd(20)} ${bar} ${category.score}`
        console.log(colorByScore(line, category.score, chalk))
    }
    console.log()

    console.log(`${chalk.bold('Issues:')} ${result.issues.length} total`)
    console.log(renderIssueSummary(result, chalk))
    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log()

    if (result.issues.length > 0) {
        console.log(chalk.bold('WHY YOU MAY BE INVISIBLE TO AI'))
        console.log()
        for (const issue of result.issues.slice(0, 10)) {
            console.log(`${auditSeverityIcon(issue.severity, chalk)} ${issue.title}`)
        }
        console.log()
        console.log(chalk.dim(DIVIDER))
    }

    if (verbose) {
        console.log()
        console.log(chalk.bold('ALL CHECKS'))
        for (const category of Object.values(result.categories)) {
            console.log()
            console.log(chalk.bold(category.label))
            for (const check of category.checks) {
                console.log(`  ${scoreColor(check.score, chalk)}  ${check.label}`)
            }
        }
        console.log()
        console.log(chalk.dim(DIVIDER))
    }
}

function renderReport(results: AuditFileResult[], chalk: Chalk, verbose: boolean): void {
    console.log()
    for (const { file, result } of results) {
        renderOneReport(file, result, chalk, verbose)
        console.log()
    }

    if (results.length > 1) {
        const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
        const passing = results.filter((r) => r.score >= 80).length

        console.log(chalk.bold('─'.repeat(50)))
        console.log(`${chalk.bold('Scanned:')} ${results.length}`)
        console.log(`${chalk.bold('Average score:')} ${scoreColor(avg, chalk)}`)
        console.log(`${chalk.bold('Passing (≥80):')} ${chalk.green(passing)} / ${results.length}`)
        console.log()
    }
}

async function runAndReport(opts: RunAuditOptions, mode: 'audit' | 'lint', command: Command): Promise<void> {
    const chalk = await getChalk()
    const quiet = Boolean(command.optsWithGlobals().quiet)

    if (!opts.url && !opts.dir) {
        console.error(chalk.red('Provide a URL to audit, or --dir <path> for a local build directory.'))
        process.exitCode = 1
        return
    }
    if (opts.url && opts.dir) {
        console.error(chalk.red('Pass either a URL or --dir, not both.'))
        process.exitCode = 1
        return
    }

    let results: AuditFileResult[]
    try {
        results = opts.url ? await auditUrl(opts.url) : await auditDir(path.resolve(opts.dir!))
    } catch (err) {
        console.error(chalk.red(`❌ Audit failed: ${err instanceof Error ? err.message : String(err)}`))
        process.exitCode = 1
        return
    }

    if (results.length === 0) {
        console.log(chalk.yellow('⚠️  No HTML/Markdown files found to audit'))
        process.exitCode = 0
        return
    }

    process.exitCode = computeExitCode(results.map((r) => r.score), opts.failUnder)

    if (opts.json) {
        console.log(JSON.stringify(opts.url ? results[0] : results, null, 2))
        return
    }

    renderReport(results, chalk, opts.verbose)
    if (opts.failUnder !== undefined) {
        const failed = process.exitCode === 1
        console.log(failed
            ? chalk.red(`❌ Below threshold: at least one score is under ${opts.failUnder}`)
            : chalk.green(`✅ All scores meet the ${opts.failUnder} threshold`))
        console.log()
    }

    if (mode === 'audit') {
        printFooter(chalk, quiet, '🚀 Track scores over time → crawlpod.com/pro')
    } else {
        printFooter(chalk, quiet)
    }
}

export function registerAudit(program: Command): void {
    program
        .command('audit')
        .description('Run the AI Readiness Engine against a live URL or local build directory')
        .argument('[url]', 'URL to audit (fetches the live page)')
        .option('--dir <path>', 'Audit a local build directory instead of a live URL')
        .option('--json', 'Output results as JSON')
        .option('--verbose', 'Show every individual check with its score, not just the top issues')
        .option('--fail-under <n>', 'Exit with a non-zero code if any score is below this threshold (0-100) — for CI')
        .action(async (url: string | undefined, options, command: Command) => {
            await runAndReport(
                { url, dir: options.dir, json: Boolean(options.json), verbose: Boolean(options.verbose), failUnder: parseThreshold(options.failUnder) },
                'audit',
                command
            )
        })

    program
        .command('lint')
        .description('Build-time GEO lint — audits a local directory with CI-friendly defaults (shorthand for: audit --dir . --fail-under 50)')
        .option('--dir <path>', 'Directory to lint', '.')
        .option('--json', 'Output results as JSON')
        .option('--verbose', 'Show every individual check with its score, not just the top issues')
        .option('--fail-under <n>', 'Exit with a non-zero code if any score is below this threshold (0-100)', '50')
        .action(async (options, command: Command) => {
            await runAndReport(
                { dir: options.dir, json: Boolean(options.json), verbose: Boolean(options.verbose), failUnder: parseThreshold(options.failUnder) },
                'lint',
                command
            )
        })
}
