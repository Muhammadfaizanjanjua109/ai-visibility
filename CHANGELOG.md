# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.9.0] - 2026-09-02

**Breaking for vendored consumers.** `dist/scoring-weights.json` bumps to
`schemaVersion` 3. Every consumer must make a code change before
re-vendoring — see [docs/migration-schemaversion-3.md](./docs/migration-schemaversion-3.md).

Theme: "Say what you measured." The scoring model mixed two fundamentally
different kinds of signal into one weights file. Some dimensions are
computable from a page's HTML. Others are properties of a specific engine's
behaviour for a specific query at a specific moment, and cannot be derived
from HTML at all. Collapsing both into one 0-100 score meant the score
silently misrepresented what it had measured. v0.9.0 splits them into two
files with independent version counters.

### Added

- **`dist/visibility-vector.json`** (`schemaVersion` 1) — the
  measurement-level schema: a field manifest for per-`(query, engine, run)`
  observations. Versions independently of `scoring-weights.json`.
- **Denominator decomposition.** `decomposeVisibility()` reports
  `Pr(cited) = Pr(activated) × Pr(retrieved | activated) × Pr(cited | retrieved)`
  as three separate quantities, never pre-multiplied. Runs where search
  never activated, that errored, or that returned nothing are retained in
  the denominators — they are outcomes, not absences. One reviewed
  configuration found 57.8% of ChatGPT repetitions never activated web
  search; filtering those inflates every rate by more than 2×.
- **Explicit null semantics.** `Observed<T>` carries a status —
  `observed` / `not-observable` / `not-evaluated`. No measurement field is
  ever `undefined`. Conditional probabilities are `null`, not `0`, when
  their denominator is empty.
- **`searchActivation` is tri-state** (`activated` / `not-activated` /
  `unknown`), with `unknown` counting toward neither and tracked separately
  in `runsActivationUnknown`. Forced by reality: only the Perplexity and
  Gemini adapters can observe activation at all.
- **`ENGINE_OBSERVABILITY`** — published per-engine capability table, so a
  low `pActivated` is distinguishable from a sample where nothing was
  observable.
- **`evidenceGrade` and `rationale` on every scoring dimension.** Findings
  are cited descriptively, never by identifier — this file is vendored, and
  an unverifiable ID in a vendored file is worse than no ID.
- **`assertSupportedSchemaVersion()`, `loadScoringWeights()`,
  `assertValidWeights()`, `getCategoryWeights()`, `computeOverallScore()`**
  are now exported from this package. They previously existed only as
  reimplementations inside consumers, which is how a consumer's
  renormalization could drift from the weights it renormalizes over. The
  guard rejects a mismatch in **both** directions and names both versions.
- **`assertSupportedVisibilityVectorSchemaVersion()`** — separate constant,
  separate error text. A matching scoring version never implies a matching
  vector version.

### Changed

- **`scoring-weights.json` is page-level only**, with a `scope` block
  stating what it does and does not claim to measure.
- **`answerPlacement` is its own category** (0.18), split out of
  `structure`. It was one check among five in a 0.20 category, so the
  strongest single predictor in our 50-site study carried ~4% of the
  overall score while inheriting the weakest-evidenced category's grade.
- **Extractable evidence up 0.15 → 0.22**, `citationReadiness` key
  unchanged, relabelled from "Citation Readiness". A 2026 critical survey
  of 45 GEO studies grades evidence-bearing interventions moderate-to-strong
  — the highest of any content-side lever it reviews.
- **Structural formatting halved, 0.20 → 0.10**, relabelled from
  "Structure". The survey reports controlled experiments where
  formatting-only changes produced weak effects.
- Remaining reweights: `crawlability` 0.20 → 0.18, `entitySignals`
  0.20 → 0.16, `content` 0.15 → 0.09, `authority` 0.10 → 0.07.

### Unchanged (deliberately)

- **The crawlability hard gate.** A `<meta name="robots">` noindex or a
  robots.txt blocking every known AI crawler still zeroes `overall`
  outright. Covered by existing tests plus new ones on the extracted
  `computeOverallScore()`.
- **Check ids.** `struct-answer-frontloading` keeps its id despite moving
  category, so consumers keyed on ids keep resolving.
- **`CategoryScores` stays `Partial`** — absent means not-applicable, not
  zero, and is excluded from both numerator and weight denominator.
