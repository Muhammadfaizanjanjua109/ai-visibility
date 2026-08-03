# Crawler Registry: Verification & Multi-Surface Sharing

`src/data/crawlers.ts` is the single source of truth for every AI crawler
this package can detect. This doc covers how it's verified, and — since
this same list now needs to exist in more than one codebase — whether it
should be shared or kept duplicated.

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

## Re-verification checklist

Run this against each vendor's own docs (not secondary sources) before
trusting an entry that's more than ~2 quarters old:

1. OpenAI — https://developers.openai.com/api/docs/bots (GPTBot, ChatGPT-User, OAI-SearchBot; also documents OAI-AdsBot, not currently tracked here — ad-safety verification, not content citation, so it's out of scope for this package's purpose)
2. Anthropic — https://support.claude.com/en/articles/8896518 (ClaudeBot, Claude-User, Claude-SearchBot)
3. Perplexity — https://docs.perplexity.ai/guides/bots (PerplexityBot, Perplexity-User)
4. Google — https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers (Google-Extended, Googlebot)
5. Microsoft — https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0 (Bingbot)
6. Common Crawl — https://commoncrawl.org/ccbot (CCBot)
7. Amazon — https://developer.amazon.com/amazonbot (Amazonbot, Amzn-SearchBot, Amzn-User)
8. Meta — https://developers.facebook.com/docs/sharing/webmasters/crawler (meta-externalagent)
9. Apple — https://support.apple.com/en-us/119829 (Applebot-Extended)
10. ByteDance — no official documentation exists; re-check whether that's changed before flipping Bytespider to `verified: true`

For each: confirm the token is still current, confirm it's still a stable
substring (not a version-pinned string — vendor UAs always embed a version
number, e.g. `GPTBot/1.4`; that number is expected to keep changing and the
match pattern must never include it), and update `lastChecked`.

## Should the registry be shared across npm/WordPress/Shopify?

**Not as a code dependency. As published JSON, yes — worth doing, not urgent.**

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

**Recommendation:** add a small build step here that emits `dist/crawlers.json`
(same data as `AI_CRAWLERS`, including the `verified`/`sourceUrl`/`lastChecked`
fields) alongside the existing JS/type outputs. Each other surface adds a
one-line sync step to its own release process (fetch the pinned-version
JSON, regenerate its native array) instead of hand-maintaining a parallel
list. This is additive to what exists today — no consumer has to change
anything until they choose to wire up the sync step — and it means the next
audit only has to happen in one place for all three surfaces to eventually
pick it up, rather than three times over.

Not implemented as part of this change — this is the assessment the task
asked for, not the build step itself.
