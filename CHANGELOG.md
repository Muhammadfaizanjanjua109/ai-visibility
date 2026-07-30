# Changelog

All notable changes to this project will be documented in this file.

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