- **No negative weights, anywhere.** Retrieval risk is a property of a
  rewrite operation, not a scoring dimension; it belongs to `fix`. The
  schema rejects negative weights at load and at build time.
- `MeasurementEngine`'s sampling and CI logic. No new checks were added.

### Tests

293 → 352. New coverage for the v2/v3 version guard in both directions,
weights summing to 1.0 with no negatives, the hard gate still zeroing,
renormalization after the reweight, and denominator decomposition including
the zero-activation edge case.

## [0.8.2] - 2026-08-13

Patch: bug fixes and API-surface cleanup, no new features.

### Fixed

- CLI `--version` now reads from `package.json` at runtime instead of a hardcoded string that had drifted out of sync with the actual package version.
- `OpenAIAdapter`/`PerplexityAdapter`/`GeminiAdapter`/`AnthropicAdapter` now validate the parsed JSON response shape before use, throwing a descriptive `EngineResponseError` (exported from `ai-visibility/engines`) instead of surfacing a confusing downstream error on a malformed API response.
- `mean`, `variance`, `confidenceInterval` (internal statistics helpers) and `analyzeEntities`/`EntityOutcome` (internal entity-detection helpers) are no longer exported from `ai-visibility/measure` — they were never meant to be public API, only used internally by `MeasurementEngine`.
- npm `homepage` field now points to https://crawlpod.com instead of the GitHub README.

### Changed

- Crawler registry re-verified against vendor documentation for August 2026; added `Meta-WebIndexer` and `Meta-ExternalFetcher` (both newly documented by Meta). See [docs/crawler-registry.md](./docs/crawler-registry.md) for what was checked and deliberately not added (Google-CloudVertexBot, Meta-ExternalAds, FacebookExternalHit, xAI/Grok, DeepSeek).

## [0.8.0] - 2026-08-12

Minor, not patch: two new subpath exports (`ai-visibility/citations`,
`/competitor`) and three new CLI commands (`citations`, `compare`,
`report`) — all additive, nothing existing changed.

Theme: "Know Why You're Invisible." v0.7.0's Measurement Engine tells you
*whether* AI engines mention your brand; it doesn't say *where* they got
that information from, or *why* a competitor keeps winning. v0.8.0 is the
intelligence layer on top: `CitationAnalyzer` mines a `MeasurementReport`'s
raw responses for citation sources (own domain, review sites, comparison
sites, news, forums, social, documentation, marketplaces) and reports
domain-vs-third-party coverage plus which sources cite competitors but
never you; `CompetitorAnalyzer` turns the same data into up to seven
ranked, evidence-backed `GapReason`s per competitor — citation gap, prompt-
cluster coverage, recommendation rate, per-engine blind spots, listing
position, missing comparison content, review/social proof — each with a
concrete action item. Every reason is derived from real measurement data;
nothing is fabricated when the data doesn't support it. All three new CLI
commands accept `--from <file>` to reuse a previously saved
`measure --json` report instead of re-querying engines.

### Added

