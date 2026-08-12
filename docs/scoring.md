# AI Readiness Engine: Categories, Weights, and How to Use It Elsewhere

`ContentAnalyzer.audit()` scores a page across six weighted categories —
**crawlability, structure, entity signals, citation readiness, content, and
authority** — each broken into named checks, and combines them into a
single `overall` score (0-100) using fixed, published weights. No machine
learning, no black box: every category's contribution is a plain constant,
defined once in `src/analyzer/scoring-weights.ts` and re-exported as
`ContentAnalyzer.CATEGORY_WEIGHTS`, and documented here. (That data lives in
its own zero-dependency module — kept separate from `content-analyzer.ts`'s
`cheerio` import so build tooling can read it without pulling in
`cheerio`'s `undici` dependency; see the comment at the top of
`src/analyzer/scoring-weights.ts` for why that matters.)

**This is a heuristic, not a guarantee.** It estimates how easy a page is
for an AI system to discover, retrieve, cite, and recommend — the same way
Lighthouse estimates page performance without guaranteeing a specific
PageSpeed Insights score. Nothing here implies a Google Search ranking
outcome; Google's own guidance is that sites don't need special AI files to
be found. Treat the score as a prioritized to-do list, not a pass/fail
grade of AI visibility itself.

## The six categories

| Category | Key | Weight | What it checks |
|---|---|---|---|
| Crawlability | `crawlability` | 0.20 | Whether AI crawlers can discover and fetch the page at all: robots.txt AI-crawler rules, llms.txt, ai.txt, sitemap discoverability, response time, JavaScript dependency. |
| Structure | `structure` | 0.20 | Heading hierarchy, semantic HTML landmarks, content-to-noise ratio, answer front-loading, FAQ/How-to patterns. |
| Entity Signals | `entitySignals` | 0.20 | Organization and Person schema, product/service entity relationships, sameAs links, machine-readable pricing. |
| Citation Readiness | `citationReadiness` | 0.15 | Fact density, sourced statistics, unique/original data, comparison content, external authoritative references. |
| Content | `content` | 0.15 | Snippability, topical depth, freshness signals, multi-format support (text/tables/lists). |
| Authority | `authority` | 0.10 | Author attribution, About/Team signals, contact information, trust signals, external mention readiness (verifiable claims). |

Weights sum to 1.0 — enforced by a test (`__tests__/audit-engine.test.ts`),
so this table can't silently drift from what the code actually computes.

Each category's score is the equal-weighted average of its own checks (see
`AuditResult.categories[key].checks` for the full breakdown — every check
carries its own `id`, `label`, and 0-100 `score`; run `audit --verbose` on
the CLI to see them all, not just the top issues).

### Why these weights

Crawlability, structure, and entity signals are weighted highest (0.20
each): a page an AI system can't fetch, can't parse, or can't resolve to a
known entity fails before citation quality is even relevant. Citation
readiness and content (0.15 each) are what make a page *worth* citing once
it's reachable and parseable. Authority is weighted lowest (0.10) — it
corroborates the other categories rather than standing alone.

### Crawlability is a gate, not just a differentiator

A hard AI-crawler block — `<meta name="robots" content="noindex">`, or a
robots.txt that disallows every known AI crawler — zeroes `overall` to 0
regardless of every other category's score. Categories still report their
own individual scores in that case (so the rest of the report stays
useful), but `overall` reflects the reality that a fully blocked page has
zero AI visibility no matter how well-structured it is.

### Crawlability needs site context to be fully accurate

Called directly — `analyzer.audit(html)` — the crawlability checks can only
see the page's own `<meta name="robots">` tag. They can't see robots.txt,
llms.txt, ai.txt, sitemap presence, or response time without being told
about them. Pass a second argument to get the complete picture:

```ts
const result = await analyzer.audit(html, {
  robotsTxt: fetchedRobotsTxtContent,   // optional
  hasLlmsTxt: true,                     // optional
  llmsTxtContent: fetchedLlmsTxtContent, // optional — enables a validity check
  hasAiTxt: true,                       // optional
  hasSitemap: true,                     // optional
  responseTimeMs: 340,                  // optional
})
```

`ai-visibility audit <url>` and `audit --dir` both do this automatically —
fetching (or reading, for `--dir`) `robots.txt`/`llms.txt`/`ai.txt`/
`sitemap.xml` alongside the page itself, and timing the live page fetch.

## Using this from the CLI

```bash
npx ai-visibility audit <url>              # score a live page across 6 AI Readiness categories
npx ai-visibility audit --dir ./dist       # score a local build directory instead
npx ai-visibility audit <url> --json       # machine-readable output: full categories, checks, and issues
npx ai-visibility audit <url> --verbose    # print every individual check with its score, not just top issues
npx ai-visibility audit <url> --fail-under 70   # exit 1 if any score is below 70 — CI gate

npx ai-visibility lint                     # shorthand: audit --dir . --fail-under 50
```

