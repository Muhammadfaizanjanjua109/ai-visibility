# Development Guide

Local development setup and workflow for `ai-visibility`.

---

## Initial Setup

```bash
# Clone and install
git clone https://github.com/Muhammadfaizanjunjua109/ai-visibility
cd ai-visibility
npm install

# This will automatically set up git hooks (pre-commit checks)
```

---

## Local Validation Commands

Before pushing, run these commands locally:

### Quick Check (Recommended before every commit)
```bash
npm run check
```

This runs:
1. ✅ `npm run typecheck` — TypeScript compilation check
2. ✅ `npm run lint` — ESLint validation
3. ✅ `npm test` — Unit tests
4. ✅ `npm run build` — Production build

**Time:** ~10-15 seconds

### Individual Commands

```bash
# TypeScript type checking
npm run typecheck

# Linting with auto-fix
npm run lint:fix

# Watch mode linting (as you type)
npm run lint

# Run tests
npm test

# Watch mode tests (re-run on file change)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Build for production
npm run build

# Development with file watching
npm run dev
```

---

## Git Hooks (Automatic)

The project uses **Husky** + **Lint-Staged** for automatic checks:

### Pre-commit Hook
When you run `git commit`, the pre-commit hook automatically:
1. Runs ESLint on staged TypeScript files
2. Auto-fixes common issues
3. Prevents commit if errors remain

**You can skip this with:**
```bash
git commit --no-verify  # Not recommended!
```

---

## Typical Workflow

### 1. Make changes
```bash
# Edit src/index.ts, src/lib/helper.ts, etc.
```

### 2. Stage and test
```bash
# Stage your changes
git add src/

# Run full checks locally
npm run check

# If all pass, commit
git commit -m "feature: add new capability"
```

### 3. Push to GitHub
```bash
git push origin your-branch
```

The CI/CD pipeline will:
- ✅ Re-run typecheck, lint, test, build (on Node 18, 20, 22)
- ✅ Generate coverage report
- ✅ Post results to your PR

---

## Fixing Lint Errors

### Automatic fixing
```bash
npm run lint:fix
```

This auto-fixes:
- Formatting issues
- Unused variables
- Import ordering
- etc.

### Manual review
If `npm run lint:fix` doesn't fix all issues:
```bash
npm run lint
```

Review the output and fix manually:
- Check `.eslintrc.json` for rules
- Some rules require manual fixes (logic errors, naming)
- Review the issue and make appropriate changes

---

## Common Issues

### Commit blocked by pre-commit hook
**Problem:** `git commit` fails because lint-staged found errors

**Solution:**
```bash
# Fix linting issues
npm run lint:fix

# Stage the fixes
git add .

# Try commit again
git commit -m "your message"
```

### "npm run lint" fails locally but passes in CI
**Problem:** Local ESLint version differs from CI

**Solution:**
```bash
# Reinstall dependencies
npm install

# Clear ESLint cache
npx eslint --cache --cache-location .eslintcache --fix src/

# Verify
npm run lint
```

### TypeScript errors not caught by VS Code
**Problem:** tsc finds errors that your editor doesn't show

**Solution:**
```bash
# Rebuild TypeScript
npx tsc --noEmit

# Check if tsconfig.json is being read correctly
npx tsc --showConfig
```

---

## Pre-push Checklist

Before pushing to main:

- [ ] `npm run check` passes locally
- [ ] All tests pass (`npm test`)
- [ ] No console.error/console.log left in production code
- [ ] TypeScript types are correct (`npm run typecheck`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Commit messages follow convention (imperative mood)

---

## Publishing New Versions

### For maintainers only

```bash
# Ensure everything is committed and working
npm run check

# Bump version and publish to both registries
npm run publish:both

# This will:
# 1. Bump patch version (0.1.1 → 0.1.2)
# 2. Create git commit
# 3. Create git tag (v0.1.2)
# 4. Publish to npm registry
# 5. Publish to GitHub Packages

# If something goes wrong, you can undo:
git reset --hard HEAD~1  # Undo last commit
git tag -d v0.1.2       # Delete tag
```

---

## IDE Setup

### VS Code (Recommended)

Install extensions:
1. **ESLint** — `dbaeumer.vscode-eslint`
2. **TypeScript Vue Plugin** — `Vue.vscode-typescript-vue-plugin` (optional)

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "dbaeumer.vscode-eslint"
  },
  "eslint.validate": ["typescript"]
}
```

### WebStorm / IntelliJ

1. **Settings** → **Languages & Frameworks** → **TypeScript** → **ESLint**
2. Enable ESLint
3. Set **Configuration file** to `.eslintrc.json`

---

## Test Coverage

View coverage report:
```bash
npm run test:coverage

# Open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

**Target:** Maintain >80% coverage for critical paths

---

## Performance Profiling

Profile the code to find bottlenecks:

```bash
# CPU profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Memory profiling
node --inspect app.js
# Then open chrome://inspect
```

---

## CI/CD Debugging

If CI fails but your local checks pass:

1. **Check Node.js version:**
   ```bash
   node --version
   # Should be 18.x, 20.x, or 22.x
   ```

2. **Reproduce CI environment:**
   ```bash
   # Use same npm version as CI
   npm ci  # instead of npm install
   npm run check
   ```

3. **View CI logs:**
   - Go to GitHub → Actions tab
   - Click the failed workflow
   - Expand the job to see detailed logs

---

## Release Checklist

Before publishing a new version:

- [ ] All tests pass: `npm test`
- [ ] Coverage stable or improved
- [ ] No breaking changes (or documented in CHANGELOG)
- [ ] Documentation updated
- [ ] Examples updated if APIs changed
- [ ] Version bump in package.json (or use `npm version`)
- [ ] Git tag created
- [ ] CHANGELOG.md updated
- [ ] Release notes on GitHub

---

## Useful npm Scripts Summary

| Command | Purpose | Time |
|---------|---------|------|
| `npm run check` | Full local validation | ~15s |
| `npm run lint:fix` | Auto-fix linting issues | ~5s |
| `npm run typecheck` | TypeScript compilation | ~3s |
| `npm test` | Run unit tests | ~5s |
| `npm test:watch` | Tests in watch mode | ∞ (interactive) |
| `npm run test:coverage` | Generate coverage report | ~10s |
| `npm run build` | Production build | ~5s |
| `npm run dev` | Development with watch | ∞ (interactive) |
| `npm run publish:both` | Publish to npm + GitHub | ~30s |

---

## Need Help?

- **Linting issues?** → See `.eslintrc.json` rules
- **Test failures?** → Check `__tests__/` for patterns
- **TypeScript errors?** → Review `tsconfig.json`
- **Build errors?** → Check `tsup.config.ts`
- **Performance issues?** → See docs/performance.md

