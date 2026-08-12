// ============================================================
// CLI: soft CTA footer
// One dim line, gone entirely under --quiet. No upsell block.
// ============================================================

import type { Chalk } from './chalk'

export function printFooter(chalk: Chalk, quiet: boolean, message = 'Powered by CrawlPod — https://crawlpod.com'): void {
    if (quiet) return
    console.log(chalk.dim(message))
}
