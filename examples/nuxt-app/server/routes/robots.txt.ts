import { RobotsGenerator } from 'ai-visibility/generators'

// IMPORTANT: `nuxi init` scaffolds a placeholder public/robots.txt. Nitro
// serves static files from public/ BEFORE dynamic server routes at the same
// path, so that placeholder silently shadows this route unless you delete
// it. Same applies to public/llms.txt if one exists.
export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain')
  return RobotsGenerator.allowAll({
    sitemapUrl: 'https://example.com/sitemap.xml',
  })
})
