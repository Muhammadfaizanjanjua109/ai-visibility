// ============================================================
// Tests: Schema Builder
// ============================================================

import { describe, it, expect } from 'vitest'
import { SchemaBuilder } from '../src/schema/schema-builder'

describe('SchemaBuilder.faq', () => {
    it('generates valid FAQPage schema', () => {
        const schema = SchemaBuilder.faq([
            { q: 'What is this?', a: 'An AI visibility tool.' },
            { q: 'Is it free?', a: 'Yes, open source.' },
        ])

        expect(schema['@context']).toBe('https://schema.org')
        expect(schema['@type']).toBe('FAQPage')
        expect(Array.isArray(schema['mainEntity'])).toBe(true)
        const entities = schema['mainEntity'] as any[]
        expect(entities).toHaveLength(2)
        expect(entities[0]['@type']).toBe('Question')
        expect(entities[0]['name']).toBe('What is this?')
        expect(entities[0]['acceptedAnswer']['text']).toBe('An AI visibility tool.')
    })
})

describe('SchemaBuilder.product', () => {
    it('generates valid Product schema', () => {
        const schema = SchemaBuilder.product({
            name: 'MyApp Pro',
            price: 29,
            currency: 'USD',
            features: ['Feature A', 'Feature B'],
        })

        expect(schema['@type']).toBe('Product')
        expect(schema['name']).toBe('MyApp Pro')
        const offers = schema['offers'] as any
        expect(offers['price']).toBe(29)
        expect(offers['priceCurrency']).toBe('USD')
    })

    it('includes author when provided', () => {
        const schema = SchemaBuilder.product({
            name: 'Tool',
            price: 0,
            author: { name: 'Jane Doe', jobTitle: 'Engineer' },
        })
        const author = schema['author'] as any
        expect(author['name']).toBe('Jane Doe')
        expect(author['jobTitle']).toBe('Engineer')
    })

    it('defaults currency to USD', () => {
        const schema = SchemaBuilder.product({ name: 'X', price: 10 })
        expect((schema['offers'] as any)['priceCurrency']).toBe('USD')
    })
})

describe('SchemaBuilder.article', () => {
    it('generates valid Article schema', () => {
        const schema = SchemaBuilder.article({
            headline: 'How to optimize for AI',
            author: 'John Doe',
            publisher: 'TechBlog',
        })

        expect(schema['@type']).toBe('Article')
        expect(schema['headline']).toBe('How to optimize for AI')
        expect((schema['author'] as any)['name']).toBe('John Doe')
        expect((schema['publisher'] as any)['name']).toBe('TechBlog')
    })
})

describe('SchemaBuilder.organization', () => {
    it('generates valid Organization schema', () => {
        const schema = SchemaBuilder.organization({
            name: 'Acme Corp',
            url: 'https://acme.com',
            email: 'hello@acme.com',
        })

        expect(schema['@type']).toBe('Organization')
        expect(schema['name']).toBe('Acme Corp')
        expect(schema['email']).toBe('hello@acme.com')
    })
})

describe('SchemaBuilder.person', () => {
    it('generates valid Person schema', () => {
        const schema = SchemaBuilder.person({
            name: 'Alice Smith',
            jobTitle: 'CTO',
            worksFor: 'Acme Corp',
        })

        expect(schema['@type']).toBe('Person')
        expect(schema['name']).toBe('Alice Smith')
        expect((schema['worksFor'] as any)['name']).toBe('Acme Corp')
    })
})