`lint` exists for CI/build steps — same engine as `audit`, just pointed at
the current directory with a CI-sane default threshold, framed as
warnings. There's no separate "linter" implementation to keep in sync.

## Structured issues

Every failed (or partially failed) check produces an `AuditIssue`:

```ts
interface AuditIssue {
  id: string              // matching check id, e.g. "entity-organization-schema"
  category: AuditCategoryKey
  severity: 'critical' | 'warning' | 'suggestion'
  title: string
  description: string
  impact: string
  score_impact: number    // points lost on that check's own 0-100 scale
}
```

- **critical** — the site is fundamentally invisible or blocked to AI
  crawlers, or is missing a foundational entity signal AI systems need to
  resolve who/what the content is about (e.g. no Organization schema at
  all, or pricing text with no machine-readable Offer schema).
- **warning** — a significant gap that measurably reduces AI
  citation/discovery likelihood.
- **suggestion** — an optimization opportunity.

`result.issues` is sorted critical → warning → suggestion (ties broken by
`score_impact`, worst first). The non-verbose CLI report ("WHY YOU MAY BE
INVISIBLE TO AI") shows only the top 10; `--json` and `--verbose` both
surface every issue.

## Backward compatibility with the old flat score

`AuditResult` keeps two deprecated fields for consumers of the pre-v0.6.0
`AIReadabilityScore` shape:

- `result.score` mirrors `result.overall`.
- `result.dimensions` is a best-effort mapping back to the old seven GEO
  dimension keys (`answerFrontLoading`, `factDensity`, `headingStructure`,
  `eeatSignals`, `snippability`, `schemaCoverage`, `crawlerAccessibility`),
  derived from the new checks — not a byte-for-byte replay of the old math,
  since those checks no longer exist standalone. See
  `buildLegacyDimensions()` in `src/analyzer/audit-engine.ts` for the exact
  mapping.

Both log a one-time `console.warn` pointing at `overall`/`categories` the
first time each is *read* — they're intentionally non-enumerable, so
`JSON.stringify(result)` (and therefore `audit --json`) never triggers the
warning just by serializing a result. Migrate to `overall`/`categories`
when convenient; there's no removal timeline yet.

### The old `analyze()` / `AIReadabilityScore` API still works too

`ContentAnalyzer.analyze()` — the flat seven-dimension engine from v0.5.0 —
is unchanged and still exported; `audit()` is additive, not a replacement.
`SCORING_WEIGHTS` (the old seven dimensions) is still published as
`ContentAnalyzer.SCORING_WEIGHTS`. Prefer `audit()` for anything new.

## Canonical source for other CrawlPod surfaces

This package's scoring is the canonical implementation. crawlpod.com's
scanner and the CrawlPod WordPress plugin should align to it rather than
maintaining their own copies of the weights — a hand-maintained duplicate
is exactly the kind of drift that already happened once with the crawler
registry (see `docs/crawler-registry.md`).

The weights are published as `dist/scoring-weights.json`
(generated by `scripts/generate-scoring-weights-json.js`, same pattern as
`dist/crawlers.json`) and become fetchable, unauthenticated, from a CDN
mirror of the npm package the moment a new version ships:

```bash
curl -sL https://cdn.jsdelivr.net/npm/ai-visibility@0.6.0/dist/scoring-weights.json -o scoring-weights.json
```

Fetch at build/release time, pinned to a version — never at runtime, and
never `@latest` for anything beyond a quick check. Check `schemaVersion`
first and fail loudly if it's higher than what your consumer was written
against, rather than silently misreading a changed shape. Same rules as
`crawlers.json`'s consumption pattern in `docs/crawler-registry.md`.

### `dist/scoring-weights.json` shape

`schemaVersion` 2 (v0.6.0+): `dimensions` is now the six AI Readiness
categories; the old seven flat GEO dimensions are published alongside as
`legacy_dimensions` so existing WordPress/Python consumers reading
`dimensions` as the old shape don't silently misread it — they should
either switch to `legacy_dimensions` for a drop-in fix, or migrate to the
new `dimensions` shape.

```json
{
  "schemaVersion": 2,
  "packageVersion": "0.6.0",
  "generatedAt": "2026-08-12T00:00:00.000Z",
  "source": "https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/src/analyzer/scoring-weights.ts",
  "docs": "https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/scoring.md",
  "dimensions": [
    {
      "key": "crawlability",
      "label": "Crawlability",
      "weight": 0.2,
      "description": "..."
    }
  ],
  "legacy_dimensions": [
    {
      "key": "answerFrontLoading",
      "label": "Answer placement",
      "weight": 0.2,
      "description": "..."
    }
  ]
}
```

`schemaVersion` bumps only if the *shape* of the file changes in a way a
consumer would need to handle explicitly (as it did going from 1 to 2 here,
adding `legacy_dimensions`). Adding a new check, or changing a weight,
isn't a schema-version bump — it's a `packageVersion` bump, which is why
consumers should pin a version rather than track `@latest`.
