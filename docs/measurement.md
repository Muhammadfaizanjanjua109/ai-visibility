# Measurement Engine: Config, Prompt Templates, and Statistics

v0.7.0 adds the ability to actually query AI engines and measure brand
visibility — the counterpart to the AI Readiness Engine's static analysis
(`ContentAnalyzer.audit()`, see [docs/scoring.md](./scoring.md)). Three
pieces, each its own subpath: `ai-visibility/engines` (BYOK adapters),
`ai-visibility/prompts` (template-based prompt generation), and
`ai-visibility/measure` (the statistical measurement engine that ties them
together). The CLI wraps all three as `discover` and `measure`.

**This is stochastic by nature.** The same prompt sent to the same engine
twice can return different results. Everything here measures with repeated
sampling (`runs`, default 3, max 10) rather than trusting a single response,
and reports a 95% confidence interval alongside every rate — read a result
with a wide confidence interval as "not enough signal yet," not as ground
truth.

## BYOK (Bring Your Own Key)

`ai-visibility` never stores or proxies API keys. Each `EngineAdapter`
(`OpenAIAdapter`, `PerplexityAdapter`, `GeminiAdapter`, `AnthropicAdapter`)
takes a key directly:

```typescript
import { OpenAIAdapter } from 'ai-visibility/engines'

const engine = new OpenAIAdapter(process.env.OPENAI_API_KEY!, { model: 'gpt-4o-mini' })
const response = await engine.query('best CRM software')
```

The CLI's `measure` command resolves keys itself, in this order per engine:

1. **`crawlpod.config.js`** (project root) — `apiKey` in that engine's entry, if set.
2. **Environment variable** — `CRAWLPOD_OPENAI_KEY`, `CRAWLPOD_PERPLEXITY_KEY`, `CRAWLPOD_GEMINI_KEY`, `CRAWLPOD_ANTHROPIC_KEY`.

An engine's `model`/`temperature`/`maxTokens` in `crawlpod.config.js` become
that adapter's per-call defaults (still overridable via `query(prompt, options)`).
Only engines that end up with an `apiKey` from either source are used —
`discover` needs no keys at all (it's pure templating); `measure` throws a
clear, actionable error if zero engines resolve.

```javascript
// crawlpod.config.js
module.exports = {
  engines: {
    openai: { apiKey: '...', model: 'gpt-4o-mini' },
    perplexity: { apiKey: '...' },
    // only configure the engines you want to use
  },
}
```

### Citations

Each adapter extracts citation URLs from its provider's response using
whatever that provider actually gives you: Perplexity's `citations` array,
Gemini's grounding metadata, OpenAI's citation annotations when present —
falling back to a plain URL regex over the response text for all four. See
`src/engines/*-adapter.ts` for the exact per-provider logic.

`EngineResponse.brands` is always `[]`. A bare `query(prompt)` call has no
brand list to check against — that context (the brand + competitors being
tracked) only exists one layer up, in `MeasurementEngine`, which is what
actually does brand detection. Don't rely on `brands` from a raw adapter
call; it's a placeholder for the normalized response shape, not a feature.

## Prompt Discovery

`PromptDiscovery.discover({ brand, category, competitors? })` generates five
template-based clusters — no AI call needed to produce the prompts
themselves:

| Cluster | Count | Example |
|---|---|---|
| `discovery` | 5 | "best CRM software in 2026" |
| `comparison` | 4 per competitor, capped at 10 total | "Acme CRM vs HubSpot" |
| `commercial` | 5 | "cheapest CRM software" |
| `problem` | 5 | "how to manage customer relationships" |
| `recommendation` | 3 | "recommend a CRM software" |

The `comparison` cluster is omitted entirely (not emitted with an empty
`prompts[]`) when no `competitors` are given. The `comparison` cap fills
competitor-by-competitor, not template-by-template, so a cut favors breadth
across competitors over exhausting one competitor's four templates first.

Two of the five `problem` prompts ("how to `{verb}`", "best way to
`{verb}`") need a verb phrase for the category (e.g. "CRM software" ->
"manage customer relationships"), looked up in a plain keyword table
(`src/prompts/verb-map.ts`) — not AI-inferred. When a category has no
mapping, those two prompts are replaced with generic, verb-free alternatives
so the cluster still returns 5 prompts either way.

## Statistics

For each tracked name (the brand, plus every competitor), across every
successful run:

- **`mentionRate`** — fraction of runs where the name appeared in the response (case-insensitive substring match).
- **`recommendRate`** — fraction of runs where the name appeared in a sentence within 2 sentences of a recommendation-context keyword (`recommend`, `suggest`, `best`, `top pick`, `great choice`, `excellent`, `ideal`). Deliberately simple keyword proximity, not sentiment analysis.
- **`averagePosition`** — mean 1-indexed rank among all tracked names by first-mention order *within that response* (a brand mentioned before its competitors gets a lower/better number). `0` when never mentioned.
- **`citationRate`** — fraction of runs where a cited URL's hostname contains the name's alphanumeric slug (e.g. "Acme CRM" -> `acmecrm`, matches `acmecrm.com`, `www.acmecrm.io`). An approximation — there's no reliable brand->domain mapping without asking for one, which is out of scope for v0.7.0.
- **`variance`** — population variance of the per-run mention indicator (0/1). Divides by `n`, not `n-1`, so a single-run measurement doesn't divide by zero.
- **`confidence`** — 95% confidence interval half-width: `1.96 * sqrt(variance / sampleSize)`. Report a rate as `mentionRate ± confidence`; a wide interval means "measure more runs," not "the number is wrong."

`EngineVisibility` (the `perEngine` breakdown) tracks only the primary
brand, not competitors — that's the type as specified. The CLI's `measure`
command reconstructs a full per-engine-per-competitor breakdown for its "PER
ENGINE" display by re-aggregating `perPrompt[].runs[]` (each `RunResult`
already carries its own `engine` and `competitorsMentioned`), rather than
by adding a new field to the report.

