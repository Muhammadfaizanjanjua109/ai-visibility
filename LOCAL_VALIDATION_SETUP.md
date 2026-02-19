# Local Validation Setup ✅

Your project is now configured for **local validation before pushing**. This prevents CI failures by catching issues early.

---

## What's Now Installed

### Tools
- **ESLint** — Code quality and consistency checks
- **Husky** — Git hooks for automatic pre-commit validation
- **Lint-Staged** — Run linting only on changed files

### Configuration Files
- `.eslintrc.json` — ESLint rules
- `.lintstagedrc.json` — Files to lint before commit
- `.husky/pre-commit` — Automatic pre-commit hook

---

## Quick Start

### Before Your First Commit
```bash
# Ensure git hooks are installed
npm install

# Then use normally:
git add src/my-changes.ts
git commit -m "feature: add new thing"
# ✅ Pre-commit hook automatically validates!
```

### Run Full Validation Locally

**Recommended before every push:**
```bash
npm run check
```

This runs (in order):
1. ✅ TypeScript type checking
2. ✅ ESLint linting
3. ✅ Unit tests
4. ✅ Production build

**Time:** ~15 seconds

---

## What Happens When You Commit

```bash
$ git commit -m "add feature"

# Automatically runs:
# 1. lint-staged finds TypeScript files you changed
# 2. Runs ESLint on those files
# 3. Auto-fixes common issues
# 4. Adds fixes back to staging
# 5. Completes commit
```

If serious issues remain, commit is blocked and you can fix them.

---

## Individual Commands

```bash
# Check everything before pushing
npm run check

# Just linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# TypeScript type checking
npm run typecheck

# Run tests
npm test

# Watch tests (re-run on file change)
npm run test:watch

# Build only
npm run build

# Dev mode with watching
npm run dev
```

---

## Success Indicators

### ✅ All Checks Pass
```bash
$ npm run check
[✓] typecheck
[✓] lint
[✓] test
[✓] build
```

Then push with confidence:
```bash
git push origin your-branch
```

### ❌ Linting Fails
```bash
$ npm run lint
src/index.ts:5:10 - error: unused variable 'x'
```

Fix:
```bash
npm run lint:fix  # Auto-fix what it can
# Manual review and fix any remaining issues
npm run lint      # Verify fixed
```

### ❌ Tests Fail
```bash
$ npm test
FAIL __tests__/middleware.test.ts
```

Fix:
```bash
# Edit code to make test pass
npm test  # Verify fixed
```

---

## CI/CD Benefits

### Local Checks
- **Fast feedback** — See errors immediately (15 seconds)
- **Auto-fix** — ESLint fixes many issues automatically
- **No surprises** — What passes locally passes in CI

### CI/CD Validation (GitHub Actions)
- Tests again on Node 18, 20, 22
- Generates coverage reports
- Publishes on version tags

---

## Troubleshooting

### "husky pre-commit hook failed"
**Problem:** Git commit blocked by validation

**Solution:**
```bash
npm run lint:fix   # Auto-fix issues
npm test           # Verify tests pass
git add .          # Re-stage fixes
git commit -m "..."  # Try again
```

### "eslint: command not found"
**Problem:** ESLint not installed

**Solution:**
```bash
npm install
```

### "npm run check is slow"
**Problem:** Full validation takes too long

**Solution:**
Run individual commands instead:
```bash
npm run lint      # ~2 seconds
npm test          # ~5 seconds
npm run typecheck # ~3 seconds
# Cherry-pick what you need
```

---

## Git Hook Behavior

### Automatic on Commit
```bash
git commit -m "add feature"
# ↓ Husky intercepts
# ↓ Runs lint-staged
# ↓ Lints changed TypeScript files
# ↓ Auto-fixes issues
# ↓ Completes commit (if no errors)
```

### Bypass (if needed)
```bash
git commit -m "..." --no-verify  # Skip hooks
# ⚠️ Not recommended! CI will catch issues anyway.
```

---

## Before Pushing to GitHub

**Checklist:**
- [ ] `npm run check` passes locally
- [ ] No console.log/console.error left in code
- [ ] All tests pass
- [ ] TypeScript types are correct

**Then:**
```bash
git push origin your-branch-name
```

CI will re-validate on GitHub, but you'll be confident it will pass.

---

## Files & Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** — Detailed dev workflow guide
- **[.eslintrc.json](./.eslintrc.json)** — Linting rules configuration
- **[.husky/pre-commit](./.husky/pre-commit)** — Git hook script

---

## Summary

You now have:
- ✅ Local linting that prevents bad commits
- ✅ Auto-fixing of common issues
- ✅ Fast feedback loop (15 seconds)
- ✅ CI/CD safety net on GitHub

**Next:** Make changes, run `npm run check`, and push! 🚀