describe('SchemaBuilder.website', () => {
    it('generates minimal WebSite schema with no search action', () => {
        const schema = SchemaBuilder.website({
            name: 'My Site',
            url: 'https://example.com',
        })

        expect(schema['@context']).toBe('https://schema.org')
        expect(schema['@type']).toBe('WebSite')
        expect(schema['name']).toBe('My Site')
        expect(schema['url']).toBe('https://example.com')
        expect(schema['potentialAction']).toBeUndefined()
    })

    it('generates fully-populated WebSite schema with SearchAction', () => {
        const schema = SchemaBuilder.website({
            name: 'My Site',
            url: 'https://example.com',
            description: 'A great site',
            searchAction: {
                urlTemplate: 'https://example.com/search?q={search_term_string}',
            },
        })

        expect(schema['description']).toBe('A great site')
        const action = schema['potentialAction'] as any
        expect(action['@type']).toBe('SearchAction')
        expect(action.target['@type']).toBe('EntryPoint')
        expect(action.target.urlTemplate).toBe('https://example.com/search?q={search_term_string}')
        expect(action['query-input']).toBe('required name=search_term_string')
    })

    it('respects a custom query-input', () => {
        const schema = SchemaBuilder.website({
            name: 'My Site',
            url: 'https://example.com',
            searchAction: {
                urlTemplate: 'https://example.com/search?q={q}',
                queryInput: 'required name=q',
            },
        })

        const action = schema['potentialAction'] as any
        expect(action['query-input']).toBe('required name=q')
    })
})

describe('SchemaBuilder.softwareApplication', () => {
    it('generates minimal SoftwareApplication schema', () => {
        const schema = SchemaBuilder.softwareApplication({
            name: 'ai-visibility',
            description: 'Make your app citable by AI',
            url: 'https://example.com/ai-visibility',
        })

        expect(schema['@context']).toBe('https://schema.org')
        expect(schema['@type']).toBe('SoftwareApplication')
        expect(schema['applicationCategory']).toBe('DeveloperApplication')
        expect(schema['operatingSystem']).toBe('Any')
        expect(schema['offers']).toBeUndefined()
        expect(schema['aggregateRating']).toBeUndefined()
    })

    it('generates fully-populated SoftwareApplication schema, reusing the Offer builder', () => {
        const schema = SchemaBuilder.softwareApplication({
            name: 'ai-visibility',
            description: 'Make your app citable by AI',
            url: 'https://example.com/ai-visibility',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Windows, macOS, Linux',
            offers: { price: 29, priceCurrency: 'USD', availability: 'InStock' },
            aggregateRating: { ratingValue: 4.8, ratingCount: 120 },
        })

        expect(schema['applicationCategory']).toBe('BusinessApplication')
        const offer = schema['offers'] as any
        expect(offer['@type']).toBe('Offer')
        expect(offer.price).toBe(29)
        expect(offer.availability).toBe('https://schema.org/InStock')
        const rating = schema['aggregateRating'] as any
        expect(rating['@type']).toBe('AggregateRating')
        expect(rating.ratingValue).toBe(4.8)
        expect(rating.ratingCount).toBe(120)
    })
})

describe('SchemaBuilder.breadcrumbList', () => {
    it('generates minimal BreadcrumbList schema from absolute URLs', () => {
        const schema = SchemaBuilder.breadcrumbList([
            { name: 'Home', url: 'https://example.com' },
            { name: 'Blog', url: 'https://example.com/blog' },
        ])

        expect(schema['@context']).toBe('https://schema.org')
        expect(schema['@type']).toBe('BreadcrumbList')
        const items = schema['itemListElement'] as any[]
        expect(items).toHaveLength(2)
        expect(items[0]['@type']).toBe('ListItem')
        expect(items[0].position).toBe(1)
        expect(items[0].item).toBe('https://example.com')
        expect(items[1].position).toBe(2)
    })

    it('resolves relative paths against baseUrl when provided', () => {
        const schema = SchemaBuilder.breadcrumbList(
            [
                { name: 'Home', url: '/' },
                { name: 'Docs', url: '/docs' },
            ],
            { baseUrl: 'https://example.com' }
        )

        const items = schema['itemListElement'] as any[]
        expect(items[0].item).toBe('https://example.com/')
        expect(items[1].item).toBe('https://example.com/docs')
    })
})

