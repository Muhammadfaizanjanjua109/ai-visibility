// ============================================================
// CLI: shared file scanning helpers
// Used by `analyze` and `audit`/`lint` (local-dir mode)
// ============================================================

import fs from 'fs'
import path from 'path'

export const SUPPORTED_EXTENSIONS = ['.html', '.htm', '.md', '.mdx']

export function findFiles(dir: string, extensions: string[]): string[] {
    const results: string[] = []

    function walk(current: string) {
        if (!fs.existsSync(current)) return
        const entries = fs.readdirSync(current, { withFileTypes: true })
        for (const entry of entries) {
            const fullPath = path.join(current, entry.name)
            if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                walk(fullPath)
            } else if (entry.isFile() && extensions.includes(path.extname(entry.name).toLowerCase())) {
                results.push(fullPath)
            }
        }
    }

    walk(dir)
    return results
}

/** Very basic Markdown -> HTML conversion, good enough for scoring purposes. */
export function markdownToHTML(md: string): string {
    return md
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\n\n(.+)/g, '\n\n<p>$1</p>')
}

/**
 * Best-effort read of a robots.txt/llms.txt file for a scanned directory —
 * checks the directory itself, then a `public/` subdirectory. Returns
 * undefined/false (never throws) when not found, matching AnalysisContext's
 * "unknown" semantics.
 */
export function readSiteFile(dir: string, filename: string): string | undefined {
    for (const candidate of [path.join(dir, filename), path.join(dir, 'public', filename)]) {
        if (fs.existsSync(candidate)) {
            try {
                return fs.readFileSync(candidate, 'utf-8')
            } catch {
                // fall through
            }
        }
    }
    return undefined
}
