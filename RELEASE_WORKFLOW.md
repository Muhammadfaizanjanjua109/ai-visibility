# Release Workflow

Safe and automatic publishing to npm + GitHub Packages with one command.

---

## 🚀 Quick Release (Recommended)

**One command does everything:**

```bash
npm run release
```

This automatically:
1. ✅ Runs TypeScript type checking
2. ✅ Runs ESLint linting
3. ✅ Runs all tests
4. ✅ Builds the package
5. ✅ Bumps version (0.1.1 → 0.1.2)
6. ✅ Creates git commit
7. ✅ Creates git tag
8. ✅ Publishes to npm registry
9. ✅ Publishes to GitHub Packages
10. ✅ Confirms success

**Time:** ~40-50 seconds

---

## 📋 Two-Step Workflow (More Control)

If you prefer to validate before publishing:

### Step 1: Validate Everything
```bash
npm run ready-to-publish
```

Output:
```
✓ TypeScript type checking
✓ ESLint linting
✓ All tests (42 passed)
✓ Production build successful

✅ All checks passed! Safe to publish.
Run: npm run publish:both
```

### Step 2: Publish (When Ready)
```bash
npm run publish:both
```

This runs:
- All checks again (safety)
- Version bump (0.1.1 → 0.1.2)
- Publishes to npm
- Publishes to GitHub Packages
- Shows success message

---

## 🔄 What Each Command Does

### `npm run release` (Full Workflow)
```bash
npm run release
↓
npm run ready-to-publish (validates everything)
↓
npm run publish:both (publishes to both registries)
```

**Use when:** You're ready to release immediately

### `npm run ready-to-publish` (Validation Only)
```bash
npm run ready-to-publish
↓
Runs all checks
↓
Tells you if safe to publish
```

**Use when:** You want to validate before committing

### `npm run publish:both` (Publish Only)
```bash
npm run publish:both
↓
Runs all checks again
↓
Bumps version
↓
Publishes to npm
↓
Publishes to GitHub Packages
```

**Use when:** Ready to publish after validation

### `npm run check` (Quick Check)
```bash
npm run check
↓
TypeScript check
↓
ESLint check
↓
Tests
↓
Build
```

**Use when:** Testing locally, checking before commit

---

## 📊 Release Checklist

Before running `npm run release`:

- [ ] All code changes committed
- [ ] All feature branches merged to main
- [ ] No uncommitted changes in working directory
- [ ] Ready for version bump (0.1.1 → 0.1.2)

**Then:**
```bash
npm run release
```

---

## 🛡️ Safety Features

### Automatic Validation
Every step in the release process includes:
1. ✅ Type checking (catches TypeScript errors)
2. ✅ Linting (catches code quality issues)
3. ✅ Tests (catches logic errors)
4. ✅ Build (catches compilation errors)

### Version Management
- `npm version` automatically:
  - Bumps package.json version
  - Creates git commit
  - Creates git tag
  - Locks the version in git history

### Dual Publishing
- npm registry and GitHub Packages are both published
- If one fails, both fail (atomic operation)
- Both get the exact same version

---

## 📈 Example Release Session

```bash
$ npm run release

Running: npm run ready-to-publish

> @Muhammadfaizanjunjua109/ai-visibility@0.1.1 check
> npm run typecheck && npm run lint && npm run test && npm run build

✓ TypeScript compilation successful
✓ ESLint validation passed
✓ 42 tests passed in 2.4s
✓ Build successful (dist/index.js 39.32 KB)

✅ All checks passed! Safe to publish.
Run: npm run publish:both

Running: npm run publish:both

> npm version patch
v0.1.2

> npm publish --registry https://registry.npmjs.org/
✓ Published @Muhammadfaizanjunjua109/ai-visibility@0.1.2 to npm

> npm publish --registry https://npm.pkg.github.com
✓ Published @Muhammadfaizanjunjua109/ai-visibility@0.1.2 to GitHub Packages

✅ Published to npm and GitHub Packages!
```

---

## ❌ If Something Fails

### TypeScript Errors
```bash
src/index.ts:5:10 - error TS2345: Type 'string' not assignable to type 'number'
```

**Fix:**
```bash
# Edit file
vim src/index.ts

# Try again
npm run release
```

### Linting Errors
```bash
src/index.ts:3:1 - error: unused variable 'x'
```

**Fix:**
```bash
# Auto-fix
npm run lint:fix

# Or manually fix
vim src/index.ts

# Try again
npm run release
```