describe('SchemaBuilder.definedTerm / definedTermSet', () => {
    it('generates minimal DefinedTerm schema', () => {
        const schema = SchemaBuilder.definedTerm({
            name: 'GEO',
            description: 'Generative Engine Optimization',
        })

        expect(schema['@context']).toBe('https://schema.org')
        expect(schema['@type']).toBe('DefinedTerm')
        expect(schema['url']).toBeUndefined()
        expect(schema['inDefinedTermSet']).toBeUndefined()
    })

    it('generates fully-populated DefinedTerm schema', () => {
        const schema = SchemaBuilder.definedTerm({
            name: 'GEO',
            description: 'Generative Engine Optimization',
            url: 'https://example.com/glossary/geo',
            inDefinedTermSet: 'https://example.com/glossary',
        })

        expect(schema['url']).toBe('https://example.com/glossary/geo')
        expect(schema['inDefinedTermSet']).toBe('https://example.com/glossary')
    })

    it('generates DefinedTermSet schema', () => {
        const schema = SchemaBuilder.definedTermSet({
            name: 'AI Visibility Glossary',
            url: 'https://example.com/glossary',
            description: 'Terms related to AI visibility and GEO',
        })

        expect(schema['@type']).toBe('DefinedTermSet')
        expect(schema['name']).toBe('AI Visibility Glossary')
        expect(schema['description']).toBe('Terms related to AI visibility and GEO')
    })
})

describe('SchemaBuilder.offer', () => {
    it('generates minimal Offer node with USD default currency', () => {
        const schema = SchemaBuilder.offer({ price: 29 })

        expect(schema['@type']).toBe('Offer')
        expect(schema['price']).toBe(29)
        expect(schema['priceCurrency']).toBe('USD')
        expect(schema['availability']).toBeUndefined()
    })

    it('generates fully-populated Offer node', () => {
        const schema = SchemaBuilder.offer({
            price: 49,
            priceCurrency: 'EUR',
            availability: 'PreOrder',
            url: 'https://example.com/buy',
            priceValidUntil: '2027-01-01',
        })

        expect(schema['priceCurrency']).toBe('EUR')
        expect(schema['availability']).toBe('https://schema.org/PreOrder')
        expect(schema['url']).toBe('https://example.com/buy')
        expect(schema['priceValidUntil']).toBe('2027-01-01')
    })
})

describe('SchemaBuilder.aggregateRating', () => {
    it('generates minimal AggregateRating node', () => {
        const schema = SchemaBuilder.aggregateRating({ ratingValue: 4.5 })

        expect(schema['@type']).toBe('AggregateRating')
        expect(schema['ratingValue']).toBe(4.5)
        expect(schema['reviewCount']).toBeUndefined()
    })

    it('generates fully-populated AggregateRating node', () => {
        const schema = SchemaBuilder.aggregateRating({
            ratingValue: 4.7,
            reviewCount: 85,
            ratingCount: 100,
            bestRating: 5,
            worstRating: 1,
        })

        expect(schema['reviewCount']).toBe(85)
        expect(schema['ratingCount']).toBe(100)
        expect(schema['bestRating']).toBe(5)
        expect(schema['worstRating']).toBe(1)
    })
})

describe('SchemaBuilder.toScriptTag', () => {
    it('wraps schema in script tag', () => {
        const schema = SchemaBuilder.faq([{ q: 'Q?', a: 'A.' }])
        const tag = SchemaBuilder.toScriptTag(schema)
        expect(tag).toContain('<script type="application/ld+json">')
        expect(tag).toContain('</script>')
        expect(tag).toContain('"FAQPage"')
    })
})

describe('SchemaBuilder.fromHTML', () => {
    it('detects FAQ from HTML with dt/dd pairs', async () => {
        const html = `<html><body>
      <h1>FAQ</h1>
      <dl>
        <dt>What is this?</dt>
        <dd>An AI tool.</dd>
      </dl>
    </body></html>`
        const schema = await SchemaBuilder.fromHTML(html)
        expect(schema['@type']).toBe('FAQPage')
    })

    it('detects product from pricing HTML', async () => {
        const html = `<html><body>
      <h1>Pricing</h1>
      <p>Get started for $29/month</p>
      <p>Add to cart</p>
    </body></html>`
        const schema = await SchemaBuilder.fromHTML(html)
        expect(schema['@type']).toBe('Product')
    })

    it('defaults to Article for generic content', async () => {
        const html = `<html><body>
      <h1>How to Build a Blog</h1>
      <p>In this tutorial we will explore...</p>
    </body></html>`
        const schema = await SchemaBuilder.fromHTML(html)
        expect(schema['@type']).toBe('Article')
    })
})
