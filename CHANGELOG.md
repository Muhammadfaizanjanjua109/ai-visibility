# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