### Test Failures
```bash
FAIL __tests__/middleware.test.ts
```

**Fix:**
```bash
# Run tests in watch mode
npm run test:watch

# Fix failing test
vim __tests__/middleware.test.ts

# Try again
npm run release
```

### Build Errors
```bash
tsup: error: Cannot find module 'missing-package'
```

**Fix:**
```bash
# Install missing dependency
npm install missing-package

# Try again
npm run release
```

---

## 🔐 Security Best Practices

### Before Every Release

1. **Ensure clean working directory:**
   ```bash
   git status
   # Should show: "On branch main, nothing to commit"
   ```

2. **Verify remote is up-to-date:**
   ```bash
   git pull origin main
   ```

3. **Run release:**
   ```bash
   npm run release
   ```

4. **Verify published:**
   ```bash
   # Check npm
   npm view @Muhammadfaizanjunjua109/ai-visibility@latest

   # Check GitHub Packages
   curl -s https://npm.pkg.github.com/@Muhammadfaizanjunjua109/ai-visibility | jq '.version'
   ```

---

## 📋 Version Bump Strategy

### Current Setup
Uses `npm version patch` which:
- Bumps: 0.1.1 → 0.1.2 (patch)
- Best for: Bug fixes

### To Bump Minor (New Features)
```bash
npm version minor
npm publish --registry https://registry.npmjs.org/
npm publish --registry https://npm.pkg.github.com
```
- Bumps: 0.1.1 → 0.2.0 (minor)

### To Bump Major (Breaking Changes)
```bash
npm version major
npm publish --registry https://registry.npmjs.org/
npm publish --registry https://npm.pkg.github.com
```
- Bumps: 0.1.1 → 1.0.0 (major)

---

## 🎯 Recommended Release Process

1. **Make and test changes:**
   ```bash
   git checkout -b feature/new-feature
   # Edit code
   npm run check  # Validate locally
   git commit -m "feature: add new thing"
   ```

2. **Create Pull Request:**
   ```bash
   git push origin feature/new-feature
   # Create PR on GitHub
   # Get review approval
   # Merge to main
   ```

3. **Release:**
   ```bash
   git checkout main
   git pull origin main
   npm run release
   ```

4. **Verify:**
   ```bash
   npm view @Muhammadfaizanjunjua109/ai-visibility@latest version
   # Should show: 0.1.2
   ```

---

## 💡 Tips

### Fast Release Flow
```bash
# After merging PR to main:
npm run release  # One command, done!
```

### Validate Before Committing
```bash
# In feature branch:
npm run check    # Runs all checks locally
git add .
git commit -m "feature: ..."
git push
```

### Check What Will Be Published
```bash
npm pack
# Creates ai-visibility-0.1.2.tgz
# Shows exactly what will be published
```

### See Version History
```bash
git log --oneline -10
# Shows all version tags and commits
```

---

## 📞 Troubleshooting

### "npm version patch failed"
**Reason:** Uncommitted changes or git issues

**Fix:**
```bash
git status          # Check for uncommitted changes
git add .           # Stage changes if needed
npm run release     # Try again
```

### "Publishing to npm failed"
**Reason:** Missing NPM_TOKEN secret

**Fix:**
1. Create npm access token: https://www.npmjs.com/settings/~/tokens
2. Add to GitHub repository secrets:
   - Go to Settings → Secrets and Variables → Actions
   - Add `NPM_TOKEN` with your token

### "GitHub Packages publishing failed"
**Reason:** Missing authentication

**Fix:**
```bash
# Create personal access token (GitHub)
# https://github.com/settings/tokens

# Add to ~/.npmrc:
@Muhammadfaizanjunjua109:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN

# Try again
npm run release
```

---

## 📚 Command Reference

| Command | Purpose | Time |
|---------|---------|------|
| `npm run check` | Validate locally | ~15s |
| `npm run ready-to-publish` | Check if safe to publish | ~15s |
| `npm run publish:both` | Publish to both registries | ~30s |
| `npm run release` | Full release workflow | ~45s |

---

## ✅ Success Indicators

### Release Complete
```
✅ Published to npm and GitHub Packages!
```

Both registries updated with new version.

### Check Verification
```bash
npm view @Muhammadfaizanjunjua109/ai-visibility versions
# Should show your new version in the list
```

---

**You're ready to release!** 🚀
