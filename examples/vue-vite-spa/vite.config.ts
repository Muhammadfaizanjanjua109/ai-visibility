import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { RobotsGenerator, LLMSTextGenerator } from 'ai-visibility/generators'
import { SchemaBuilder } from 'ai-visibility/schema'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// A Vite SPA has no server, so ai-visibility's middleware/detector pieces
// don't apply — there's no request to detect a crawler on. What's left,
// and what actually helps: generate the static files and inject JSON-LD
// at build time, directly into the built index.html, so it's visible even
// to crawlers that never execute JavaScript.
function aiVisibilityStatic(): Plugin {
  return {
    name: 'ai-visibility-static',
    transformIndexHtml(html) {
      const schema = SchemaBuilder.website({
        name: 'My Vue App',
        url: 'https://example.com',
      })
      return html.replace(
        '</head>',
        `    <script type="application/ld+json">${JSON.stringify(schema)}</script>\n  </head>`
      )
    },
    async closeBundle() {
      const outDir = path.resolve(__dirname, 'dist')

      fs.writeFileSync(
        path.join(outDir, 'robots.txt'),
        RobotsGenerator.allowAll({ sitemapUrl: 'https://example.com/sitemap.xml' })
      )

      const llms = new LLMSTextGenerator({
        siteName: 'My Vue App',
        description: 'Describe your site for LLMs here',
        baseUrl: 'https://example.com',
        pages: [{ url: '/', title: 'Home', priority: 'high' }],
      })
      fs.writeFileSync(path.join(outDir, 'llms.txt'), await llms.generate())
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), aiVisibilityStatic()],
})
