# Crawler Registry: Verification & Multi-Surface Sharing

`src/data/crawlers.ts` is the single source of truth for every AI crawler
this package can detect. This doc covers how it's verified, and how it's
shared with the other codebases that need the same list (the CrawlPod
WordPress plugin today, a Shopify app in the future) via the published
`dist/crawlers.json`.

## How entries are verified

Every entry with `verified: true` was checked against the **vendor's own
published documentation** (not a third-party SEO-blog list — several
widely-circulated ones are wrong, which is how this list drifted in the
first place). Each verified entry records `sourceUrl` and `lastChecked` so
the next audit is a diff against a known-good baseline, not a full
re-investigation from zero.

`verified: false` (currently just Bytespider) means the opposite of
"not yet audited" — it means the crawler was checked, and **no official
vendor documentation exists at all**. That's a real, permanent state for
some crawlers, not a to-do item.

Entries with no `verified`/`sourceUrl`/`lastChecked` fields at all (YouBot,
cohere-ai, Diffbot as of this writing) predate the audit and haven't been
re-checked yet — an honest gap, not a claim that they're wrong.

`getUnverifiedBots()` (exported from `ai-visibility/detector`) surfaces
every entry that isn't `verified: true`, so consumers can decide for
themselves how much to trust a match against one of those tokens.

## Quarterly re-verification checklist

Budget ~20 minutes for this, not a re-investigation — every entry already
records where it came from and when it was last checked. That's the entire
point of the `sourceUrl`/`lastChecked` fields: this should stay cheap
indefinitely, not get more expensive as the list grows.

**When:** every quarter, or before relying on this list for a release
you actually care about, whichever comes first.

**Steps:**

1. For each vendor below, open `sourceUrl` fresh (don't trust your memory
   of what it said last time) and check:
   - **Is the token still listed?** Vendors do deprecate/rename tokens —
     that's exactly how `Claude-Web` ended up stale in this list before.
   - **Has a new crawler been added** that this package doesn't track yet?
   - **Is the `purpose` classification still accurate** (training vs.
     search-surfacing vs. user-triggered fetch)?
2. Update `lastChecked` (ISO date, `YYYY-MM-DD`) on every entry you
   actually re-confirmed — not the ones you skipped.
3. If a token changed or was added/removed, edit `src/data/crawlers.ts`
   directly (never edit `dist/crawlers.json` by hand — it's generated,
   see below) and add a test in `__tests__/crawlers.test.ts` for any new
   entry, following the existing pattern (realistic UA + a near-miss that
   must not match).
4. Run `npm run build` — this regenerates `dist/crawlers.json`
   automatically from the updated `src/data/crawlers.ts`, and bumps
   `generatedAt`/`packageVersion` to match. Commit both.
5. **Propagate to downstream surfaces**: the CrawlPod WordPress plugin
   (and, once it exists, the Shopify app) each re-fetch and regenerate
   their native copy from the newly-published `crawlers.json` (see
   "Consuming `crawlers.json` from another surface" below) as part of
   their own next release — this repo publishing an update doesn't push
   anything anywhere automatically.

**Vendor doc URLs to check:**

1. OpenAI — https://developers.openai.com/api/docs/bots (GPTBot, ChatGPT-User, OAI-SearchBot; also documents OAI-AdsBot, not currently tracked here — ad-safety verification, not content citation, so it's out of scope for this package's purpose)
2. Anthropic — https://support.claude.com/en/articles/8896518 (ClaudeBot, Claude-User, Claude-SearchBot)
3. Perplexity — https://docs.perplexity.ai/guides/bots (PerplexityBot, Perplexity-User)
4. Google — https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers (Google-Extended, Googlebot)
5. Microsoft — https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0 (Bingbot)
6. Common Crawl — https://commoncrawl.org/ccbot (CCBot)
7. Amazon — https://developer.amazon.com/amazonbot (Amazonbot, Amzn-SearchBot, Amzn-User)
8. Meta — https://developers.facebook.com/docs/sharing/webmasters/crawler (meta-externalagent)
9. Apple — https://support.apple.com/en-us/119829 (Applebot-Extended)
10. ByteDance — no official documentation exists; re-check whether that's changed before flipping Bytespider's `verified` to `true`

For each: confirm the token is still current, confirm it's still a stable
substring (not a version-pinned string — vendor UAs always embed a version
number, e.g. `GPTBot/1.4`; that number is expected to keep changing and the
match pattern must never include it), and update `lastChecked`.

