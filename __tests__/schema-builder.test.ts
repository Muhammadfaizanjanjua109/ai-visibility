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
    it('detects FAQ from HTML with dt/dd pairs', () => {
        const html = `<html><body>
      <h1>FAQ</h1>
      <dl>
        <dt>What is this?</dt>
        <dd>An AI tool.</dd>
      </dl>
    </body></html>`
        const schema = SchemaBuilder.fromHTML(html)
        expect(schema['@type']).toBe('FAQPage')
    })

    it('detects product from pricing HTML', () => {
        const html = `<html><body>
      <h1>Pricing</h1>
      <p>Get started for $29/month</p>
      <p>Add to cart</p>
    </body></html>`
        const schema = SchemaBuilder.fromHTML(html)
        expect(schema['@type']).toBe('Product')
    })

    it('defaults to Article for generic content', () => {
        const html = `<html><body>
      <h1>How to Build a Blog</h1>
      <p>In this tutorial we will explore...</p>
    </body></html>`
        const schema = SchemaBuilder.fromHTML(html)
        expect(schema['@type']).toBe('Article')
    })
})
