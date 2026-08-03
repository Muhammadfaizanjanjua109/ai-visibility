import { RobotsGenerator } from 'ai-visibility/generators'

export function loader() {
  const body = RobotsGenerator.allowAll({
    sitemapUrl: 'https://example.com/sitemap.xml',
  })
  return new Response(body, {
    headers: { 'content-type': 'text/plain' },
  })
}