## Sharing the registry across npm/WordPress/Shopify

**Not as a code dependency. As published JSON.**

This list already needs to exist in the CrawlPod WordPress plugin, and will
need to exist a third time in a Shopify app. It's already drifted once
(this audit). The question is what to do about the next drift.

**Options considered:**

- **A PHP plugin importing a JS/TS package** — doesn't work; there's no
  runtime bridge, and forcing one (shelling out to Node from PHP, say)
  is worse than the duplication it's meant to solve.
- **A separate minimal package** (`@crawlpod/crawler-registry` or similar)
  — solves nothing a plain JSON file doesn't, while adding a whole new
  package to version, publish, and depend on. The data has no logic
  attached to it worth packaging as code.
- **A generation script that writes into sibling repos** — requires this
  repo to have write access to the WordPress/Shopify repos' source trees,
  which is more coupling than the problem justifies, and creates a
  confusing "generated file, don't hand-edit" zone in codebases this
  package doesn't own.
- **Publish `crawlers.json` as a plain data file from this package, fetched
  and vendored at build/release time by other surfaces** (recommended).
  Once published to npm, it's automatically available unauthenticated via
  a CDN like `unpkg.com/ai-visibility/dist/crawlers.json` — a PHP or Ruby
  build script can `curl` a pinned version of that URL with zero Node.js
  dependency, transform it into whatever native structure it needs (a PHP
  array, a Liquid data file), and commit the result. That's a build-time
  step, not a runtime fetch — the WordPress plugin and Shopify app should
  never depend on that URL being reachable when a real visitor hits the
  site.
- **Keep duplicating, with a documented quarterly checklist** (the
  checklist above) — legitimate as a *stopgap*, but it's the status quo
  that already produced one drift incident, with a third consumer about
  to make it more likely, not less.

**Implemented.** `npm run build` now runs `scripts/generate-crawlers-json.js`
after `tsup`, which `require()`s the just-built `dist/detector.js` (never
`src/data/crawlers.ts` directly, and never hand-typed — if the TS registry
and the JSON could drift, they would) and writes `dist/crawlers.json`.
It's covered by the existing `files` entry for `dist` in `package.json`, so
it publishes automatically and becomes fetchable, unauthenticated, from a
CDN mirror of the npm package the moment a new version goes out — no
extra publish step, no new package.

### `dist/crawlers.json` shape

```json
{
  "schemaVersion": 1,
  "packageVersion": "0.4.0",
  "generatedAt": "2026-08-03T16:10:05.891Z",
  "source": "https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/src/data/crawlers.ts",
  "docs": "https://github.com/Muhammadfaizanjanjua109/ai-visibility/blob/main/docs/crawler-registry.md",
  "crawlers": [
    {
      "name": "GPTBot",
      "company": "OpenAI",
      "userAgentPattern": "gptbot",
      "purpose": "training",
      "verified": true,
      "sourceUrl": "https://developers.openai.com/api/docs/bots",
      "lastChecked": "2026-08-03"
    }
    // ...one entry per crawler, same shape as BotInfo
  ]
}
```

`schemaVersion` is a plain integer, independent of `packageVersion` — bump
it only if the *shape* of `crawlers[]` entries changes in a way a consumer
would need to handle explicitly (a field renamed or removed). Adding new
crawler entries, or new *optional* fields to existing ones, isn't a
schema-version bump.

### Consuming `crawlers.json` from another surface

**Fetch at build/release time. Never at runtime.** A WordPress plugin or
Shopify app that fetched this URL on every page load would take on a live
dependency on a third-party CDN being up, for data that changes maybe four
times a year. Vendor a static copy instead:

```bash
# Run this as part of the *other* surface's own release process, not this repo's.
curl -sL https://cdn.jsdelivr.net/npm/ai-visibility@latest/dist/crawlers.json -o crawlers.json
# (or pin an exact version instead of @latest once you've reviewed it:
#  .../npm/ai-visibility@0.4.0/dist/crawlers.json)
```

Then transform `crawlers.json` into whatever native structure that surface
needs (a PHP array, a Liquid data file, etc.) and commit the *generated*
result — check `schemaVersion` first and fail loudly if it's higher than
the version your transform script was written against, rather than
silently misreading a changed shape.

Pin an exact version rather than `@latest` for anything beyond a quick
check — `@latest` is fine for eyeballing the current data, but a downstream
build script should fetch a version it's reviewed, the same way you'd pin
any other dependency.
