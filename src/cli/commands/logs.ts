// ============================================================
// CLI: logs command
// View AI crawler activity logs
// ============================================================

import type { Command } from 'commander'
import { AIVisitorLogger } from '../../monitor/visitor-logger'

async function getChalk() {
    const { default: chalk } = await import('chalk')
    return chalk
}

export function registerLogs(program: Command): void {
    program
        .command('logs')
        .description('View AI crawler activity logs')
        .option('--crawler <name>', 'Filter by crawler name (e.g. GPTBot)')
        .option('--days <n>', 'Show logs from last N days', '7')
        .option('--url <path>', 'Filter by URL path')
        .option('--summary', 'Show summary statistics only')
        .option('--log-file <path>', 'Path to log file', './logs/ai-crawler.json')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            const chalk = await getChalk()

            const logger = new AIVisitorLogger({
                storage: 'file',
                logFilePath: options.logFile,
            })

            const days = parseInt(options.days, 10)

            if (options.summary) {
                const stats = logger.getStats(days)

                if (options.json) {
                    console.log(JSON.stringify(stats, null, 2))
                    return
                }

                console.log(chalk.bold.cyan(`\n📊 AI Crawler Summary — Last ${days} days\n`))

                const entries = Object.values(stats)
                if (entries.length === 0) {
                    console.log(chalk.yellow('No AI crawler visits recorded yet.'))
                    console.log(chalk.gray('Make sure you have the AIVisitorLogger middleware running.\n'))
                    return
                }

                for (const stat of entries.sort((a, b) => (b as any).totalVisits - (a as any).totalVisits)) {
                    const s = stat as any
                    const successIcon = s.successRate >= 90 ? '✅' : s.successRate >= 70 ? '⚠️ ' : '❌'
                    console.log(`${successIcon} ${chalk.bold(s.botName)} ${chalk.gray(`(${s.company})`)}`)
                    console.log(`   Visits: ${chalk.cyan(s.totalVisits)}  Unique URLs: ${chalk.cyan(s.uniqueUrlCount ?? 0)}  Success rate: ${chalk.green(s.successRate + '%')}`)
                    console.log(`   Avg response: ${chalk.gray(Math.round(s.avgResponseTimeMs) + 'ms')}  Last seen: ${chalk.gray(new Date(s.lastSeen).toLocaleString())}`)
                    console.log()
                }

                return
            }

            // Detailed log view
            const logs = logger.getLogs({
                botName: options.crawler,
                days,
                url: options.url,
            })

            if (options.json) {
                console.log(JSON.stringify(logs, null, 2))
                return
            }

            console.log(chalk.bold.cyan(`\n🤖 AI Crawler Logs — Last ${days} days\n`))

            if (logs.length === 0) {
                console.log(chalk.yellow('No matching log entries found.'))
                if (options.crawler) {
                    console.log(chalk.gray(`No visits from ${options.crawler} in the last ${days} days.`))
                }
                console.log()
                return
            }

            // Show most recent first
            const sorted = [...logs].sort(
                (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )

            for (const log of sorted.slice(0, 50)) {
                const statusColor =
                    log.statusCode < 300
                        ? chalk.green(log.statusCode)
                        : log.statusCode < 400
                            ? chalk.yellow(log.statusCode)
                            : chalk.red(log.statusCode)

                const time = new Date(log.timestamp).toLocaleString()
                console.log(
                    `${chalk.gray(time)}  ${chalk.bold(log.botName)}  ${statusColor}  ${chalk.cyan(log.method)} ${log.url}  ${chalk.gray(log.responseTimeMs + 'ms')}`
                )
            }

            if (logs.length > 50) {
                console.log(chalk.gray(`\n... and ${logs.length - 50} more entries. Use --json for full output.`))
            }

            console.log()
        })
}
