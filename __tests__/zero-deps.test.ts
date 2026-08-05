// ============================================================
// Tests: zero-runtime-dependency guarantee for edge-safe subpaths
//
// ai-visibility/detector and ai-visibility/schema are documented as having
// no runtime dependencies (safe for Edge Middleware / Cloudflare Workers /
// Deno). This walks their static import graph from source and fails if any
// file in that graph statically imports something outside the package
// (relative imports only). Dynamic `import()` calls (e.g. SchemaBuilder's
// lazy-loaded `cheerio` in fromHTML) are intentionally not static imports
// and are excluded — that's the whole point of loading it lazily.
// ============================================================

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

const SRC_ROOT = path.resolve(__dirname, '../src')

// Matches static `import ... from '...'` / `export ... from '...'` declarations.
// Deliberately does NOT match `import(...)` call expressions.
// Captures whether the import is type-only (`import type` / `export type`),
// since those are erased at compile time and carry no runtime dependency.
//
// The middle clause is deliberately narrow (a single `{...}` group, `* as x`,
// or a bare identifier) rather than a generic "any characters" wildcard —
// a loose `[^'";]*` here will happily skip past interface/type bodies that
// contain no semicolon and latch onto the next unrelated quoted string
// anywhere later in the file (e.g. inside a JSDoc @example). Requiring
// `from` immediately after a bounded clause avoids that false match.
const STATIC_IMPORT_RE = /^\s*(?:import|export)\s+(type\s+)?(?:\*\s+as\s+\w+|\{[^{}]*\}|\w+)?\s*from\s+['"]([^'"]+)['"]/gm

function collectStaticValueImportSpecifiers(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf8')
    const specifiers: string[] = []
    let match: RegExpExecArray | null
    STATIC_IMPORT_RE.lastIndex = 0
    while ((match = STATIC_IMPORT_RE.exec(content)) !== null) {
        const isTypeOnly = Boolean(match[1])
        if (!isTypeOnly) specifiers.push(match[2])
    }
    return specifiers
}

function resolveRelative(fromFile: string, specifier: string): string {
    const base = path.resolve(path.dirname(fromFile), specifier)
    const candidates = [base + '.ts', path.join(base, 'index.ts')]
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate
    }
    throw new Error(`Cannot resolve '${specifier}' from ${fromFile}`)
}

/** Walks the static (non-dynamic) import graph of an entrypoint and collects any non-relative specifiers found. */
function collectExternalStaticImports(entryFile: string): string[] {
    const visited = new Set<string>()
    const external = new Set<string>()
    const stack = [entryFile]

    while (stack.length > 0) {
        const file = stack.pop() as string
        if (visited.has(file)) continue
        visited.add(file)

        for (const specifier of collectStaticValueImportSpecifiers(file)) {
            if (specifier.startsWith('.')) {
                stack.push(resolveRelative(file, specifier))
            } else {
                external.add(specifier)
            }
        }
    }

    return [...external]
}

describe('zero runtime dependencies (edge-safe subpaths)', () => {
    it('ai-visibility/detector has no static external imports', () => {
        const external = collectExternalStaticImports(path.join(SRC_ROOT, 'entrypoints/detector.ts'))
        expect(external).toEqual([])
    })

    it('ai-visibility/schema has no static external imports (fromHTML lazily loads cheerio)', () => {
        const external = collectExternalStaticImports(path.join(SRC_ROOT, 'entrypoints/schema.ts'))
        expect(external).toEqual([])
    })

    it('the internal scoring-weights build artifact has no static external imports (must stay cheerio/undici-free — see scripts/generate-scoring-weights-json.js)', () => {
        const external = collectExternalStaticImports(path.join(SRC_ROOT, 'entrypoints/scoring-weights-internal.ts'))
        expect(external).toEqual([])
    })
})
