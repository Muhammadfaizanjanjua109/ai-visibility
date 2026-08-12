// ============================================================
// Tests: CLI audit/lint core logic
// (Not a child-process spawn test — see RELEASE_WORKFLOW.md/CHANGELOG for
// the manual "run the built CLI" verification step. These test the pure
// logic the `audit`/`lint` commands are built on.)
// ============================================================

import { describe, it, expect, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { computeExitCode, auditDir } from '../src/cli/commands/audit'

describe('computeExitCode', () => {
    it('is 0 when no threshold is set, regardless of scores', () => {
        expect(computeExitCode([10, 20, 30], undefined)).toBe(0)
    })

    it('is 0 when every score meets the threshold', () => {
        expect(computeExitCode([80, 90, 100], 70)).toBe(0)
    })

    it('is 1 when at least one score is below the threshold', () => {
        expect(computeExitCode([90, 50, 80], 70)).toBe(1)
    })

    it('is 0 for an empty score list even with a threshold set', () => {
        expect(computeExitCode([], 70)).toBe(0)
    })

    it('treats a score exactly at the threshold as passing', () => {
        expect(computeExitCode([70], 70)).toBe(0)
    })
})

describe('auditDir', () => {
    let dir: string

    afterEach(() => {
        if (dir) fs.rmSync(dir, { recursive: true, force: true })
    })

    it('scores every HTML/Markdown file in the directory, using robots.txt/llms.txt context if present', async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-visibility-audit-'))
        fs.writeFileSync(path.join(dir, 'index.html'), '<html><body><h1>Home</h1><p>This is the home page with enough content to be substantive.</p></body></html>')
        fs.writeFileSync(path.join(dir, 'about.md'), '# About\n\nWe are a company that does things.')
        fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\n')
        fs.writeFileSync(path.join(dir, 'llms.txt'), '# Site\n')

        const results = await auditDir(dir)

        expect(results).toHaveLength(2)
        for (const r of results) {
            expect(r.score).toBeGreaterThanOrEqual(0)
            expect(r.score).toBeLessThanOrEqual(100)
            expect(r.result.categories.crawlability.score).toBeGreaterThan(0)
        }
    })

    it('returns an empty array for a directory with no matching files', async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-visibility-audit-empty-'))
        fs.writeFileSync(path.join(dir, 'data.json'), '{}')

        const results = await auditDir(dir)
        expect(results).toEqual([])
    })

    it('flags a missing llms.txt when the directory has none', async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-visibility-audit-nollms-'))
        fs.writeFileSync(path.join(dir, 'index.html'), '<html><body><h1>Home</h1><p>Substantive content goes here for scoring.</p></body></html>')

        const results = await auditDir(dir)
        expect(results[0]!.result.issues.some((i) => i.title.includes('No llms.txt'))).toBe(true)
    })

    it('picks up ai.txt and sitemap.xml presence from the directory', async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-visibility-audit-aitxt-'))
        fs.writeFileSync(path.join(dir, 'index.html'), '<html><body><h1>Home</h1><p>Substantive content goes here for scoring.</p></body></html>')
        fs.writeFileSync(path.join(dir, 'ai.txt'), 'User-agent: *\nAllow: /\n')
        fs.writeFileSync(path.join(dir, 'sitemap.xml'), '<?xml version="1.0"?><urlset></urlset>')

        const results = await auditDir(dir)
        const crawlability = results[0]!.result.categories.crawlability
        expect(crawlability.checks.find((c) => c.id === 'crawl-ai-txt')?.score).toBe(100)
        expect(crawlability.checks.find((c) => c.id === 'crawl-sitemap')?.score).toBe(100)
    })

    it('treats a `Sitemap:` line in robots.txt as sitemap discoverability even without sitemap.xml on disk', async () => {
        dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-visibility-audit-sitemaprobots-'))
        fs.writeFileSync(path.join(dir, 'index.html'), '<html><body><h1>Home</h1><p>Substantive content goes here for scoring.</p></body></html>')
        fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml\n')

        const results = await auditDir(dir)
        const crawlability = results[0]!.result.categories.crawlability
        expect(crawlability.checks.find((c) => c.id === 'crawl-sitemap')?.score).toBe(100)
    })
})
