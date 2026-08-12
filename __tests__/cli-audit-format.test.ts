// ============================================================
// Tests: CLI audit output formatting
// (Format helpers as pure functions, plus renderOneReport's console output
// captured via a spy — no child-process spawn, matching cli-audit.test.ts's
// convention. See RELEASE_WORKFLOW.md/CHANGELOG for the manual "run the
// built CLI" verification step.)
// ============================================================

import { describe, it, expect, vi, afterEach } from 'vitest'
import { auditSeverityIcon, colorByScore, renderBar } from '../src/cli/lib/format'
import { getChalk } from '../src/cli/lib/chalk'
import { renderOneReport } from '../src/cli/commands/audit'
import { ContentAnalyzer } from '../src/analyzer/content-analyzer'

describe('renderBar', () => {
    it('renders an all-filled bar for a perfect score', () => {
        expect(renderBar(100)).toBe('█'.repeat(10))
    })

    it('renders an all-empty bar for a zero score', () => {
        expect(renderBar(0)).toBe('░'.repeat(10))
    })

    it('renders a proportional mix of filled/empty for a mid score', () => {
        const bar = renderBar(50)
        expect(bar).toBe('█████░░░░░')
        expect(bar.length).toBe(10)
    })

    it('always returns exactly `width` characters', () => {
        for (const score of [1, 7, 33, 61, 99]) {
            expect(renderBar(score).length).toBe(10)
        }
    })

    it('supports a custom width', () => {
        expect(renderBar(100, 5)).toBe('█████')
        expect(renderBar(0, 5)).toBe('░░░░░')
    })
})

describe('auditSeverityIcon', () => {
    it('uses the documented symbol per severity', async () => {
        const chalk = await getChalk()
        // chalk.level may be 0 in a non-TTY test runner, in which case color
        // codes are stripped — either way the underlying symbol must appear.
        expect(auditSeverityIcon('critical', chalk)).toContain('●')
        expect(auditSeverityIcon('warning', chalk)).toContain('▲')
        expect(auditSeverityIcon('suggestion', chalk)).toContain('○')
    })
})

describe('colorByScore', () => {
    it('returns the input text unchanged in content regardless of score tier', async () => {
        const chalk = await getChalk()
        for (const score of [10, 65, 95]) {
            expect(colorByScore('hello', score, chalk)).toContain('hello')
        }
    })
})

describe('renderOneReport', () => {
    const RICH_HTML = `
    <html><head>
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Acme","url":"https://acme.example","logo":"https://acme.example/logo.png"}</script>
    </head><body><main><article>
      <h1>Acme is a widget platform</h1>
      <p>Acme is a platform that helps teams ship 40% faster according to a 2024 study.</p>
      <h2>Details</h2><p>More detail about the platform and its many substantive features here.</p>
    </article></main><footer><a href="mailto:hi@acme.example">Contact</a></footer></body></html>
    `

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('prints the overall score, all six category bars, and an issue summary line', async () => {
        const chalk = await getChalk()
        const analyzer = new ContentAnalyzer()
        const result = await analyzer.audit(RICH_HTML)
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

        renderOneReport('test.html', result, chalk, false)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        expect(output).toContain('AI VISIBILITY AUDIT')
        expect(output).toContain('test.html')
        expect(output).toContain(`Overall AI Readiness:`)
        expect(output).toContain('CRAWLABILITY')
        expect(output).toContain('STRUCTURE')
        expect(output).toContain('ENTITY SIGNALS')
        expect(output).toContain('CITATION READINESS')
        expect(output).toContain('CONTENT')
        expect(output).toContain('AUTHORITY')
        expect(output).toContain(`Issues: ${result.issues.length} total`)
        expect(output).toContain('WHY YOU MAY BE INVISIBLE TO AI')
    })

    it('caps the "WHY YOU MAY BE INVISIBLE" section at 10 issues even when more exist', async () => {
        const analyzer = new ContentAnalyzer()
        const thinHtml = '<html><body><h3>x</h3><p>short</p></body></html>'
        const result = await analyzer.audit(thinHtml)
        expect(result.issues.length).toBeGreaterThan(10)

        const chalk = await getChalk()
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        renderOneReport('thin.html', result, chalk, false)

        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
        const whyIndex = output.indexOf('WHY YOU MAY BE INVISIBLE TO AI')
        const afterWhy = output.slice(whyIndex)
        const shownTitles = result.issues.slice(0, 10).map((i) => i.title)
        const hiddenTitles = result.issues.slice(10).map((i) => i.title)

        for (const title of shownTitles) expect(afterWhy).toContain(title)
        for (const title of hiddenTitles) expect(afterWhy).not.toContain(title)
    })

    it('does not print an "ALL CHECKS" section unless verbose is true', async () => {
        const chalk = await getChalk()
        const analyzer = new ContentAnalyzer()
        const result = await analyzer.audit(RICH_HTML)

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        renderOneReport('test.html', result, chalk, false)
        expect(logSpy.mock.calls.map((c) => c.join(' ')).join('\n')).not.toContain('ALL CHECKS')
    })

    it('prints every individual check with its score when verbose is true', async () => {
        const chalk = await getChalk()
        const analyzer = new ContentAnalyzer()
        const result = await analyzer.audit(RICH_HTML)

        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        renderOneReport('test.html', result, chalk, true)
        const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')

        expect(output).toContain('ALL CHECKS')
        const allChecks = Object.values(result.categories).flatMap((c) => c.checks)
        expect(allChecks.length).toBeGreaterThan(20)
        for (const check of allChecks) {
            expect(output).toContain(check.label)
        }
    })

    it('never triggers the AuditResult.score/dimensions deprecation warnings', async () => {
        const chalk = await getChalk()
        const analyzer = new ContentAnalyzer()
        const result = await analyzer.audit(RICH_HTML)

        vi.spyOn(console, 'log').mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        renderOneReport('test.html', result, chalk, true)

        expect(warnSpy).not.toHaveBeenCalled()
    })
})