### Rate limiting and failures

All calls run through a single sequential queue, grouped by engine (every
call to one engine completes, with a 1-second delay between them, before
moving to the next engine) — never more than one HTTP call in flight, and
never a burst against one provider. If a call fails, it's logged
(`console.error`) and counted in `stats.failedRuns`; it is **not** recorded
as a `RunResult` (a failure isn't a data point about the brand — fabricating
one as "not mentioned" would silently bias every rate downward). Everything
else continues.


## The visibility vector (`dist/visibility-vector.json`)

Visibility is not a scalar. It is a vector across discoverability, context
position, citation, prominence, absorption and fidelity, and a single
aggregate is only defensible when its weights map to an explicit objective.
`visibility-vector.json` is the **measurement-level** schema: a field
manifest for the per-`(query, engine, run)` observations `MeasurementEngine`
produces.

It versions **independently** of `scoring-weights.json`. The two describe
different kinds of thing and move on different clocks — one is a property
of your markup, the other is a property of one engine's behaviour for one
query at one moment. A shared version counter would force a meaningless
bump on one every time the other changed, which is how the page/measurement
distinction got blurred in the first place. A matching scoring
`schemaVersion` does **not** imply a matching vector `schemaVersion`; use
`assertSupportedVisibilityVectorSchemaVersion()`, not the scoring guard.

### Denominator decomposition

The central contract. Citation is reported as three separate quantities,
**never pre-multiplied into a single citation rate**:

```
Pr(cited) = Pr(activated) × Pr(retrieved | activated) × Pr(cited | retrieved)
```

| Factor | Numerator | Denominator |
|---|---|---|
| `pActivated` | `runsActivated` | `runsAttempted` |
| `pRetrievedGivenActivated` | `runsRetrieved` | `runsActivated` |
| `pCitedGivenRetrieved` | `runsCited` | `runsRetrieved` |
| `pCited` | `runsCited` | `runsAttempted` |

The populations are nested:
`runsCited ⊆ runsRetrieved ⊆ runsActivated ⊆ runsAttempted`, and the
nesting is enforced structurally rather than assumed. Some adapters report
citations without exposing retrieval (see observability below); without the
nesting those would produce `runsCited > runsRetrieved` and a conditional
probability above 1.

Why three numbers and not one: a low `pCited` caused by an engine that
rarely searches calls for a completely different response than one caused
by content that never gets cited once retrieved. A scalar cannot tell those
apart — which is exactly what `BrandVisibility.citationRate` has never been
able to do.

