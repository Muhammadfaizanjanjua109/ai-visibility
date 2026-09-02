# Migration: scoring-weights.json v2 → v3, and the new visibility-vector.json

**Every downstream consumer of `dist/scoring-weights.json` needs a code
change before re-vendoring this release.** One of them will fail loudly;
the other will fail silently, and that one is the urgent case.

## What changed

`dist/scoring-weights.json` bumped `schemaVersion` 2 → 3 and is now
**page-level only**. Measurement-level signal moved to a new
`dist/visibility-vector.json` with its own independent `schemaVersion` 1.

| | v2 | v3 |
|---|---|---|
| `dimensions` | 6 categories | **7** — `answerPlacement` split out of `structure` |
| per-dimension fields | `key`, `label`, `weight`, `description` | + `evidenceGrade`, `rationale` |
| top-level | — | + `scope` block |
| `legacy_dimensions` | 7 flat GEO dims | unchanged |

Weights (all sum to 1.0, none negative):

| Key | v2 | v3 |
|---|---|---|
| `crawlability` | 0.20 | 0.18 |
| `answerPlacement` | — (≈0.04 inside `structure`) | **0.18** |
| `citationReadiness` | 0.15 | **0.22** |
| `entitySignals` | 0.20 | 0.16 |
| `structure` | 0.20 | **0.10** |
| `content` | 0.15 | 0.09 |
| `authority` | 0.10 | 0.07 |

`citationReadiness` keeps its **key** but is relabelled to "Extractable
evidence". The key was deliberately left alone so existing consumers keep
resolving. Likewise the answer-placement check keeps its
`struct-answer-frontloading` id despite moving category.

## Why a silent re-vendor is dangerous

The failure is asymmetric but equally silent in both directions, which is
why `assertSupportedSchemaVersion()` now rejects both:

- **v2 read as v3** — loses `answerPlacement` entirely and renormalizes
  over six weights that no longer sum to 1.0.
- **v3 read as v2** — picks up a seventh category the consumer has no key
  for and quietly drops 18% of the score.

Neither throws on its own. Both produce a plausible wrong number.

---

## Consumer 1: Shopify app (`crawlpod-shopify-1`)

Vendors via `scripts/vendor-crawlpod-assets.ts` against a pinned npm
version. **Fails loudly** — its existing exact-match guard throws at module
load on re-vendor, which is correct behaviour and means it cannot break
silently. Required changes:

1. **`app/lib/audit/scoring.ts`** — bump
   `SUPPORTED_SCORING_SCHEMA_VERSION` from `2` to `3`.
2. **`app/lib/audit/scoring.ts`** — add `"answerPlacement"` to the
   `CategoryKey` union. Without it, `getCategoryWeights()` returns a key
   TypeScript doesn't know about and `computeOverallScore()` silently drops
   0.18 of weight into `skippedCategories`.
3. **`app/lib/audit/aggregate.ts`** — decide whether to populate
   `answerPlacement` in `categoryScores`. Leaving it absent is *legitimate*
   (`CategoryScores` is `Partial` and renormalization handles it honestly)
   but it must be a decision: absent means the audit reports nothing about
   the strongest predictor we measure.
4. **`scripts/vendor-crawlpod-assets.ts`** — bump `PINNED_VERSION`, and
   optionally add `"visibility-vector.json"` to `VENDORED_FILES`.
5. **`app/lib/audit/scoring.test.ts`** — the "still has exactly six current
   dimensions" guard and the "matches the six categories and weights from
   the brief exactly" assertion both need updating to the seven v3 weights.
6. **Optional but recommended** — delete the local `computeOverallScore()`
   and `assertSupportedSchemaVersion()` and import them from the package.
   Both are now exported. That duplication is precisely how a consumer's
   renormalization can drift from the weights it renormalizes over.

The hard gate in `aggregate.ts` (`HARD_GATE_FINDING_IDS` →
`overallScore: 0`) is unaffected: it keys on finding ids, and no finding id
changed. The package's `computeOverallScore()` now takes a `hardGate`
option that produces the same behaviour, if you consolidate.

> `PINNED_VERSION` was `0.8.2` against a `package.json` of `0.8.0` while
> this was written — the two have since converged. Bump to the current
> published version.

## Consumer 2: Python package (`ai-visibility-python`)

`src/ai_visibility/scoring_weights.py`. **This is the silent-failure
risk.**

It is still vendoring **schemaVersion 1** (`packageVersion` 0.5.0), reads
`data["dimensions"]`, and has **no version guard at all**. A re-vendor
today already picks up the v2 six category keys, passes them unmapped
through `_CAMEL_TO_SNAKE.get()` (which falls back to the raw key), and
returns a completely different dict from `get_default_weights()` without
raising. v3 makes that worse.

1. **Add a version guard first.** This is required even if nothing else
   changes. Mirror `assertSupportedSchemaVersion`'s message — name both the
   found and the expected version:

   ```python
   SUPPORTED_SCHEMA_VERSION = 1  # or 3, per step 2

   def _assert_supported_schema_version(schema_version: int) -> None:
       if schema_version != SUPPORTED_SCHEMA_VERSION:
           raise ValueError(
               f"scoring_weights.json has schemaVersion {schema_version}, but this "
               f"build understands schemaVersion {SUPPORTED_SCHEMA_VERSION}. "
               "Update the dimension-reading logic before trusting these weights."
           )
   ```

   Call it inside `_load_dimensions()`, before reading `data["dimensions"]`.

