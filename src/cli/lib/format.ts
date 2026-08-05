// ============================================================
// CLI: shared score/issue formatting helpers
// Used by `analyze` and `audit`/`lint`
// ============================================================

import type { Chalk } from './chalk'

export function scoreColor(score: number, chalk: Chalk): string {
    if (score >= 80) return chalk.green(`${score}/100`)
    if (score >= 60) return chalk.yellow(`${score}/100`)
    return chalk.red(`${score}/100`)
}

export function severityIcon(severity: string): string {
    if (severity === 'high') return '🔴'
    if (severity === 'medium') return '🟡'
    return '🔵'
}
