import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { AIBotDetector } from 'ai-visibility/detector'
import { SchemaBuilder } from 'ai-visibility/schema'

import type { Route } from './+types/root'

// Root loaders run for every request in React Router's framework mode —
// the natural place for request-level bot detection. There's no separate
// Express-style middleware layer here; a plain AIBotDetector instance is
// enough, since it (like the rest of ai-visibility/detector) has zero
// runtime dependencies.
const detector = new AIBotDetector()

export function loader({ request }: Route.LoaderArgs) {
  const userAgent = request.headers.get('user-agent') ?? ''
  const bot = detector.detect(userAgent)
  return { isAIBot: Boolean(bot), botName: bot?.name ?? null }
}

const websiteSchema = SchemaBuilder.website({
  name: 'My React Router App',
  url: 'https://example.com',
})

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* JSON-LD doesn't need to be inside <head> specifically, but this
            is the natural site-wide place for it since Layout wraps every route. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