2. **Then pick one:**

   - **Stay on the legacy shape (lowest effort, still correct).** Read
     `data["legacy_dimensions"]` instead of `data["dimensions"]`.
     `_CAMEL_TO_SNAKE` keeps working unchanged and the seven flat GEO keys
     are preserved. The Python API's public surface does not change.
   - **Migrate to v3 categories.** Read `data["dimensions"]`, replace
     `_CAMEL_TO_SNAKE` with the category keys, and add `evidence_grade` /
     `rationale` to the `ScoringDimension` dataclass:

     ```python
     _CAMEL_TO_SNAKE = {
         "crawlability": "crawlability",
         "answerPlacement": "answer_placement",
         "citationReadiness": "citation_readiness",
         "entitySignals": "entity_signals",
         "structure": "structure",
         "content": "content",
         "authority": "authority",
     }
     ```

     This is a breaking change to `get_default_weights()`'s keys — needs a
     major/minor bump and a CHANGELOG note.

3. **Add a test** asserting the vendored file's `schemaVersion` matches
   what the loader understands. The Shopify app has one; Python does not,
   which is why it drifted three versions behind without anyone noticing.

4. Bump the vendored JSON and `packageVersion` together.

## Consumer 3: WordPress plugin

Not currently reading `dimensions` programmatically — no action required.
The same guard applies if that changes.

---

## New: `dist/visibility-vector.json`

> **Now at `schemaVersion` 2 as of v0.10.0**, while `scoring-weights.json`
> stayed at 3. That is the split working — see the v0.10.0 section below.

No existing consumer reads this; it is additive. If you start:

- Guard it with `assertSupportedVisibilityVectorSchemaVersion()`, **not**
  the scoring guard. The two version independently and a matching scoring
  `schemaVersion` does not imply a matching vector one.
- Read `pActivated`, `pRetrievedGivenActivated` and `pCitedGivenRetrieved`
  as three separate quantities. Do not multiply them back into one number
  for display.
- Treat `null` conditionals as "undefined", never as zero. Check
  `denominators.runsActivated` before interpreting
  `pRetrievedGivenActivated`.
- Check the `observability` table before interpreting a low `pActivated` —
  it may be a sample dominated by engines that cannot report activation,
  which is tracked in `denominators.runsActivationUnknown`.

---

## v0.10.0: `visibility-vector.json` 1 → 2, and a changed definition of "citation"

`scoring-weights.json` did **not** move. If you only vendor that file, there
is nothing to do here.

### The schema change

| | v1 | v2 |
|---|---|---|
| `observability[]` rows | `engine`, 4 booleans | + `mechanism`, `requiresWebSearch` |
| `searchActivation` observable on | Perplexity, Gemini | all four adapters |
| `retrievedSources` observable on | Perplexity, Gemini | + Anthropic (not OpenAI) |
| `denominators` | 5 counters | + `runsRetrievalUnknown` |
| `decomposition` | `identity`, `factors`, `retentionRule` | + `interpretationRule` |

Guard it with `assertSupportedVisibilityVectorSchemaVersion()`. The v1 error
text names `runsRetrievalUnknown` and the old two-engine observability so a
mismatch is legible without opening this file.

### The behavioural change, which matters more than the schema

Adapters now send a web-search tool by default and read activation off a
named response field. A URL regex-scraped from prose is no longer counted as
a citation.

**If you have measurements taken before v0.10.0, they are not comparable to
measurements taken after it.** The old OpenAI and Anthropic numbers were
computed over URLs that may have been recited from memory rather than
retrieved. Re-baseline rather than plotting the two on one axis.

### If you call the adapters directly

1. **`EngineResponse` gained three required fields** — `searchActivation`,
   `citationProvenance`, `retrievedSources`. Anything constructing an
   `EngineResponse` by hand (a custom adapter, a test fixture) will fail to
   typecheck until it supplies them. Build them with the exported
   constructors rather than by hand:

   ```ts
   import { retrievedEvidence, proseExtractedEvidence, buildEngineResponse } from 'ai-visibility/engines'
   ```

2. **Check `citationProvenance` before treating `citations` as citations.**
   `'prose-extraction'` means the engine was never asked to retrieve;
   `'none'` means it was asked and declined. Neither is evidence of citation.

3. **Budget for the cost.** Every provider bills web search per call. Pass
   `{ webSearch: false }` per call, in the adapter constructor defaults, or
   via `MeasureConfig.queryOptions` to opt out — the request shape then
   matches v0.9.0 exactly.

4. **`RunResult` gained `searchActivation` and `citationProvenance`.** Same
   typecheck consequence for hand-built fixtures.

### If you read the decomposition

`pRetrievedGivenActivated` is only interpretable when
`denominators.runsRetrievalUnknown` is 0. OpenAI proves a search ran without
listing what it read, so those runs sit in `runsActivated` but can never
reach `runsRetrieved` — they depress the middle factor for a measurement
reason, not a retrieval one. Decompose per-engine, or read the counter first.
