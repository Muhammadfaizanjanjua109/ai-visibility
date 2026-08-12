// ============================================================
// CLI: shared score/issue formatting helpers
// Used by `analyze` and `audit`/`lint`
// ============================================================

import type { Chalk } from './chalk'
import type { AuditSeverity } from '../../types'

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

/** Renders a 0-100 score as a block-character progress bar, e.g. `████████░░`. No dependency — plain Unicode block chars. */
export function renderBar(score: number, width = 10): string {
    const filled = Math.max(0, Math.min(width, Math.round((score / 100) * width)))
    return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** Colors a rendered bar+score line to match `scoreColor`'s thresholds. */
export function colorByScore(text: string, score: number, chalk: Chalk): string {
    if (score >= 80) return chalk.green(text)
    if (score >= 60) return chalk.yellow(text)
    return chalk.red(text)
}

const AUDIT_SEVERITY_SYMBOL: Record<AuditSeverity, string> = {
    critical: '●',
    warning: '▲',
    suggestion: '○',
}

export function auditSeverityIcon(severity: AuditSeverity, chalk: Chalk): string {
    const symbol = AUDIT_SEVERITY_SYMBOL[severity]
    if (severity === 'critical') return chalk.red(symbol)
    if (severity === 'warning') return chalk.yellow(symbol)
    return chalk.blue(symbol)
}
