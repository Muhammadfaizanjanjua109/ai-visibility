// ============================================================
// Internal-only build artifact — NOT part of the public exports map.
// Lets scripts/generate-scoring-weights-json.js read SCORING_WEIGHTS
// without loading content-analyzer.ts's cheerio import (which pulls in
// undici and breaks on some Node 18.x patch releases — see
// src/analyzer/scoring-weights.ts for the full story). Not documented as
// a subpath; package.json's `exports` map doesn't list it, so
// `require('ai-visibility/scoring-weights-internal')` is blocked for
// consumers the same way any unlisted path is.
// ============================================================

export { SCORING_WEIGHTS, CATEGORY_WEIGHTS } from '../analyzer/scoring-weights'
