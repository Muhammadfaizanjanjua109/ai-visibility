# Quick Release Guide

## 🚀 One-Command Release

When you're ready to publish:

```bash
npm run release
```

This **automatically**:
- ✅ Runs all validations (TypeScript, ESLint, tests, build)
- ✅ Bumps version (0.1.1 → 0.1.2)
- ✅ Creates git commit
- ✅ Creates git tag
- ✅ Publishes to npm
- ✅ Publishes to GitHub Packages
- ✅ Shows success message

**Done in ~45 seconds!**

---

## 📋 Two-Step Process (More Control)

**Step 1: Validate**
```bash
npm run ready-to-publish
```
Shows: `✅ All checks passed! Safe to publish.`

**Step 2: Publish**
```bash
npm run publish:both
```
Shows: `✅ Published to npm and GitHub Packages!`

---

## 📚 All Commands

```bash
npm run check              # Quick validation (~15s)
npm run ready-to-publish   # Full check + confirmation (~15s)
npm run publish:both       # Validates + publishes (~30s)
npm run release            # Full workflow: validate + publish (~45s)
```

---

## 🎯 Typical Workflow

```bash
# 1. Make changes
git checkout -b feature/my-feature
# Edit code...

# 2. Validate locally
npm run check

# 3. Commit and push
git add .
git commit -m "feature: add something"
git push origin feature/my-feature

# 4. Merge PR to main

# 5. Release!
git checkout main
git pull origin main
npm run release

# ✅ Done! Published to npm and GitHub Packages
```

---

## ✨ What Makes This Safe

1. **Automatic validation** before every publish
2. **Git history** — Each release creates a commit and tag
3. **Dual publishing** — Both registries get the same version
4. **No surprises** — What passes locally passes in CI/CD

---

See [RELEASE_WORKFLOW.md](./RELEASE_WORKFLOW.md) for detailed information.
