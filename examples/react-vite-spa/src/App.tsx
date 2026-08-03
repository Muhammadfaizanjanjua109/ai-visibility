import { SchemaBuilder } from 'ai-visibility/schema'

// IMPORTANT: this only reaches crawlers that execute JavaScript. A pure
// client SPA's initial HTML response has nothing for anyone else — the
// build-time injection in vite.config.ts (transformIndexHtml) is what
// makes the WebSite schema visible to non-JS-executing crawlers too.
//
// A plain <script> element works here — no react-helmet-async or similar
// needed. JSON-LD doesn't have to live in <head>; Google's own structured
// data docs explicitly allow it anywhere in the document.
function App() {
  const productSchema = SchemaBuilder.product({
    name: 'Example Product',
    price: 29,
    currency: 'USD',
  })

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <h1>My React App</h1>
    </>
  )
}

export default App
