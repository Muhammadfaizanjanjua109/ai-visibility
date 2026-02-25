# Publishing Scripts

## Dual-Registry Publishing

The `publish.js` script automates publishing to npm and GitHub Packages with automatic scope and link updates.

### Why This Script?

- **npm** requires scope: `@mfaizanjanjua109` (npm username)
- **GitHub Packages** requires scope: `@muhammadfaizanjanjua109` (GitHub username)

This script temporarily updates your package scope and documentation links based on the target registry, publishes, then restores everything.

### Usage

#### Publish to npm

```bash
npm run publish:npm
```

This will:
1. Update all files to use `@mfaizanjanjua109/ai-visibility`
2. Update documentation links to npm registry
3. Run `npm run check` (validate everything)
4. Publish to npm (authentication handled by .npmrc)
5. Restore all files to original state

**Note:** Authentication is handled by your npm configuration in `.npmrc`. Configure it as needed (OTP, token, etc.).

#### Publish to GitHub Packages

```bash
npm run publish:github
```

This will:
1. Update all files to use `@muhammadfaizanjanjua109/ai-visibility`
2. Update documentation links to GitHub Packages registry
3. Run `npm run check` (validate everything)
4. Publish to GitHub Packages
5. Restore all files to original state

**Note:** Requires `GITHUB_TOKEN` in your environment (GitHub Actions sets this automatically)

#### Publish to Both Registries

```bash
npm run publish:both
```

This will:
1. Validate everything with `npm run check`
2. Bump version with `npm version patch`
3. Publish to npm (authentication via .npmrc)
4. Publish to GitHub Packages (authentication via .npmrc)
5. Display success message

### Files Updated During Publishing

The script temporarily updates these files before publishing:

- `package.json` — Package scope
- `README.md` — Installation commands and package links
- `DASHBOARD_GUIDE.md` — Installation and package links
- `examples/nextjs-dashboard/app/admin/ai-visibility/page.tsx` — Import statements
- `examples/vanilla-dashboard/server.js` — Require statements
- `examples/vue-dashboard/pages/admin/ai-visibility.vue` — Import statements

All files are restored to their original state after publishing completes.

### How It Works

```
1. User runs: npm run publish:npm --otp=123456
         ↓
2. Script updates package.json:
   @muhammadfaizanjanjua109 → @mfaizanjanjua109
         ↓
3. Script updates all doc/example files with new scope
         ↓
4. Script runs: npm run check (validate)
         ↓
5. Script runs: npm publish --registry https://registry.npmjs.org/ --otp=123456
         ↓
6. Script restores all files to original state
         ↓
7. Done! ✨
```

### Manual Publishing (If Needed)

If you need to manually publish without the script:

```bash
# Run the script directly:
node scripts/publish.js npm
node scripts/publish.js github
```

### Authentication

Both registries use your `.npmrc` configuration for authentication:

**For npm:**
- Set `//registry.npmjs.org/:_authToken=your_token` in `.npmrc`
- Or use `npm login` and npm will manage tokens
- Or provide OTP when prompted (if 2FA is enabled)

**For GitHub Packages:**
- Set `//npm.pkg.github.com/:_authToken=your_github_token` in `.npmrc`
- Use a GitHub Personal Access Token with `read:packages` and `write:packages` scopes

### Troubleshooting

**Authentication failed:**
- Make sure `GITHUB_TOKEN` environment variable is set
- In GitHub Actions, this is set automatically
- Locally, you may need to: `export GITHUB_TOKEN=your_token`

**Files not restored:**
- If the script fails, some files might not be restored
- Check `git status` to see what changed
- Run `git restore .` to revert all changes
