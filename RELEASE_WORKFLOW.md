# Release Workflow

Single registry (npm), unscoped package name `ai-visibility`. Publishing
happens in CI, triggered by pushing a version tag — not by running
`npm publish` locally.

---

## How a release actually happens

1. **Land your changes on `main`** as normal commits (each one already
   validated locally with `npm run check`).

2. **Bump the version** in `package.json` by hand, matching the size of
   what changed:
   - `patch` (`0.4.0` → `0.4.1`) — bug fixes, docs
   - `minor` (`0.4.0` → `0.5.0`) — new backward-compatible functionality
   - `major` (`0.4.0` → `1.0.0`) — breaking changes

   This project doesn't use `npm version <bump>` for this step — it stamps
   an auto-generated commit message and tag immediately, which doesn't fit
   how this repo writes descriptive commit messages and batches a
   version bump with its `CHANGELOG.md` entry in one commit.

3. **Add a `CHANGELOG.md` entry** for the new version (Keep a Changelog
   format — see existing entries for the shape). Note explicitly whether
   the bump is a patch or something more, and why, if it's not obvious.

4. **Verify before tagging** — this is the same verification used for
   0.3.0 through 0.4.0:
   ```bash
   npm run check                                    # typecheck, lint, test, build
   npm pack --pack-destination /some/scratch/dir     # inspect exactly what will publish
   ```
   Then, in scratch consumer projects (ESM `"type": "module"` and plain
   CJS), install the packed tarball and confirm the root import and every
   subpath (`ai-visibility/detector`, `/schema`, `/generators`, `/express`,
   `/next`) resolve correctly in both module systems:
   ```bash
   npm install /path/to/ai-visibility-X.Y.Z.tgz
   node -e "require('ai-visibility')"                # CJS root
   node --input-type=module -e "import('ai-visibility')"  # ESM root
   # ...repeat for each subpath
   ```
   Then run `@arethetypeswrong/cli` against the packed tarball and confirm
   no problems across all resolution modes (node10, node16 from-CJS,
   node16 from-ESM, bundler):
   ```bash
   npx @arethetypeswrong/cli --pack .
   ```

5. **Commit** the version bump + CHANGELOG together:
   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: bump to X.Y.Z, changelog"
   git push origin main
   ```

6. **Tag and push the tag** — this is the step that actually triggers a
   publish:
   ```bash
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```

7. **CI takes it from here.** `.github/workflows/publish.yml` triggers on
   any `v*` tag push: installs, runs the test suite, builds, and publishes
   to `registry.npmjs.org` using npm's **trusted publisher (OIDC)**
   mechanism — no `NPM_TOKEN` secret involved. Watch the run under the
   repo's **Actions** tab.

8. **Verify it actually published:**
   ```bash
   npm view ai-visibility version
   # should print the version you just tagged
   ```

That's the whole loop. There is no separate "publish" command you run
locally in the normal case — pushing the tag *is* publishing.

---

## Manual fallback (CI unavailable only)

If the Actions run fails for infrastructure reasons (not a real check
failure) and you need to publish immediately, `npm run publish:npm` will
do a local publish. This requires you to be logged in locally with
publish rights on the `ai-visibility` package (`npm login`) — it does
**not** use the OIDC trusted-publisher path, since that's CI-only by
design. Prefer fixing and re-running the CI job over this path; it exists
as a break-glass option, not a routine one.

```bash
npm run publish:npm
```

---

## If the CI publish step fails

- **Failed at typecheck/lint/test/build** — same failure you'd get from
  `npm run check` locally. Fix on `main`, bump the patch version again if
  the tag was already pushed (tags are immutable in this workflow — don't
  force-move a tag; cut a new patch version and a new tag instead), and
  re-tag.
- **Failed at the publish step itself with an auth/OIDC error** — check
  the package's **Trusted Publishers** setting on its npmjs.com settings
  page against the repo/workflow this Action runs from. This is
  configured on npm's side, not in this repo, so a repo-side fix (e.g.
  editing `publish.yml`) won't resolve a broken trust link.
- **Tag pushed, no workflow run appears at all** — confirm the tag
  actually matches the `v*` pattern (`v0.4.1`, not `0.4.1` or `release-0.4.1`).

---

## Command reference

| Command | Purpose |
|---|---|
| `npm run check` | Typecheck, lint, test, build — run before every commit |
| `npm run ready-to-publish` | Same as `check`, with a confirmation message |
| `npm run publish:npm` | Manual local publish — CI-unavailable fallback only |
| `npm pack` | See exactly what will ship in the published tarball |

---

## What changed from the old dual-registry process

This repo used to attempt publishing to both npm and GitHub Packages
under a scoped package name. That was abandoned — GitHub Packages
requires a scoped name matching the GitHub org/user, which is incompatible
with the current unscoped `ai-visibility` name on npm — and the
`publish.yml` workflow, `package.json` scripts, and the `.npmrc` that
locked the old scope to GitHub Packages have all been removed or updated
to match. If you find a doc, script, or `.npmrc` entry anywhere in this
repo still describing the dual-registry/scoped-name process, it's stale;
this document is the current source of truth.
