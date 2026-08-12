# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
