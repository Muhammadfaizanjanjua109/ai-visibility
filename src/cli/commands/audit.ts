// ============================================================
// CLI: audit + lint commands
// `audit` — the headline CLI feature: score a live URL or a local build
//   directory for AI/GEO readability, with a JSON mode and a CI exit-code
//   gate.
// `lint`  — a thin wrapper around the same core with CI-friendly defaults
//   (--dir . --fail-under 50). This *is* the "build-time GEO linter" —
//   building a second analysis engine would just be `audit` again.
// ============================================================

import type { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { ContentAnalyzer } from '../../analyzer/content-analyzer'
import type { AIReadabilityScore } from '../../types'
import { getChalk } from '../lib/chalk'
import type { Chalk } from '../lib/chalk'
import { findFiles, markdownToHTML, readSiteFile, SUPPORTED_EXTENSIONS } from '../lib/scan'
import { scoreColor, severityIcon } from '../lib/format'
import { printFooter } from '../lib/footer'

export interface AuditFileResult {
    file: string
    score: number
    result: AIReadabilityScore
}

interface RunAuditOptions {
    url?: string
    dir?: string
    json: boolean
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

/** Best-effort — a failed/missing robots.txt is "unknown", never a hard error. */
async function fetchRobotsTxt(origin: string): Promise<string | undefined> {
    try {
        const res = await fetch(`${origin}/robots.txt`, { signal: AbortSignal.timeout(5000) })
        return res.ok ? await res.text() : undefined
    } catch {
        return undefined
    }
}

/** Best-effort — a network failure is "unknown" (undefined); a clean 404 is a definite "no" (false). */
async function fetchLlmsTxtPresence(origin: string): Promise<boolean | undefined> {
    try {
        const res = await fetch(`${origin}/llms.txt`, { signal: AbortSignal.timeout(5000) })
        return res.ok
    } catch {
        return undefined
    }
}

async function auditUrl(rawUrl: string): Promise<AuditFileResult[]> {
    const url = new URL(rawUrl)
    const [html, robotsTxt, hasLlmsTxt] = await Promise.all([
        fetchPage(url.toString()),
        fetchRobotsTxt(url.origin),
        fetchLlmsTxtPresence(url.origin),
    ])

    const analyzer = new ContentAnalyzer()
    const result = await analyzer.analyze(html, { robotsTxt, hasLlmsTxt })
    return [{ file: url.toString(), score: result.overallScore, result }]
}

export async function auditDir(dir: string): Promise<AuditFileResult[]> {
    const files = findFiles(dir, SUPPORTED_EXTENSIONS)
    const robotsTxt = readSiteFile(dir, 'robots.txt')
    const hasLlmsTxt = readSiteFile(dir, 'llms.txt') !== undefined

    const analyzer = new ContentAnalyzer()
    const results: AuditFileResult[] = []

    for (const file of files) {
        let content = fs.readFileSync(file, 'utf-8')
        const ext = path.extname(file).toLowerCase()
        if (ext === '.md' || ext === '.mdx') content = markdownToHTML(content)

        const result = await analyzer.analyze(content, { robotsTxt, hasLlmsTxt })
        results.push({ file, score: result.overallScore, result })
    }

    return results
}

function renderReport(results: AuditFileResult[], chalk: Chalk, mode: 'audit' | 'lint'): void {
    const sorted = [...results].sort((a, b) => a.score - b.score)

    console.log(chalk.bold.cyan(`\n🤖 ai-visibility ${mode}\n`))

    for (const { file, score, result } of sorted) {
        const icon = score >= 80 ? '✅' : score >= 60 ? '⚠️ ' : '❌'
        console.log(`${icon} ${chalk.bold(file)} — ${scoreColor(score, chalk)}`)

        const b = result.breakdown
        console.log(chalk.gray(`   Answer placement: ${b.answerFrontLoading}  Fact density: ${b.factDensity}  Headings: ${b.headingStructure}  E-E-A-T: ${b.eeatSignals}  Snippability: ${b.snippability}  Schema: ${b.schemaCoverage}  Crawler access: ${b.crawlerAccessibility}`))

        for (const issue of result.issues.slice(0, 5)) {
            console.log(`   ${severityIcon(issue.severity)} ${chalk.white(issue.message)}`)
            console.log(`      ${chalk.gray('Fix: ' + issue.fix)}`)
        }
        if (result.issues.length > 5) {
            console.log(chalk.gray(`   ... and ${result.issues.length - 5} more issues`))
        }
        console.log()
    }

    const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    const passing = results.filter((r) => r.score >= 80).length

    console.log(chalk.bold('─'.repeat(50)))
    console.log(`${chalk.bold('Scanned:')} ${results.length}`)
    console.log(`${chalk.bold('Average score:')} ${scoreColor(avg, chalk)}`)
    console.log(`${chalk.bold('Passing (≥80):')} ${chalk.green(passing)} / ${results.length}`)
    console.log()
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

    renderReport(results, chalk, mode)
    if (opts.failUnder !== undefined) {
        const failed = process.exitCode === 1
        console.log(failed
            ? chalk.red(`❌ Below threshold: at least one score is under ${opts.failUnder}`)
            : chalk.green(`✅ All scores meet the ${opts.failUnder} threshold`))
        console.log()
    }
    printFooter(chalk, quiet)
}

export function registerAudit(program: Command): void {
    program
        .command('audit')
        .description('Audit a live URL or local build directory for AI/GEO readability')
        .argument('[url]', 'URL to audit (fetches the live page)')
        .option('--dir <path>', 'Audit a local build directory instead of a live URL')
        .option('--json', 'Output results as JSON')
        .option('--fail-under <n>', 'Exit with a non-zero code if any score is below this threshold (0-100) — for CI')
        .action(async (url: string | undefined, options, command: Command) => {
            await runAndReport(
                { url, dir: options.dir, json: Boolean(options.json), failUnder: parseThreshold(options.failUnder) },
                'audit',
                command
            )
        })

    program
        .command('lint')
        .description('Build-time GEO lint — audits a local directory with CI-friendly defaults (shorthand for: audit --dir . --fail-under 50)')
        .option('--dir <path>', 'Directory to lint', '.')
        .option('--json', 'Output results as JSON')
        .option('--fail-under <n>', 'Exit with a non-zero code if any score is below this threshold (0-100)', '50')
        .action(async (options, command: Command) => {
            await runAndReport(
                { dir: options.dir, json: Boolean(options.json), failUnder: parseThreshold(options.failUnder) },
                'lint',
                command
            )
        })
}
