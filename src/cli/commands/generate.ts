// ============================================================
// CLI: generate command
// Generate robots.txt, llms.txt, or schema from CLI
// ============================================================

import type { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { RobotsGenerator } from '../../generators/robots-generator'
import { LLMSTextGenerator } from '../../generators/llms-generator'
import { SchemaBuilder } from '../../schema/schema-builder'

async function getChalk() {
    const { default: chalk } = await import('chalk')
    return chalk
}

export function registerGenerate(program: Command): void {
    const generate = program
        .command('generate')
        .description('Generate AI visibility config files')

    // generate robots
    generate
        .command('robots')
        .description('Generate robots.txt with AI crawler rules')
        .option('--out <path>', 'Output path', './public/robots.txt')
        .option('--block-training', 'Block training bots (CCBot, GPTBot)')
        .option('--sitemap <url>', 'Sitemap URL to include')
        .action(async (options) => {
            const chalk = await getChalk()

            const content = options.blockTraining
                ? RobotsGenerator.blockTraining({ sitemapUrl: options.sitemap })
                : RobotsGenerator.allowAll({ sitemapUrl: options.sitemap })

            const outPath = path.resolve(options.out)
            const dir = path.dirname(outPath)
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

            fs.writeFileSync(outPath, content)
            console.log(chalk.green(`✅ robots.txt generated → ${outPath}`))
            console.log(chalk.gray('\nContent preview:'))
            console.log(chalk.gray(content.split('\n').slice(0, 10).join('\n')))
        })

    // generate llms
    generate
        .command('llms')
        .description('Generate llms.txt for AI model indexing')
        .option('--out <path>', 'Output path', './public/llms.txt')
        .option('--site-name <name>', 'Site name', 'My Site')
        .option('--description <desc>', 'Site description', 'A website')
        .option('--base-url <url>', 'Base URL (e.g. https://mysite.com)')
        .action(async (options) => {
            const chalk = await getChalk()

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
        })

    // generate schema
    generate
        .command('schema')
        .description('Generate JSON-LD schema markup')
        .option('--type <type>', 'Schema type: faq | product | article | org | person', 'article')
        .option('--out <path>', 'Output path (optional, prints to stdout if not set)')
        .option('--name <name>', 'Name/headline')
        .option('--price <price>', 'Price (for product schema)')
        .option('--author <author>', 'Author name')
        .action(async (options) => {
            const chalk = await getChalk()
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
        })
}