- **`ai-visibility/citations`** — `CitationAnalyzer.analyze(report, brandDomain)`: extracts citation sources from a `MeasurementReport` (building on v0.7.0's `citedUrls`, plus new markdown-link and known-domain bare-mention extraction — "according to G2" with no URL still resolves to `g2.com`), classifies each by `SourceType` via plain domain pattern matching, and aggregates into a `CitationReport` (`sources`, `sourcesByType`, `domainCoverage`, `thirdPartyCoverage`, `topCompetitorSources`).
- **`ai-visibility/competitor`** — `CompetitorAnalyzer.analyze(report, brand, competitors)`: computes each competitor's visibility gap and runs seven gap-reason detectors against the measurement data, emitting only the reasons the data actually supports, sorted by impact (`classifyImpactByRatio`/`classifyImpactByPercentGap`, both exported).
- **`citations` CLI command** — prints where AI engines learn about your brand: a source table (domain, mentions, type), your-domain vs. third-party coverage split, and sources citing competitors but not you. Requires `--domain`; `--verbose` shows every source instead of the top 10.
- **`compare` CLI command** — prints "Why they're winning": each competitor's visibility gap and its ranked, evidence-backed reasons grouped by impact (high/medium/low), each with an action item.
- **`report` CLI command** — the full pipeline in one report: `audit` (optional — pass a URL or `--dir` to include it) + `discover` + `measure` + `citations` + `compare`.
- **`--from <file>`** on all three new commands — loads a previously saved `measure --json` report instead of running discovery + measurement again, so repeated `citations`/`compare`/`report` runs don't re-spend API credits. `compare`/`report` default `--competitors` to every competitor already present in the loaded report.

### Test coverage

293 tests (up from 219). New: `citation-source-classify.test.ts`, `citation-url-extract.test.ts`, `citation-analyzer.test.ts`, `competitor-gap-reasons.test.ts` (impact classification + all seven detectors, including the negative cases where a reason must *not* fire), `competitor-analyzer.test.ts`, `cli-citations-format.test.ts`, `cli-compare-format.test.ts`, `cli-report-source.test.ts` (`--from` loading and the live-measurement fallback), plus 2 new zero-external-static-import checks in `zero-deps.test.ts` for the two new subpaths.

## [0.7.0] - 2026-08-12

Minor, not patch: three new subpath exports (`ai-visibility/engines`,
`/prompts`, `/measure`) and two new CLI commands (`discover`, `measure`) —
all additive, nothing existing changed.

Theme: "Measure What Matters." v0.6.0's AI Readiness Engine is entirely
static analysis — it can tell you a page is structurally easy for an AI
system to cite, but not whether AI systems actually *do* cite or recommend
your brand. v0.7.0 adds that: BYOK adapters to query OpenAI, Perplexity,
Gemini, and Anthropic directly (keys never stored or proxied), template-based
prompt generation for a brand/category, and a measurement engine that
queries with repeated sampling and reports mention rate, recommend rate,
and citation rate — brand vs. competitors, overall and per-engine — each
with a 95% confidence interval, because a single AI response is not a
reliable measurement. See [docs/measurement.md](./docs/measurement.md) for
the full config precedence, prompt templates, and statistics formulas.

### Added

- **`ai-visibility/engines`** — `OpenAIAdapter`, `PerplexityAdapter`, `GeminiAdapter`, `AnthropicAdapter`, each implementing `EngineAdapter.query(prompt, options?)` against that provider's real API (native `fetch`, zero dependencies) and normalizing the response into a common `EngineResponse` (text, extracted citations, latency, timestamp).
- **`ai-visibility/prompts`** — `PromptDiscovery.discover({ brand, category, competitors? })`: template-based generation of `discovery`/`comparison`/`commercial`/`problem`/`recommendation` prompt clusters (26 prompts for a typical 2-competitor brand), no AI call needed to generate the prompts themselves.
- **`ai-visibility/measure`** — `MeasurementEngine.measure(config)`: runs every configured engine against a prompt list `runs` times each (default 3, max 10), sequentially per engine with a 1s delay between calls to the same engine, and aggregates into a `MeasurementReport` — brand vs. competitor `BrandVisibility` (mentionRate, recommendRate, averagePosition, citationRate, variance, confidence), a per-engine breakdown, and per-prompt results. A failed call is logged and counted in `stats.failedRuns`, never fabricated as a data point.
- **`discover` CLI command** — prints prompt clusters for a brand/category; `--json` for machine-readable output. No API keys needed.
- **`measure` CLI command** — runs `discover` + the Measurement Engine against your configured engines and prints a visibility report (overall + recommendation-rate bars with confidence intervals, per-engine mention rates, sample size/duration). Resolves engine API keys from `crawlpod.config.js` and/or `CRAWLPOD_{OPENAI,PERPLEXITY,GEMINI,ANTHROPIC}_KEY` env vars; throws a clear, actionable error if none are configured.

### Test coverage

219 tests (up from 167). New: `engine-adapters.test.ts` (per-adapter request shape, response normalization, citation extraction, error handling — `global.fetch` stubbed, no real network calls), `prompt-discovery.test.ts`, `brand-detection.test.ts` (mention/position/recommend/citation heuristics), `measurement-engine.test.ts` (statistics formulas, failed-run handling, cluster labeling), `cli-engine-config.test.ts` (env var + config file precedence), `cli-discover-format.test.ts`, `cli-measure-format.test.ts`, plus 3 new zero-external-static-import checks for the new subpaths in `zero-deps.test.ts`.

## [0.6.0] - 2026-08-12

Minor, not patch: a new `ContentAnalyzer.audit()` method, a new
`AuditResult`/`AuditIssue`/`CategoryResult`/`AuditCategoryKey` type family,
a restructured `audit`/`lint` CLI output, and `scoring-weights.json`
schemaVersion 2 — all additive. `ContentAnalyzer.analyze()`,
`AIReadabilityScore`, and `ContentAnalyzer.SCORING_WEIGHTS` (the v0.5.0
flat 7-dimension engine) are unchanged and still exported; nothing existing
was removed or had its signature changed.

Theme: "Lighthouse for AI Search." The flat GEO score from v0.5.0 told you
*a* number; it didn't tell you *why*, or which of several very different
failure modes (can't be crawled vs. can't be resolved to an entity vs.
nothing worth citing) was dragging it down. `audit()` replaces the single
`overallScore` with six weighted categories — crawlability, structure,
entity signals, citation readiness, content, authority — each made of
named checks that produce a 0-100 subscore and, on failure, a structured
`AuditIssue` (`critical`/`warning`/`suggestion`, with a title, description,
impact, and `score_impact`). See `docs/scoring.md`.

### Added

- **`ContentAnalyzer.audit(html, context?)`** — the AI Readiness Engine. Returns an `AuditResult`: `overall` (0-100), `categories` (six `CategoryResult`s, each with its own `score` and a `checks[]` breakdown), and `issues` (every failed check, sorted critical → warning → suggestion). 30 checks total across the six categories — see `docs/scoring.md` for the full list and what each one looks for.
- **`ContentAnalyzer.CATEGORY_WEIGHTS`** — the fixed, published category weight table (crawlability/structure/entitySignals 0.20 each, citationReadiness/content 0.15 each, authority 0.10; sums to 1.0, enforced by a test), alongside the existing `SCORING_WEIGHTS`.
- **Crawlability hard-gate**: a full AI-crawler block (`<meta name="robots" content="noindex">`, or a robots.txt disallowing every known AI crawler) zeroes `overall` regardless of every other category's score — categories still report their own scores so the rest of the report stays useful, but `overall` reflects that a fully blocked page has zero AI visibility no matter how well-structured it is.
- **Backward-compatible `score`/`dimensions` fields on `AuditResult`**: `score` mirrors `overall`; `dimensions` is a documented best-effort mapping back to the old seven `AIReadabilityScore.breakdown` keys. Both are non-enumerable getters that `console.warn` once per result on first *read* (pointing at `overall`/`categories`) — being non-enumerable means `JSON.stringify(result)` (and therefore `audit --json`) never triggers the warning just by serializing a result.
- **Reformatted `audit <url>`/`audit --dir` CLI output**: a bordered report per file/URL — overall score, a block-character bar per category (no new dependency; reuses the existing `chalk` import already in the CLI), an issue-severity summary (`● N Critical  ▲ N Warning(s)  ○ N Suggestion(s)`), and a "WHY YOU MAY BE INVISIBLE TO AI" list capped at the top 10 issues.
- **`audit`/`lint --verbose`** — prints every individual check (all ~30, per category) with its own score, instead of just the capped top-issues list.
- **`--json` now serializes the full `AuditResult`** — every category, every check's id/label/score, and every issue with its severity/description/impact/score_impact, not just a flat score.
- Crawlability context extended: `AnalysisContext` gained `llmsTxtContent`, `hasAiTxt`, `hasSitemap`, and `responseTimeMs` (all optional, all "unknown by default"). `audit <url>` fetches `robots.txt`/`llms.txt`/`ai.txt`/`sitemap.xml` (best-effort, same as before) and times the live page fetch; `audit --dir` reads the same files from disk and checks robots.txt for a `Sitemap:` line.
- `scoring-weights.json` **schemaVersion 2**: `dimensions` is now `CATEGORY_WEIGHTS`; the old `SCORING_WEIGHTS` are published alongside as `legacy_dimensions` so existing WordPress/Python consumers reading `dimensions` as the old shape have a drop-in fix (switch to `legacy_dimensions`) instead of silently misreading a changed shape.

### Changed

- `robots-block.ts` (the `isBlockedInRobotsTxt`/robots.txt group-precedence parser) was extracted out of `content-analyzer.ts` into its own module, `src/analyzer/robots-block.ts`, so the new `audit-engine.ts` could reuse it without a circular import between the two engines. No behavior change — same parsing logic, same test coverage.

### Test coverage

167 tests (up from 131). New: `audit-engine.test.ts` (category aggregation, the crawlability hard-gate — full block, partial block, no block — entity-signal checks including the "not applicable" cases for non-commercial pages, issue sorting/`score_impact`, and the `score`/`dimensions` backward-compat getters including their once-per-result warn behavior and non-enumerability), `cli-audit-format.test.ts` (`renderBar`, `auditSeverityIcon`, `colorByScore`, and `renderOneReport`'s full output including the 10-issue cap and `--verbose`), plus new `auditDir` coverage for `ai.txt`/`sitemap.xml` wiring in the existing `cli-audit.test.ts`.

## [0.5.0] - 2026-08-05

Minor, not patch: new backward-compatible CLI commands, a new optional
`analyze()` parameter, a new `AIReadabilityScore.breakdown` field, and a
new `RobotsGenerator` static — no existing signature changes meaning, no
removals.

This release merges two previously-separate feature roadmaps (thirteen
items total) into one. Rather than ship all thirteen half-finished, the
CLI `audit` command and the scoring redesign it depends on — the two
items competitively closest to "the reason developers reach for a tool
like this" — became the release on their own; everything else was either
cheap enough to fold in without diluting the two headline items, or
assessed and explicitly deferred (see `docs/roadmap-decisions.md`).
Semantic HTML stripping, `llms-full.txt`/`llms-small.txt` generation,
MDX/sitemap auto-discovery, and crawler-visit webhooks are targeted for
v0.6.0.

### Fixed

- **The build script that generates `dist/scoring-weights.json` crashed on Node 18** (`ReferenceError: File is not defined`, thrown inside `undici`). It required the full `dist/index.js` bundle just to read a data constant off `ContentAnalyzer`; `index.js` statically imports `cheerio`, and cheerio 1.x depends on `undici` (for `cheerio.fromURL()`) — eagerly loading that pulled in code that isn't compatible with the Node 18.x patch releases this package's `engines` field still supports. Moved the weight data itself into a new zero-dependency module, `src/analyzer/scoring-weights.ts` (re-exported as `ContentAnalyzer.SCORING_WEIGHTS`, no API change), with its own internal-only build artifact (`dist/scoring-weights-internal.js`, not part of the public `exports` map) for the script to read instead. Added to the zero-dependency import-graph test alongside `/detector` and `/schema` so this class of regression can't reappear silently.

### Added

- **`npx ai-visibility audit <url>`** — the headline feature. Fetches a live URL (or scans a local build directory via `--dir`), scores it against the analyzer below, and prints a readable report. `--json` for machine-readable output; `--fail-under <n>` exits non-zero when any score falls below the threshold, so it works as a CI gate with no implicit default — gating is opt-in. Best-effort fetches `robots.txt`/`llms.txt` at the same origin (local files for `--dir`) to feed the new `crawlerAccessibility` dimension; a failed/missing fetch is treated as "unknown," never a hard error.
- **`npx ai-visibility lint`** — a thin wrapper around the same `audit` core with CI-friendly defaults (`--dir . --fail-under 50`). This *is* the build-time GEO linter from the original roadmap — a separate implementation would have just been `audit` again.
- **A 7th scoring dimension: `crawlerAccessibility`** (weight 0.10). Checks the page's own `<meta name="robots">` tag always; when `audit`/`lint` supply site context (or you pass it manually — see below), it also parses `robots.txt` for AI-crawler-blocking rules and checks for `llms.txt`. `ContentAnalyzer.analyze()` gained an optional second parameter, `context?: { robotsTxt?: string; hasLlmsTxt?: boolean }` — omitting it is fully backward compatible; the dimension just adds a low-severity issue noting it could only check the meta tag.
- **Fixed, published scoring weights**, no ML: `ContentAnalyzer.SCORING_WEIGHTS` is the canonical, documented weight table (sums to 1.0, enforced by a test) other CrawlPod surfaces (crawlpod.com's scanner, the WordPress plugin) should align to instead of maintaining their own copy — the same drift risk that already hit the crawler registry once. Also published as `dist/scoring-weights.json` (generated by the new `scripts/generate-scoring-weights-json.js`, same pattern as `dist/crawlers.json`) for surfaces that can't import this package directly. See `docs/scoring.md` for the full dimension table and the reasoning behind each weight.
- **`RobotsGenerator.blockAll()`** — a third preset alongside `allowAll()`/`blockTraining()`, blocking every known AI crawler. `generate robots`/`ai-visibility robots` gained `--preset <allow-all|block-training|block-all>`; the existing `--block-training` flag keeps working unchanged.
- **Top-level `ai-visibility robots`/`ai-visibility llms`** aliases for `generate robots`/`generate llms` — flatter ergonomics for the common case, `generate robots|llms|schema` still work unchanged.
- **A global `-q`/`--quiet` flag** and a one-line, dimmed "Powered by CrawlPod" footer on every CLI command's non-JSON output. No color, no upsell block; gone entirely under `--quiet`.
- `docs/scoring.md` — the scoring dimensions, weights, and rationale, plus the consumption pattern for `dist/scoring-weights.json` from other surfaces.
- `docs/roadmap-decisions.md` — the assessed-but-deferred write-ups for `ai.txt` generation and crawler IP-range verification (both researched for this release; recommendation for both is "not yet," with reasoning).

### Changed

- Internal CLI helpers (`findFiles`, `markdownToHTML`, `scoreColor`, `severityIcon`, the dynamic `chalk` import) were deduplicated out of `analyze.ts`/`generate.ts`/`init.ts`/`logs.ts` into `src/cli/lib/{scan,format,chalk,footer}.ts`, used by those commands and the new `audit`/`lint`. No behavior change.

### Test coverage

112 → 130 tests. New coverage: the `crawlerAccessibility` dimension (meta robots, robots.txt group-precedence parsing including bot-specific `Allow` overriding a wildcard `Disallow`, llms.txt presence, the "no context supplied" fallback), `SCORING_WEIGHTS` (sums to 1.0, one entry per breakdown key), `RobotsGenerator.blockAll()`, and the `audit`/`lint` core logic (`computeExitCode` threshold math, `auditDir` against real fixture directories). The CLI itself was also verified by actually running the built binary against a live URL and a local build directory, not just unit tests — see `RELEASE_WORKFLOW.md`.

## [0.4.0] - 2026-08-03

Minor, not patch: this release adds new backward-compatible public API
surface (new crawler entries and `BotInfo` fields, new subpath type
exports, `getUnverifiedBots()`, `onDetect`'s widened return type) rather
than only fixing bugs, so it follows semver as a minor bump.

### Fixed

- **Stale/incorrect AI crawler UA tokens.** `Claude-Web` was Anthropic's deprecated pre-2024 token — replaced with the current `Claude-User`. Every crawler entry was re-verified against the vendor's own published documentation (not third-party SEO-blog lists) rather than assumed correct; see `docs/crawler-registry.md` for sources and the full audit trail.
- **`onDetect` in `createNextMiddleware()` could silently drop async work.** It was called but never awaited, and the middleware had no access to Next.js's `waitUntil()` — an async `onDetect` (e.g. writing to an analytics backend) could be torn down mid-flight the instant the response was sent, with no error and no completed write. `onDetect` may now return a `Promise<void>`; when it does, and the runtime passes a `NextFetchEvent` as the second middleware argument (which Next.js always does), the promise is registered with `event.waitUntil()` and a rejection can no longer surface as an unhandled rejection or affect the response.
- **Subpath type re-exports were incomplete.** `ai-visibility/schema`, `/generators`, and `/express` exported their classes/functions but none of their parameter types — a consumer importing `RobotsGenerator` from `ai-visibility/generators` had to reach into the root barrel (or an internal path) just to get `RobotsConfig`. All five subpaths now re-export the types that belong to them.
- Corrected stale package-scope references (`@Muhammadfaizanjanjua109/ai-visibility`, `@Muhammadfaizanjunjua109/ai-visibility` — the package is unscoped) across `docs/troubleshooting.md`, `DEVELOPMENT.md`, and `examples/sveltekit-app/README.md`.
- **`examples/nextjs-app/README.md` was broken in more than one way**, not just the package scope: its middleware example assigned `createAIMiddleware` (Express-shaped: `(req, res, next)`) directly to Next.js's `middleware` export, which never worked — replaced with `ai-visibility/next`'s `createNextMiddleware`. Its dynamic route examples accessed `params.id`/`params.slug` synchronously, which throws/warns as of Next.js 15+ (`params` is a `Promise`) — fixed to `await params`.

### Added

- Nine new vendor-verified crawler entries: `OAI-SearchBot` (OpenAI), `Claude-SearchBot` (Anthropic), `Perplexity-User` (Perplexity), `Amazonbot`, `Amzn-SearchBot`, `Amzn-User` (Amazon — a three-tier training/search/user-fetch split, same shape as OpenAI/Anthropic/Perplexity).
- `BotInfo` gained optional `verified`, `sourceUrl`, and `lastChecked` fields, and `getUnverifiedBots()` (exported from `ai-visibility/detector`) surfaces every crawler entry that hasn't been confirmed against official vendor documentation — currently just `Bytespider`, for which no official ByteDance documentation exists at all.
- `docs/crawler-registry.md`: the verification methodology, a re-verification checklist (one vendor doc URL per crawler family), and an assessment of whether the crawler list should be shared across the npm package, the CrawlPod WordPress plugin, and an upcoming Shopify app (recommendation: publish it as plain JSON for other surfaces to fetch and vendor at build time — not a code dependency, not a new package).
- `SchemaBuilder.softwareApplication()` now documents that `offers`/`aggregateRating` take raw `OfferSchemaData`/`AggregateRatingSchemaData` — not a pre-built node from calling `offer()`/`aggregateRating()` yourself first. No signature change.
- Next.js docs/JSDoc updated for the `middleware.ts` → `proxy.ts` rename in Next.js 16 (`middleware.ts` still works today but is deprecated); both conventions are shown.

### Test coverage

76 → 112 tests. The new crawler registry tests (32) cover realistic UA strings per vendor, near-miss strings that must not match, and a structural regression test that fails if any crawler pattern is ever version-pinned (e.g. `gptbot/1` instead of `gptbot`). The `onDetect`/`waitUntil` fix added 4 tests.

## [0.3.3] - 2026-08-03

### Fixed

- Generated `robots.txt` and `llms.txt` footers pointed at a placeholder `github.com/yourusername/ai-visibility` URL instead of the real repository. Now point at `https://github.com/Muhammadfaizanjanjua109/ai-visibility`, plus a `https://crawlpod.com/docs` link.

## [0.3.2] - 2026-08-03

### Added

- **Framework integration guide and verified examples** for Nuxt, Vue (Vite SPA), React (Vite SPA), and React Router (framework mode). See `docs/framework-integration.md` and the new `examples/nuxt-app`, `examples/vue-vite-spa`, `examples/react-vite-spa`, `examples/react-router-app` directories. Every recipe was scaffolded, built, and exercised with real `curl` requests during development — not written from memory. All recipes use the subpath exports (`ai-visibility/detector`, `/generators`, `/schema`) rather than the root barrel.
- Explicit documentation of what a no-server SPA (Vue/React + Vite, statically deployed) can and can't do with this package: build-time `robots.txt`/`llms.txt` generation and build-time JSON-LD injection work; request-time bot detection and HTML optimization don't, because there's no server-side request to run them against.

No code changes in this release — docs and examples only. (`detectAndOptimize`'s bug fix, found while verifying the Nuxt recipe, shipped separately in 0.3.1 below.)

## [0.3.1] - 2026-08-03

### Fixed

- **`detectAndOptimize()` was unusable outside a Next.js project.** It was documented as framework-agnostic ("no request/response objects, works in any runtime") but lived exclusively in `ai-visibility/next`, whose module scope statically imports `next/server` — so merely importing `detectAndOptimize` from a Nuxt, Vue, or plain Node project crashed with `Cannot find module 'next/server'` unless `next` happened to be installed. Moved `detectAndOptimize` into the zero-dependency detector module; it's now exported from `ai-visibility/detector` (its real home) and still re-exported from `ai-visibility/next` for convenience/back-compat. No API change for existing `ai-visibility/next` imports. Found while verifying a Nuxt integration recipe (0.3.2).

## [0.3.0] - 2026-08-01

### Fixed

- **`robots.txt` default `disallow` list blocked crawler access to framework assets.** `RobotsGenerator`'s default `disallow` list included `/_next`, `/admin`, `/api`, `/private`, and `/static` — meaning every site using the defaults (Next.js apps in particular) was shipping a `robots.txt` that told AI crawlers not to fetch its own JS/CSS chunks, directly undermining the package's purpose. The default `disallow` list is now empty; pass your own paths explicitly if you need them. **Anyone on 0.2.x using the defaults should regenerate their `robots.txt`.**

### Added

- **Subpath exports** for a smaller, edge-runtime-safe surface: `ai-visibility/detector`, `ai-visibility/schema`, `ai-visibility/generators`, `ai-visibility/express`, `ai-visibility/next`. `ai-visibility/detector` and `ai-visibility/generators` have zero runtime dependencies (enforced by a test that walks their static import graph); `ai-visibility/schema` is dependency-free except `SchemaBuilder.fromHTML()`, which now lazily `import()`s `cheerio` on first call instead of requiring it statically. The root `ai-visibility` barrel is **unchanged** — all 0.2.x import paths keep working with no code changes required.
- **Next.js support** via `ai-visibility/next`:
  - `createNextMiddleware(options)` — App Router `middleware.ts` support: detects AI crawlers, can set a marker header, rewrite to an alternate route, and/or fire an `onDetect` callback. Edge-safe; types against `next` as an optional peer dependency, mirroring how `express` is already handled.
  - `detectAndOptimize(html, userAgent, options)` — framework-agnostic HTML string + UA string in, `{ isBot, botName, html }` out. No request/response objects required, works in any runtime.
- **Six new JSON-LD schema builders** on `SchemaBuilder`: `website()` (with optional `SearchAction`/sitelinks searchbox), `softwareApplication()`, `breadcrumbList()`, `definedTerm()` / `definedTermSet()`, `offer()`, and `aggregateRating()`. `softwareApplication()` reuses `offer()` and `aggregateRating()` internally rather than duplicating their shape.
- `package.json` now declares `"sideEffects": false` for better tree-shaking.

### Changed

- `SchemaBuilder.fromHTML()` is now `async` (`Promise<SchemaObject>` instead of `SchemaObject`) as a result of lazily loading `cheerio`. The method's JSDoc example already showed it being `await`ed, so most call sites are unaffected — but if you called it without `await`, add one.
- Internal middleware code was split: pure bot detection/HTML optimization (`AIBotDetector`, `HTMLOptimizer`, zero dependencies) now lives separately from the Express-specific middleware wiring (`createAIMiddleware`, `optimizeResponseForAI`). No change to the public API — both are still exported from the root barrel.
- Removed unused `pino` and `zod` dependencies — neither was referenced anywhere in the source; every consumer was paying their install cost for nothing.
- `dist/` is no longer committed to git (build output is generated via `prepublishOnly` and shipped to npm via the existing `files` field). No effect on published packages.

---

## [0.2.0] - 2026-02-19

### ✨ Added

#### 🎯 Free Tier Dashboard (Major Feature)
- **Dashboard Component**: Vanilla HTML/CSS dashboard included in the package (no React/Vue bloat)
- **Real-time Analytics**: Track AI crawler visits, readiness scores, page analytics, performance metrics
- **Dashboard Class**: New `Dashboard` and `createDashboard()` exports for easy integration
- **Framework Examples**:
  - Next.js 13+ App Router integration
  - Vue 3 / Nuxt 3 integration
  - Vanilla Node.js/Express example
- **Comprehensive Guide**: New `DASHBOARD_GUIDE.md` with 300+ lines of API documentation, examples, and troubleshooting

#### 📊 Dashboard Features
- AI Readiness Score (0-100) based on crawler activity
- Real-time AI model tracking (Claude, ChatGPT, Gemini, Perplexity, etc)
- Page-level analytics showing which content AI models crawl
- Success rates and response time metrics
- Activity log with recent crawler visits
- Lightweight implementation (45KB, vanilla HTML/CSS)
- Self-hosted (zero infrastructure costs)

#### 🔧 Type Exports
- Export `BotStatsSerialized` from types for dashboard integration
- Improve type reusability across modules

### 🐛 Fixed
- Fixed type definitions for dashboard integration

### 📈 Performance
- Dashboard renders in <100ms
- Minimal JavaScript footprint
- No external dependencies

### 📚 Documentation
- Added `DASHBOARD_GUIDE.md` with complete API reference
- Added Next.js, Vue, and vanilla Node.js examples
- Added framework-specific integration guides

### 🔐 Security
- Dashboard includes built-in authentication recommendations
- Guidance for protecting dashboard routes

---

## [0.1.4] - 2026-02-15

### 🐛 Fixed
- Fixed critical package name typo in README
- Added dist/ to .gitignore to prevent build artifacts from being committed

---

## [0.1.3] - 2026-02-14

### ✨ Added
- Enhanced content analyzer with AI readiness scoring
- Improved bot detection for more AI crawlers

---

## [0.1.2] - 2026-02-13

### ✨ Added
- Initial release with core features
- Middleware for AI bot detection
- Robots.txt and llms.txt generators
- Schema builder for JSON-LD
- Content analyzer for AI readiness

---

## [0.1.1] - 2026-02-12

### 🐛 Fixed
- Initial bug fixes and improvements

---

## [0.1.0] - 2026-02-11

### ✨ Added
- Initial alpha release
- Core package structure