```ts
import { decomposeVisibility } from 'ai-visibility/measure'

const v = decomposeVisibility(observations)
// { pActivated: 0.25, pRetrievedGivenActivated: 1, pCitedGivenRetrieved: 1, pCited: 0.25 }
// vs
// { pActivated: 1, pRetrievedGivenActivated: 1, pCitedGivenRetrieved: 0.25, pCited: 0.25 }
// Identical pCited. Opposite diagnoses. Opposite fixes.
```

### Every run stays in the denominator

Runs where search never activated, runs that errored, and runs that
returned nothing are **outcomes, not absences**. They are retained in
`runsAttempted`. A run that errored still consumed an opportunity to be
cited; dropping it makes every rate a measurement of the subset that
happened to succeed.

This is not hypothetical. One reviewed configuration found **57.8% of
ChatGPT repetitions never activated web search at all**. Filtering those
would have reported a citation rate more than twice its true value.

`RunOutcome` is therefore `'observed' | 'engine-error' | 'empty-response'`,
and all three are counted.

> Note that `BrandVisibility.mentionRate` / `citationRate` in
> `MeasurementReport` still compute over successful calls only, with
> `failedRuns` tracked separately — they predate this schema. Prefer
> `decomposeVisibility()` for anything where the denominator matters.

### Null is not zero

No field is ever `undefined`. Absent values carry an explicit status:

| Status | Meaning |
|---|---|
| `observed` | The engine reported it; the value is trustworthy. |
| `not-observable` | This engine structurally cannot report it. Distinct from a zero. |
| `not-evaluated` | Observable in principle, but this run did not evaluate it. |

The conditionals are `null` — not `0`, not `1` — when their denominator is
empty. With zero activated runs, `Pr(retrieved | activated)` is undefined,
not zero: reporting `0` there asserts content failed to be retrieved when
it was never given the chance. `pActivated` and `pCited` are real zeroes in
that case, over the full attempted denominator.

`recomposeCitationRate()` returns `null` whenever any factor is `null`, for
the same reason. The chain identity holds exactly when all three factors
are defined, which is asserted in tests rather than relied on.

### `searchActivation` is tri-state, not boolean

`'activated' | 'not-activated' | 'unknown'` — and `'unknown'` counts toward
**neither**, tracked separately in `runsActivationUnknown`.

This is forced by what the adapters can actually see:

| Engine | Search activation | Retrieved sources | Context position | Citations |
|---|---|---|---|---|
| Perplexity | ✅ | ✅ | ❌ | ✅ |
| Gemini | ✅ (`groundingMetadata`) | ✅ | ❌ | ✅ |
| OpenAI | ❌ | ❌ | ❌ | ✅ |
| Anthropic | ❌ | ❌ | ❌ | ✅ |

The OpenAI adapter sends no `tools` parameter, so no web search is
requested and none can be detected; the Anthropic adapter has no search
tool either. Both fall back to regex-scraping URLs out of the prose, which
cannot distinguish a real citation from a URL the model recited from
memory. Recording `false` for those engines would assert something never
measured, and every downstream rate would inherit that fabrication.
Recording `true` would inflate `pActivated` toward 1 for exactly the
engines that tell us least.

No adapter currently exposes context ordering, so `contextPosition` is
`not-observable` across the board. The field exists because the position
is real even when unmeasured — a schema that omitted it would make the gap
invisible.

This table is published as `observability` in the JSON, so a consumer
reading `pActivated` can tell a real zero from a sample where nothing was
observable in the first place.

## CLI

```bash
npx ai-visibility discover --brand "Acme CRM" --category "CRM software" --competitors "HubSpot,Pipedrive"
npx ai-visibility discover --brand "Acme CRM" --category "CRM software" --json

npx ai-visibility measure --brand "Acme CRM" --category "CRM software" --competitors "HubSpot,Pipedrive" --runs 3
npx ai-visibility measure --brand "Acme CRM" --category "CRM software" --json
```

`measure` runs `discover` internally, queries every configured engine
`runs` times per generated prompt, and prints overall/recommendation
visibility bars (brand vs. competitors, each with its confidence interval),
a per-engine mention-rate table, and sample-size/duration stats. `--json`
prints the full `MeasurementReport`.
