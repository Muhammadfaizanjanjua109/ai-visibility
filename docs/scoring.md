# AI Readiness Engine: Categories, Weights, and How to Use It Elsewhere

`ContentAnalyzer.audit()` scores a page across seven weighted, **page-level**
categories — **crawlability, answer placement, extractable evidence, entity
signals, structural formatting, content, and authority** — each broken into
named checks, and combines them into a single `overall` score (0-100) using
fixed, published weights. No machine
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

## The seven categories

Every category here is **page-level**: computable from one page's HTML and
response headers plus site-level files (robots.txt, llms.txt, ai.txt,
sitemap). Nothing in this file needs a live engine query. Signal that only
exists as a property of one engine's behaviour for one query at one moment
is measurement-level and lives in `dist/visibility-vector.json`, which
versions independently — see [measurement.md](./measurement.md).

That split is the point of `schemaVersion` 3. Collapsing both kinds of
signal into one 0-100 number meant the score silently misrepresented what
it had actually measured.

| Category | Key | Weight | Evidence | What it checks |
|---|---|---|---|---|
| Crawlability | `crawlability` | 0.18 | strong | robots.txt AI-crawler rules, llms.txt, ai.txt, sitemap discoverability, response time, JavaScript dependency. |
| Answer placement | `answerPlacement` | 0.18 | moderate | Whether a direct answer appears near the top, ahead of preamble. |
| Extractable evidence | `citationReadiness` | 0.22 | moderate | Verifiable numbers with units, explicit prices, dates, attributed claims, definitions, comparisons, external authoritative references. |
| Entity Signals | `entitySignals` | 0.16 | moderate | Organization and Person schema, valid JSON-LD, product/service relationships, sameAs links, machine-readable pricing. |
| Structural formatting | `structure` | 0.10 | weak | Heading hierarchy, semantic HTML landmarks, content-to-noise ratio, FAQ/How-to patterns. |
| Content | `content` | 0.09 | weak | Snippability, topical depth, freshness signals, multi-format support. |
| Authority | `authority` | 0.07 | moderate | Author attribution, About/Team signals, contact info, trust signals, verifiable claims. |

Weights sum to 1.0 and none is negative — both enforced by tests
(`__tests__/scoring-schema.test.ts`) and by the build script, so this table
can't silently drift from what the code computes.

Each category's score is the equal-weighted average of its own checks (see
`AuditResult.categories[key].checks` for the full breakdown — every check
carries its own `id`, `label`, and 0-100 `score`; run `audit --verbose` on
the CLI to see them all, not just the top issues).

### Why these weights

Every weight carries an `evidenceGrade` and a `rationale` naming the
finding it rests on. Findings are cited **descriptively, never by
identifier**: this file is vendored by three downstream consumers, and a
wrong arXiv ID in a vendored file is worse than no ID at all.

Only `crawlability` is graded `strong`, and it earns that by being
definitional rather than correlational — a page a crawler cannot fetch
cannot be cited, no study required. Every content-side lever is `moderate`
or `weak`. That is an honest reading of the current literature, not an
underclaim. A scalar aggregate is only defensible when its weights map to
an explicit objective; grading the content levers better than the evidence
supports would defeat the purpose of grading them at all.

What changed from v2 and why:

- **Answer placement was promoted out of `structure` (≈0.04 → 0.18).** It
  was one check among five in a category weighted 0.20, so the strongest
  single predictor in our own 50-site study carried roughly 4% of the
  overall score while inheriting the weakest-evidenced category's grade.
- **Extractable evidence rose 0.15 → 0.22.** A 2026 critical survey of 45
  GEO studies grades evidence-bearing content interventions in the
  moderate-to-strong band — the highest of any content-side lever it
  reviews. It is graded `moderate`, the lower end of that band: the survey
  reports a range across heterogeneous designs, and claiming the upper
  bound for our single highest weight would overstate what was replicated.
- **Structural formatting was halved, 0.20 → 0.10.** The survey reports
  controlled experiments where formatting changes made in isolation —
  reheading, list-ifying, adding landmarks without changing the underlying
  content — produced weak effects. Segmentability still matters as a floor,
  so it keeps a non-trivial weight, but it no longer outranks the evidence
  the segments contain.
- **Crawlability dropped 0.20 → 0.18.** No loss of importance: the hard
  gate, not the weight, carries the consequence.

Note that the check id for answer placement is still
`struct-answer-frontloading` despite now living in `answerPlacement`. The
id was deliberately left alone so consumers keyed on check ids keep
resolving across the reweight.

### No negative weights

There are none, and the schema rejects them. Retrieval risk — the chance a
rewrite makes a passage *less* likely to be retrieved — is a property of a
rewrite operation, not a property of a page, and belongs to `fix`, not to
scoring. Encoding it as a negative weight here would make the score
non-monotonic in ways no consumer could interpret.

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
scanner, the CrawlPod WordPress plugin, the Shopify app, and the Python
package should align to it rather than maintaining their own copies of the
weights — including their own copies of the *arithmetic*: as of v0.9.0 the
version guard, the weight validation, and `computeOverallScore()` are all
exported from this package for exactly that reason — a hand-maintained duplicate
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

`schemaVersion` 3 (v0.9.0+): `dimensions` is the seven **page-level**
categories, each carrying an `evidenceGrade` and a `rationale`. A `scope`
block states what the file does and does not claim to measure. The old
seven flat GEO dimensions remain published as `legacy_dimensions`.

