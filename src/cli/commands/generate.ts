// ============================================================
// CLI: generate command
// Generate robots.txt, llms.txt, or schema from CLI
// Also registers top-level `robots`/`llms` aliases (see registerGenerate)
// ============================================================

import type { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { RobotsGenerator } from '../../generators/robots-generator'
import { LLMSTextGenerator } from '../../generators/llms-generator'
import { SchemaBuilder } from '../../schema/schema-builder'
import { getChalk } from '../lib/chalk'
import { printFooter } from '../lib/footer'

type RobotsPreset = 'allow-all' | 'block-training' | 'block-all'

function robotsContentForPreset(preset: RobotsPreset, sitemapUrl?: string): string {
    switch (preset) {
        case 'block-training':
            return RobotsGenerator.blockTraining({ sitemapUrl })
        case 'block-all':
            return RobotsGenerator.blockAll({ sitemapUrl })
        default:
            return RobotsGenerator.allowAll({ sitemapUrl })
    }
}

async function runGenerateRobots(options: any, command: Command): Promise<void> {
    const chalk = await getChalk()
    const quiet = Boolean(command.optsWithGlobals().quiet)

    // --block-training stays working for back-compat; --preset takes priority if both are set.
    const preset: RobotsPreset = options.preset ?? (options.blockTraining ? 'block-training' : 'allow-all')
    const content = robotsContentForPreset(preset, options.sitemap)

    const outPath = path.resolve(options.out)
    const dir = path.dirname(outPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    fs.writeFileSync(outPath, content)
    console.log(chalk.green(`✅ robots.txt generated (preset: ${preset}) → ${outPath}`))
    console.log(chalk.gray('\nContent preview:'))
    console.log(chalk.gray(content.split('\n').slice(0, 10).join('\n')))
    printFooter(chalk, quiet)
}

async function runGenerateLlms(options: any, command: Command): Promise<void> {
    const chalk = await getChalk()
    const quiet = Boolean(command.optsWithGlobals().quiet)

    const content = LLMSTextGenerator.minimal({
        siteName: options.siteName,
        description: options.description,
        baseUrl: options.baseUrl,
        pages: [
            { url: '/', title: 'Home', priority: 'high' },
            { url: '/about', title: 'About' },
            { url: '/docs', title: 'Documentation' },
        ],
    })

    const outPath = path.resolve(options.out)
    const dir = path.dirname(outPath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    fs.writeFileSync(outPath, content)
    console.log(chalk.green(`✅ llms.txt generated → ${outPath}`))
    console.log(chalk.gray('\nContent:'))
    console.log(chalk.gray(content))
    printFooter(chalk, quiet)
}

function addRobotsOptions(cmd: Command): Command {
    return cmd
        .description('Generate robots.txt with AI crawler rules')
        .option('--out <path>', 'Output path', './public/robots.txt')
        .option('--preset <preset>', 'allow-all | block-training | block-all')
        .option('--block-training', 'Shorthand for --preset block-training (deprecated, kept for back-compat)')
        .option('--sitemap <url>', 'Sitemap URL to include')
        .action(runGenerateRobots)
}

function addLlmsOptions(cmd: Command): Command {
    return cmd
        .description('Generate llms.txt for AI model indexing')
        .option('--out <path>', 'Output path', './public/llms.txt')
        .option('--site-name <name>', 'Site name', 'My Site')
        .option('--description <desc>', 'Site description', 'A website')
        .option('--base-url <url>', 'Base URL (e.g. https://mysite.com)')
        .action(runGenerateLlms)
}

export function registerGenerate(program: Command): void {
    const generate = program
        .command('generate')
        .description('Generate AI visibility config files')

    addRobotsOptions(generate.command('robots'))
    addLlmsOptions(generate.command('llms'))

    // Top-level aliases: `ai-visibility robots` / `ai-visibility llms`,
    // same generators, flatter ergonomics for the common case.
    addRobotsOptions(program.command('robots'))
    addLlmsOptions(program.command('llms'))

    // generate schema
    generate
        .command('schema')
        .description('Generate JSON-LD schema markup')
        .option('--type <type>', 'Schema type: faq | product | article | org | person', 'article')
        .option('--out <path>', 'Output path (optional, prints to stdout if not set)')
        .option('--name <name>', 'Name/headline')
        .option('--price <price>', 'Price (for product schema)')
        .option('--author <author>', 'Author name')
        .action(async (options, command: Command) => {
            const chalk = await getChalk()
            const quiet = Boolean(command.optsWithGlobals().quiet)
            let schema: Record<string, unknown>

            switch (options.type) {
                case 'faq':
                    schema = SchemaBuilder.faq([
                        { q: 'What is this?', a: 'Replace with your FAQ content' },
                        { q: 'How does it work?', a: 'Replace with your answer' },
                    ])
                    break
                case 'product':
                    schema = SchemaBuilder.product({
                        name: options.name ?? 'Product Name',
                        price: parseFloat(options.price ?? '0'),
                        currency: 'USD',
                        author: options.author ? { name: options.author } : undefined,
                    })
                    break
                case 'org':
                    schema = SchemaBuilder.organization({
                        name: options.name ?? 'Organization Name',
                    })
                    break
                case 'person':
                    schema = SchemaBuilder.person({
                        name: options.name ?? 'Person Name',
                    })
                    break
                default:
                    schema = SchemaBuilder.article({
                        headline: options.name ?? 'Article Title',
                        author: options.author,
                    })
            }

            const scriptTag = SchemaBuilder.toScriptTag(schema)

            if (options.out) {
                const outPath = path.resolve(options.out)
                fs.writeFileSync(outPath, scriptTag)
                console.log(chalk.green(`✅ Schema written → ${outPath}`))
            } else {
                console.log(chalk.bold.cyan('\n📋 JSON-LD Schema:\n'))
                console.log(scriptTag)
            }
            printFooter(chalk, quiet)
        })
}
