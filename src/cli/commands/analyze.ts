// ============================================================
// CLI: analyze command
// Scan HTML/Markdown files and score them for AI readability
// ============================================================

import type { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { ContentAnalyzer } from '../../analyzer/content-analyzer'
import { getChalk } from '../lib/chalk'
import { findFiles, markdownToHTML, SUPPORTED_EXTENSIONS } from '../lib/scan'
import { scoreColor, severityIcon } from '../lib/format'
import { printFooter } from '../lib/footer'

export function registerAnalyze(program: Command): void {
    program
        .command('analyze')
        .description('Analyze HTML/Markdown files for AI readability')
        .option('--dir <path>', 'Directory to scan', '.')
        .option('--file <path>', 'Analyze a single file')
        .option('--json', 'Output results as JSON')
        .option('--min-score <n>', 'Only show files below this score', '101')
        .action(async (options, command: Command) => {
            const chalk = await getChalk()
            const quiet = Boolean(command.optsWithGlobals().quiet)
            const analyzer = new ContentAnalyzer()

            let files: string[] = []

            if (options.file) {
                files = [path.resolve(options.file)]
            } else {
                const dir = path.resolve(options.dir)
                files = findFiles(dir, SUPPORTED_EXTENSIONS)
            }

            if (files.length === 0) {
                console.log(chalk.yellow('⚠️  No HTML or Markdown files found'))
                return
            }

            if (!options.json) {
                console.log(chalk.bold.cyan(`\n🔍 ai-visibility analyze\n`))
                console.log(chalk.gray(`Scanning ${files.length} file(s)...\n`))
            }

            const results: Array<{ file: string; score: number; result: Awaited<ReturnType<typeof analyzer.analyze>> }> = []
            const minScore = parseInt(options.minScore, 10)

            for (const file of files) {
                try {
                    let content = fs.readFileSync(file, 'utf-8')
                    const ext = path.extname(file).toLowerCase()

                    if (ext === '.md' || ext === '.mdx') {
                        content = markdownToHTML(content)
                    }

                    const result = await analyzer.analyze(content)
                    results.push({ file, score: result.overallScore, result })
                } catch (err) {
                    if (!options.json) {
                        console.log(chalk.red(`❌ Error analyzing ${file}: ${err}`))
                    }
                }
            }

            if (options.json) {
                console.log(JSON.stringify(results, null, 2))
                return
            }

            // Sort by score ascending (worst first)
            results.sort((a, b) => a.score - b.score)

            let shown = 0
            for (const { file, score, result } of results) {
                if (score >= minScore) continue
                shown++

                const relPath = path.relative(process.cwd(), file)
                const icon = score >= 80 ? '✅' : score >= 60 ? '⚠️ ' : '❌'

                console.log(`${icon} ${chalk.bold(relPath)} — ${scoreColor(score, chalk)}`)

                // Breakdown
                const b = result.breakdown
                console.log(chalk.gray(`   Answer placement: ${b.answerFrontLoading}  Fact density: ${b.factDensity}  Headings: ${b.headingStructure}  E-E-A-T: ${b.eeatSignals}  Schema: ${b.schemaCoverage}  Crawler access: ${b.crawlerAccessibility}`))

                // Issues
                for (const issue of result.issues.slice(0, 3)) {
                    console.log(`   ${severityIcon(issue.severity)} ${chalk.white(issue.message)}`)
                    console.log(`      ${chalk.gray('Fix: ' + issue.fix)}`)
                }

                if (result.issues.length > 3) {
                    console.log(chalk.gray(`   ... and ${result.issues.length - 3} more issues`))
                }

                console.log()
            }

            if (shown === 0) {
                console.log(chalk.green('✅ All files meet the minimum score threshold!\n'))
            }

            // Summary
            const avg = results.length > 0
                ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
                : 0
            const passing = results.filter((r) => r.score >= 80).length

            console.log(chalk.bold('─'.repeat(50)))
            console.log(`${chalk.bold('Files scanned:')} ${results.length}`)
            console.log(`${chalk.bold('Average score:')} ${scoreColor(avg, chalk)}`)
            console.log(`${chalk.bold('Passing (≥80):')} ${chalk.green(passing)} / ${results.length}`)
            console.log()
            printFooter(chalk, quiet)
        })
}