```json
{
  "schemaVersion": 3,
  "packageVersion": "0.9.0",
  "generatedAt": "2026-09-02T00:00:00.000Z",
  "source": "https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/src/analyzer/scoring-weights.ts",
  "docs": "https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/scoring.md",
  "scope": {
    "level": "page",
    "computableFrom": ["page HTML", "response headers", "robots.txt", "llms.txt", "ai.txt", "sitemap.xml"],
    "excludes": "Anything requiring a live engine query — those live in visibility-vector.json."
  },
  "dimensions": [
    {
      "key": "crawlability",
      "label": "Crawlability",
      "weight": 0.18,
      "description": "...",
      "evidenceGrade": "strong",
      "rationale": "Definitional rather than correlational: ..."
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

### Version guard

Use `assertSupportedSchemaVersion()` rather than hand-rolling a check. It
rejects a mismatch **in both directions** and names both versions plus what
changed at each:

```ts
import { assertSupportedSchemaVersion, loadScoringWeights } from 'ai-visibility'

assertSupportedSchemaVersion(vendored.schemaVersion)      // vs this build (3)
assertSupportedSchemaVersion(vendored.schemaVersion, 2)   // vs a v2-pinned consumer
const weights = loadScoringWeights(vendored)              // version + weight-sum validated
```

Bidirectionality matters because the failure is asymmetric but equally
silent either way. A **v2 file read as v3** loses `answerPlacement`
entirely and renormalizes over six weights that no longer sum to 1.0. A
**v3 file read as v2** picks up a seventh category the consumer has no key
for and quietly drops 18% of the score. Neither throws on its own; both
just produce a plausible wrong number.

Assert at module load, not on first use — a schema drift should break every
consumer of the module immediately, not just the first one unlucky enough
to call a function.

### Migration from schemaVersion 2

`dist/scoring-weights.json` is vendored by three consumers. **None of them
can re-vendor this release without a code change.** The guard will throw on
the Shopify app; the Python package has no guard and would fail silently,
which is the more urgent of the two.

**Shopify app** (`crawlpod-shopify-1`, vendors via
`scripts/vendor-crawlpod-assets.ts` against a pinned npm version):

1. `app/lib/audit/scoring.ts` — bump `SUPPORTED_SCORING_SCHEMA_VERSION`
   from `2` to `3`.
2. Same file — add `"answerPlacement"` to the `CategoryKey` union. Without
   it, `getCategoryWeights()` returns a key TypeScript doesn't know and
   `computeOverallScore()` silently drops 0.18 of weight.
3. `app/lib/audit/aggregate.ts` — populate `answerPlacement` in
   `categoryScores`, or leave it absent deliberately. Absent is legitimate
   (`CategoryScores` is `Partial`, and renormalization handles it), but it
   must be a decision, not an oversight: absent means the audit reports
   nothing about the strongest predictor we measure.
4. `scripts/vendor-crawlpod-assets.ts` — bump `PINNED_VERSION` and
   optionally add `"visibility-vector.json"` to `VENDORED_FILES`.
5. `app/lib/audit/scoring.test.ts` — the "six current dimensions" guard and
   the exact-weights assertion both need updating to the seven v3 weights.
6. Consider deleting the local `computeOverallScore()` and
   `assertSupportedSchemaVersion()` in favour of the package's now that
   both are exported — that duplication is how the consumer's
   renormalization could drift from the weights it renormalizes over.

Note the pin is currently `0.8.2` while this package is at `0.8.0`; confirm
which is correct before bumping.

**Python package** (`ai-visibility-python`,
`src/ai_visibility/scoring_weights.py`):

This one is the silent-failure risk. It is still vendoring **schemaVersion
1** (`packageVersion` 0.5.0) and reads `data["dimensions"]` with **no
version guard at all**. A re-vendor today already picks up the v2 six
category keys, passes them unmapped through `_CAMEL_TO_SNAKE.get()`, and
returns a completely different dict from `get_default_weights()` without
raising. v3 makes that worse, not better.

1. Add a version guard before anything else — mirror
   `assertSupportedSchemaVersion`'s message, naming both the found and the
   expected version. This is required even if you do nothing else.
2. Then choose one:
   - **Stay on the legacy shape**: read `data["legacy_dimensions"]` instead
     of `data["dimensions"]`. `_CAMEL_TO_SNAKE` keeps working unchanged and
     the seven flat GEO keys are preserved. Lowest-effort correct fix.
   - **Migrate to v3 categories**: read `data["dimensions"]`, replace
     `_CAMEL_TO_SNAKE` with the category keys
     (`answer_placement`, `citation_readiness`, `entity_signals`,
     `crawlability`, `structure`, `content`, `authority`), and surface the
     new `evidence_grade` / `rationale` fields on `ScoringDimension`.
3. Either way, bump the vendored file and `packageVersion` together, and
   add a test asserting the vendored `schemaVersion` matches what the
   loader understands — the Shopify app has one, Python does not.

**WordPress plugin**: not currently reading `dimensions` programmatically;
no action required, but the same guard applies if that changes.

`schemaVersion` bumps only if the *shape* of the file changes in a way a
consumer would need to handle explicitly (as it did going from 1 to 2 here,
adding `legacy_dimensions`). Adding a new check, or changing a weight,
isn't a schema-version bump — it's a `packageVersion` bump, which is why
consumers should pin a version rather than track `@latest`.
