// ============================================================
// CLI: init command
// Detects framework and scaffolds robots.txt + llms.txt
// ============================================================

import type { Command } from 'commander'
import fs from 'fs'
import path from 'path'
import { RobotsGenerator } from '../../generators/robots-generator'
import { LLMSTextGenerator } from '../../generators/llms-generator'

// Chalk is ESM-only in v5+, so we use a dynamic import
async function getChalk() {
    const { default: chalk } = await import('chalk')
    return chalk
}

interface FrameworkInfo {
    name: string
    configFile: string
    publicDir: string
    middlewareHint: string
}

const FRAMEWORKS: FrameworkInfo[] = [
    {
        name: 'Next.js',
        configFile: 'next.config.js',
        publicDir: 'public',
        middlewareHint: 'Add to middleware.ts in your project root',
    },
    {
        name: 'Nuxt',
        configFile: 'nuxt.config.ts',
        publicDir: 'public',
        middlewareHint: 'Add to server/middleware/ directory',
    },
    {
        name: 'Vite',
        configFile: 'vite.config.ts',
        publicDir: 'public',
        middlewareHint: 'Add to your Express/Fastify server',
    },
    {
        name: 'Express',
        configFile: 'package.json',
        publicDir: 'public',
        middlewareHint: 'Add app.use(createAIMiddleware()) before your routes',
    },
]

function detectFramework(cwd: string): FrameworkInfo | null {
    for (const fw of FRAMEWORKS) {
        if (fw.name === 'Express') continue // Express detected via package.json deps
        if (fs.existsSync(path.join(cwd, fw.configFile))) {
            return fw
        }
    }

    // Check package.json for express dependency
    try {
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'))
        const deps = { ...pkg.dependencies, ...pkg.devDependencies }
        if (deps['express']) return FRAMEWORKS.find((f) => f.name === 'Express')!
        if (deps['next']) return FRAMEWORKS.find((f) => f.name === 'Next.js')!
        if (deps['nuxt']) return FRAMEWORKS.find((f) => f.name === 'Nuxt')!
    } catch {
        // no package.json
    }

    return null
}

export function registerInit(program: Command): void {
    program
        .command('init')
        .description('Initialize ai-visibility in your project')
        .option('--dir <path>', 'Project directory', '.')
        .option('--site-name <name>', 'Your site name')
        .option('--site-url <url>', 'Your site URL (e.g. https://myapp.com)')
        .option('--block-training', 'Block training bots (CCBot, GPTBot) while allowing search bots')
        .action(async (options) => {
            const chalk = await getChalk()
            const cwd = path.resolve(options.dir)

            console.log(chalk.bold.cyan('\n🤖 ai-visibility init\n'))
            console.log(chalk.gray(`Working directory: ${cwd}\n`))

            // Detect framework
            const framework = detectFramework(cwd)
            if (framework) {
                console.log(chalk.green(`✅ Framework detected: ${framework.name}`))
            } else {
                console.log(chalk.yellow('⚠️  Could not auto-detect framework'))
            }

            const publicDir = path.join(cwd, framework?.publicDir ?? 'public')

            // Ensure public dir exists
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true })
                console.log(chalk.gray(`   Created ${framework?.publicDir ?? 'public'}/`))
            }

            // Generate robots.txt
            const robotsPath = path.join(publicDir, 'robots.txt')
            const robotsContent = options.blockTraining
                ? RobotsGenerator.blockTraining({ sitemapUrl: options.siteUrl ? `${options.siteUrl}/sitemap.xml` : undefined })
                : RobotsGenerator.allowAll({ sitemapUrl: options.siteUrl ? `${options.siteUrl}/sitemap.xml` : undefined })

            fs.writeFileSync(robotsPath, robotsContent)
            console.log(chalk.green(`✅ Generated ${framework?.publicDir ?? 'public'}/robots.txt`))

            // Generate llms.txt
            const llmsPath = path.join(publicDir, 'llms.txt')
            const siteName = options.siteName ?? path.basename(cwd)
            const llmsContent = LLMSTextGenerator.minimal({
                siteName,
                description: `${siteName} — Add your site description here`,
                baseUrl: options.siteUrl,
                pages: [
                    { url: '/', title: 'Home', priority: 'high' },
                    { url: '/about', title: 'About' },
                    { url: '/docs', title: 'Documentation' },
                ],
            })

            fs.writeFileSync(llmsPath, llmsContent)
            console.log(chalk.green(`✅ Generated ${framework?.publicDir ?? 'public'}/llms.txt`))

            // Print middleware instructions
            console.log(chalk.bold('\n📋 Next Steps:\n'))

            console.log(chalk.white('1. Install the package (if not done):'))
            console.log(chalk.gray('   npm install ai-visibility\n'))

            console.log(chalk.white('2. Add middleware to your app:'))
            if (framework?.name === 'Next.js') {
                console.log(chalk.gray(`
   // middleware.ts (project root)
   import { createAIMiddleware } from 'ai-visibility'
   export const middleware = createAIMiddleware()
   export const config = { matcher: ['/:path*'] }
`))
            } else if (framework?.name === 'Express') {
                console.log(chalk.gray(`
   // app.js / server.js
   import { createAIMiddleware, optimizeResponseForAI } from 'ai-visibility'
   app.use(createAIMiddleware())
   app.use(optimizeResponseForAI())
`))
            } else {
                console.log(chalk.gray(`
   import { createAIMiddleware } from 'ai-visibility'
   app.use(createAIMiddleware())
`))
            }

            console.log(chalk.white('3. Analyze your content:'))
            console.log(chalk.gray('   npx ai-visibility analyze --dir ./pages\n'))

            console.log(chalk.white('4. Monitor AI crawler visits:'))
            console.log(chalk.gray('   npx ai-visibility logs --summary\n'))

            console.log(chalk.bold.green('🚀 You\'re all set! Your site is now AI-visibility ready.\n'))
        })
}
