// ============================================================
// CLI: discover command
// Generates AI-search prompt clusters for a brand/category. Template-based
// — no engines/API keys needed, unlike `measure`.
// ============================================================

import type { Command } from 'commander'
import { PromptDiscovery } from '../../prompts/prompt-discovery'
import type { PromptCluster } from '../../types'
import { getChalk } from '../lib/chalk'
import type { Chalk } from '../lib/chalk'
import { printFooter } from '../lib/footer'

export function parseCommaList(value?: string): string[] {
    if (!value) return []
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
}

const DIVIDER = '━'.repeat(44)

export function renderDiscoverReport(brand: string, category: string, clusters: PromptCluster[], chalk: Chalk): void {
    const totalPrompts = clusters.reduce((sum, c) => sum + c.prompts.length, 0)

    console.log()
    console.log(chalk.dim(DIVIDER))
    console.log(chalk.bold.cyan('PROMPT DISCOVERY'))
    console.log(chalk.gray(`${brand} — ${category}`))
    console.log(chalk.dim(DIVIDER))
    console.log()

    for (const cluster of clusters) {
        console.log(chalk.bold(cluster.type.toUpperCase()))
        for (const prompt of cluster.prompts) {
            console.log(`  ${chalk.gray('-')} ${prompt}`)
        }
        console.log()
    }

    console.log(chalk.dim(DIVIDER))
    console.log(chalk.bold(`${totalPrompts} prompts`) + chalk.dim(` across ${clusters.length} clusters`))
    console.log()
}

export function registerDiscover(program: Command): void {
    program
        .command('discover')
        .description('Generate AI-search prompt clusters for a brand/category (template-based, no API keys needed)')
        .requiredOption('--brand <name>', 'Brand or product name')
        .requiredOption('--category <category>', 'Product category, e.g. "CRM software"')
        .option('--competitors <list>', 'Comma-separated competitor names')
        .option('--json', 'Output as JSON')
        .action(async (options, command: Command) => {
            const chalk = await getChalk()
            const quiet = Boolean(command.optsWithGlobals().quiet)

            const discovery = new PromptDiscovery()
            const clusters = discovery.discover({
                brand: options.brand,
                category: options.category,
                competitors: parseCommaList(options.competitors),
            })

            if (options.json) {
                console.log(JSON.stringify(clusters, null, 2))
                return
            }

            renderDiscoverReport(options.brand, options.category, clusters, chalk)
            printFooter(chalk, quiet)
        })
}
