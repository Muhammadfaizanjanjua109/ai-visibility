# Contributing

Thanks for considering a contribution to `ai-visibility`.

## Setup

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup, the validation
commands, and git hooks. The short version:

```bash
git clone https://github.com/Muhammadfaizanjanjua109/ai-visibility
cd ai-visibility
npm install
npm run check   # typecheck, lint, test, build — run before every commit
```

## Before opening a PR

- `npm run check` passes locally.
- New behavior has a test in `__tests__/`. Bug fixes get a test that would
  have caught the bug.
- If you touched anything in `examples/`, confirm it still builds — see
  `.github/workflows/examples.yml`, which runs the same checks in CI. A
  broken example that was never actually run is exactly the failure mode
  this repo has been burned by before; don't add another one.
- If the change is user-facing, update `CHANGELOG.md` (Keep a Changelog
  format) and the relevant section of `README.md` or `docs/`.

## Verifying crawler registry changes

If you're adding or changing an entry in `src/data/crawlers.ts`, see
[docs/crawler-registry.md](./docs/crawler-registry.md) — every entry
needs to be checked against the vendor's own documentation (not a
third-party list) and needs a test with a realistic UA string plus a
near-miss that must not match.

## Reporting issues

Open a [GitHub issue](https://github.com/Muhammadfaizanjanjua109/ai-visibility/issues)
with a minimal reproduction where possible.

## Release process

Not something contributors need to do — see
[RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md) if you're curious how it works.
