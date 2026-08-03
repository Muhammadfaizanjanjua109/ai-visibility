import { LLMSTextGenerator } from 'ai-visibility/generators'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'content-type', 'text/plain')

  const generator = new LLMSTextGenerator({
    siteName: 'My Nuxt App',
    description: 'Describe your site for LLMs here',
    baseUrl: 'https://example.com',
    pages: [{ url: '/', title: 'Home', priority: 'high' }],
  })

  return await generator.generate()
})
