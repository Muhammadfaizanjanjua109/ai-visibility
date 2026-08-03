import { LLMSTextGenerator } from 'ai-visibility/generators'

export async function loader() {
  const generator = new LLMSTextGenerator({
    siteName: 'My React Router App',
    description: 'Describe your site for LLMs here',
    baseUrl: 'https://example.com',
    pages: [{ url: '/', title: 'Home', priority: 'high' }],
  })

  const body = await generator.generate()
  return new Response(body, {
    headers: { 'content-type': 'text/plain' },
  })
}
