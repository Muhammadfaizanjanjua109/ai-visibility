// ============================================================
// CLI: analyze command
// Scan HTML/Markdown files and score them for AI readability
// ============================================================

import type { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { ContentAnalyzer } from '../../analyzer/content-analyzer'

async function getChalk() {
    const { default: chalk } = await import('chalk')
    return chalk
}

const SUPPORTED_EXTENSIONS = ['.html', '.htm', '.md', '.mdx']

function findFiles(dir: string, extensions: string[]): string[] {
    const results: string[] = []

    function walk(current: string) {
        if (!fs.existsSync(current)) return
        const entries = fs.readdirSync(current, { withFileTypes: true })
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name)
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                walk(fullPath)
            } else if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
                results.push(fullPath)
            }
        }
    }

    walk(dir)
    return results
}

function markdownToHTML(md: string): string {
    // Very basic Markdown → HTML conversion for analysis purposes
    return md
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\n\n(.+)/g, '\n\n<p>$1</p>')
}

function scoreColor(score: number, chalk: Awaited<ReturnType<typeof getChalk>>): string {
    if (score >= 80) return chalk.green(`${score}/100`)
    if (score >= 60) return chalk.yellow(`${score}/100`)
    return chalk.red(`${score}/100`)
}

function severityIcon(severity: string): string {
    if (severity === 'high') return '🔴'
    if (severity === 'medium') return '🟡'
    return '🔵'
}

export function registerAnalyze(program: Command): void {
    program
        .command('analyze')
        .description('Analyze HTML/Markdown files for AI readability')
        .option('--dir <path>', 'Directory to scan', '.')
        .option('--file <path>', 'Analyze a single file')
        .option('--json', 'Output results as JSON')
        .option('--min-score <n>', 'Only show files below this score', '101')
        .action(async (options) => {
            const chalk = await getChalk()
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
                console.log(chalk.gray(`   Answer placement: ${b.answerFrontLoading}  Fact density: ${b.factDensity}  Headings: ${b.headingStructure}  E-E-A-T: ${b.eeatSignals}  Schema: ${b.schemaCoverage}`))

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
        })
}
