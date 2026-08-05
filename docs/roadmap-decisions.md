# Roadmap Decisions: Deferred/Assessed Items

Short, dated write-ups for items that were assessed but not built, so a
future re-assessment starts from a documented baseline instead of
re-litigating from zero — same spirit as the crawler re-verification
checklist in `docs/crawler-registry.md`.

## ai.txt generation — deferred (assessed 2026-08-05)

**Not implemented.** There is no single canonical spec. "ai.txt" is used
online for at least two incompatible things — an informal,
robots.txt-adjacent convention some sites have adopted ad hoc, and an
unrelated 2025 "domain-specific language for guiding AI interactions"
proposal — and most of what's written about either one online is
SEO-blog content asserting a settled standard that doesn't actually exist.
No major AI vendor (OpenAI, Anthropic, Perplexity, Google) has confirmed
reading an `ai.txt` file, in contrast to `llms.txt`, where Anthropic and
Perplexity have at least informal, documented uptake.

Shipping a generator now means guessing a format that may not exist in
six months, and this package has already shipped broken/guessed output
three times (see the CHANGELOG's 0.4.0 entry and this repo's standing
"verify every example" rule) — not a mistake worth repeating on an entire
file format.

**Recommendation:** keep investing in `llms.txt` and `robots.txt`, both of
which have real (if still informal) adoption and a stable, unambiguous
format. Revisit `ai.txt` if/when a single spec consolidates and at least
one major AI vendor documents reading it.

## Crawler IP range verification — deferred (assessed 2026-08-05)

**Not implemented.** IP-based verification (confirming a request claiming
to be `GPTBot` actually came from OpenAI's published IP ranges) would stop
simple user-agent spoofing. But:

- **Coverage is inherently partial.** OpenAI and Perplexity publish
  machine-readable IP ranges. Anthropic explicitly does **not** — its
  documented position is that robots.txt, not IP verification, is the
  intended control surface for ClaudeBot. A bundled or fetched range list
  can therefore never cover the full `AI_CRAWLERS` registry, only a
  subset, which risks a false sense of completeness worse than having no
  verification at all.
- **Staleness risk is worse than the crawler registry's.** AI crawlers
  increasingly run on shared cloud infrastructure (AWS, GCP), where a
  given IP can belong to a completely different tenant next week. Any
  bundled range list goes stale faster than `crawlers.json`'s user-agent
  strings already do, and UA strings only need re-checking quarterly.
- **The failure mode is asymmetric, and the worse side is silent.** A
  false *accept* (treating a spoofed UA as legitimate) is what this
  package's UA-only detection already risks today and is honest about.
  A false *reject* — wrongly deciding a genuine GPTBot/ClaudeBot request
  isn't real and denying it optimized content — actively harms the
  package's own purpose for nearly all users, and would fail silently
  unless a site owner happened to notice a legitimate crawler being
  under-served.

**Recommendation:** defer. If revisited, ship IP ranges as opt-in
published data — same pattern as `crawlers.json`/`scoring-weights.json`,
fetched and vendored at build time, never at runtime — and only for
vendors that publish stable ranges. It should inform confidence, not
gate access: never a silent fail-closed block on a UA match alone.
