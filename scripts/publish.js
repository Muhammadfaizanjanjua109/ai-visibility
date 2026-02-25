#!/usr/bin/env node

/**
 * Automated publish script for dual-registry publishing
 * Handles scope and link changes based on target registry
 *
 * Usage:
 *   node scripts/publish.js npm
 *   node scripts/publish.js github
 *
 * Note: Authentication is handled by your .npmrc configuration
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Configuration
const NPM_SCOPE = '@mfaizanjanjua109'
const GITHUB_SCOPE = '@muhammadfaizanjanjua109'
const PACKAGE_NAME = 'ai-visibility'

const NPM_REGISTRY = 'https://registry.npmjs.org/'
const GITHUB_REGISTRY = 'https://npm.pkg.github.com'

const NPM_PACKAGE_URL = `https://www.npmjs.com/package/${NPM_SCOPE}/${PACKAGE_NAME}`
const GITHUB_PACKAGE_URL = `https://npm.pkg.github.com/${GITHUB_SCOPE}/${PACKAGE_NAME}`

// Files to update during publish
const FILES_TO_UPDATE = [
  'package.json',
  'README.md',
  'DASHBOARD_GUIDE.md',
  'examples/nextjs-dashboard/app/admin/ai-visibility/page.tsx',
  'examples/vanilla-dashboard/server.js',
  'examples/vue-dashboard/pages/admin/ai-visibility.vue',
]

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8')
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8')
}

function updateFileScopes(targetRegistry) {
  log('cyan', '\n📝 Updating package scopes and links...')

  const fromScope = targetRegistry === 'npm' ? GITHUB_SCOPE : NPM_SCOPE
  const toScope = targetRegistry === 'npm' ? NPM_SCOPE : GITHUB_SCOPE

  FILES_TO_UPDATE.forEach((file) => {
    const filePath = path.join(process.cwd(), file)
    if (!fs.existsSync(filePath)) {
      log('yellow', `  ⚠ File not found: ${file}`)
      return
    }

    let content = readFile(filePath)
    const originalContent = content

    // Replace scopes in imports and requires
    content = content.replace(
      `${fromScope}/${PACKAGE_NAME}`,
      `${toScope}/${PACKAGE_NAME}`
    )

    // Update npm package links in markdown
    if (file.includes('.md')) {
      if (targetRegistry === 'npm') {
        content = content.replace(
          `npm.pkg.github.com/${GITHUB_SCOPE}/${PACKAGE_NAME}`,
          `www.npmjs.com/package/${NPM_SCOPE}/${PACKAGE_NAME}`
        )
        content = content.replace(
          /\[npm\]\(https:\/\/www\.npmjs\.com\/package\/@[^/]+\/ai-visibility\)/g,
          `[npm](${NPM_PACKAGE_URL})`
        )
      } else {
        content = content.replace(
          `www.npmjs.com/package/${NPM_SCOPE}/${PACKAGE_NAME}`,
          `npm.pkg.github.com/${GITHUB_SCOPE}/${PACKAGE_NAME}`
        )
      }
    }

    if (content !== originalContent) {
      writeFile(filePath, content)
      log('green', `  ✓ Updated ${file}`)
    }
  })
}

function restoreFileScopes(originalRegistry) {
  log('cyan', '\n↩ Restoring original scopes and links...')

  const fromScope = originalRegistry === 'npm' ? NPM_SCOPE : GITHUB_SCOPE
  const toScope = originalRegistry === 'npm' ? GITHUB_SCOPE : NPM_SCOPE

  FILES_TO_UPDATE.forEach((file) => {
    const filePath = path.join(process.cwd(), file)
    if (!fs.existsSync(filePath)) return

    let content = readFile(filePath)

    // Restore scopes
    content = content.replace(
      `${fromScope}/${PACKAGE_NAME}`,
      `${toScope}/${PACKAGE_NAME}`
    )

    writeFile(filePath, content)
  })

  log('green', '  ✓ Restored all files')
}

function publish(registry) {
  const registryUrl = registry === 'npm' ? NPM_REGISTRY : GITHUB_REGISTRY
  const registryName = registry === 'npm' ? 'npm' : 'GitHub Packages'

  log('cyan', `\n📦 Publishing to ${registryName}...`)

  const command = `npm publish --registry ${registryUrl} --access public`

  try {
    execSync(command, { stdio: 'inherit' })
    log('green', `✅ Successfully published to ${registryName}!`)
    return true
  } catch (error) {
    log('red', `❌ Failed to publish to ${registryName}`)
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const registry = args[0]

  if (!registry || !['npm', 'github'].includes(registry)) {
    log('red', '❌ Usage: node scripts/publish.js <npm|github>')
    process.exit(1)
  }

  log('cyan', `\n🚀 Starting dual-registry publish script`)
  log('cyan', `Target registry: ${registry === 'npm' ? 'npm' : 'GitHub Packages'}`)

  // Store original content for restoration
  const originalFiles = {}
  FILES_TO_UPDATE.forEach((file) => {
    const filePath = path.join(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      originalFiles[file] = readFile(filePath)
    }
  })

  try {
    // Update scopes and links
    updateFileScopes(registry)

    // Publish to registry
    const success = publish(registry)

    // Restore original files
    restoreFileScopes(registry)

    if (success) {
      log('green', `\n✨ Publish complete!`)
      log('cyan', `\nInstall with:`)
      if (registry === 'npm') {
        log('green', `  npm install ${NPM_SCOPE}/${PACKAGE_NAME}`)
      } else {
        log('green', `  npm install ${GITHUB_SCOPE}/${PACKAGE_NAME} --registry ${GITHUB_REGISTRY}`)
      }
      process.exit(0)
    } else {
      // Restore files on failure
      Object.entries(originalFiles).forEach(([file, content]) => {
        writeFile(path.join(process.cwd(), file), content)
      })
      process.exit(1)
    }
  } catch (error) {
    log('red', `\n❌ Error: ${error.message}`)
    // Restore files on error
    Object.entries(originalFiles).forEach(([file, content]) => {
      writeFile(path.join(process.cwd(), file), content)
    })
    process.exit(1)
  }
}

main()
