// ============================================================
// Schema Builder
// Feature 3: Auto-generate JSON-LD structured data
// ============================================================

import * as cheerio from 'cheerio'
import type {
    FAQItem,
    ProductSchemaData,
    ArticleSchemaData,
    OrganizationSchemaData,
    PersonSchemaData,
} from '../types'

type SchemaObject = Record<string, unknown>

/**
 * SchemaBuilder
 *
 * Generates valid JSON-LD structured data (schema.org) for AI and search engines.
 * Supports FAQ, Product, Article, Organization, Person schemas.
 * Can auto-detect schema type from raw HTML.
 *
 * @example
 * ```ts
 * import { SchemaBuilder } from 'ai-visibility'
 *
 * // Manual FAQ schema
 * const schema = SchemaBuilder.faq([
 *   { q: 'What is this?', a: 'An AI visibility tool.' },
 * ])
 *
 * // Auto-detect from HTML
 * const schema = await SchemaBuilder.fromHTML(htmlString)
 *
 * // Render as <script> tag
 * const tag = SchemaBuilder.toScriptTag(schema)
 * ```
 */
export class SchemaBuilder {
    // ---- FAQ ----

    static faq(items: FAQItem[]): SchemaObject {
        return {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: items.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: item.a,
                },
            })),
        }
    }

    // ---- Product ----

    static product(data: ProductSchemaData): SchemaObject {
        const schema: SchemaObject = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: data.name,
            offers: {
                '@type': 'Offer',
                price: data.price,
                priceCurrency: data.currency ?? 'USD',
                availability: `https://schema.org/${data.availability ?? 'InStock'}`,
            },
        }

        if (data.description) schema['description'] = data.description
        if (data.url) schema['url'] = data.url
        if (data.image) schema['image'] = data.image
        if (data.brand) schema['brand'] = { '@type': 'Brand', name: data.brand }
        if (data.features?.length) schema['additionalProperty'] = data.features.map((f) => ({
            '@type': 'PropertyValue',
            name: 'feature',
            value: f,
        }))
        if (data.author) {
            schema['author'] = {
                '@type': 'Person',
                name: data.author.name,
                ...(data.author.jobTitle && { jobTitle: data.author.jobTitle }),
            }
        }

        return schema
    }

    // ---- Article ----

    static article(data: ArticleSchemaData): SchemaObject {
        const schema: SchemaObject = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: data.headline,
        }

        if (data.description) schema['description'] = data.description
        if (data.url) schema['url'] = data.url
        if (data.image) schema['image'] = data.image
        if (data.publishedDate) schema['datePublished'] = data.publishedDate
        if (data.modifiedDate) schema['dateModified'] = data.modifiedDate
        if (data.keywords?.length) schema['keywords'] = data.keywords.join(', ')

        if (data.author) {
            schema['author'] = { '@type': 'Person', name: data.author }
        }
        if (data.publisher) {
            schema['publisher'] = {
                '@type': 'Organization',
                name: data.publisher,
            }
        }

        return schema
    }

    // ---- Organization ----

    static organization(data: OrganizationSchemaData): SchemaObject {
        const schema: SchemaObject = {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: data.name,
        }

        if (data.url) schema['url'] = data.url
        if (data.logo) schema['logo'] = data.logo
        if (data.description) schema['description'] = data.description
        if (data.email) schema['email'] = data.email
        if (data.phone) schema['telephone'] = data.phone
        if (data.sameAs?.length) schema['sameAs'] = data.sameAs
        if (data.address) {
            schema['address'] = {
                '@type': 'PostalAddress',
                ...(data.address.street && { streetAddress: data.address.street }),
                ...(data.address.city && { addressLocality: data.address.city }),
                ...(data.address.country && { addressCountry: data.address.country }),
            }
        }

        return schema
    }

    // ---- Person ----

    static person(data: PersonSchemaData): SchemaObject {
        const schema: SchemaObject = {
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: data.name,
        }

        if (data.jobTitle) schema['jobTitle'] = data.jobTitle
        if (data.url) schema['url'] = data.url
        if (data.image) schema['image'] = data.image
        if (data.email) schema['email'] = data.email
        if (data.description) schema['description'] = data.description
        if (data.sameAs?.length) schema['sameAs'] = data.sameAs
        if (data.worksFor) schema['worksFor'] = { '@type': 'Organization', name: data.worksFor }

        return schema
    }

    // ---- Auto-detect from HTML ----

    /**
     * Analyze HTML content and auto-generate the most appropriate schema.
     * Uses heuristics to detect FAQ, Product, or Article patterns.
     */
    static fromHTML(html: string, hints: { author?: string; publisher?: string } = {}): SchemaObject {
        const $ = cheerio.load(html)
        const type = SchemaBuilder.detectType($)

        if (type === 'faq') {
            const faqs = SchemaBuilder.extractFAQs($)
            if (faqs.length > 0) return SchemaBuilder.faq(faqs)
        }

        if (type === 'product') {
            const price = SchemaBuilder.extractPrice($)
            const name = $('h1').first().text().trim() || 'Product'
            return SchemaBuilder.product({
                name,
                price: price ?? 0,
                currency: 'USD',
                features: SchemaBuilder.extractFeatures($),
            })
        }

        // Default: Article
        const headline = $('h1').first().text().trim() || 'Article'
        const description = $('meta[name="description"]').attr('content') ??
            $('p').first().text().trim().slice(0, 160)

        return SchemaBuilder.article({
            headline,
            description,
            author: hints.author ?? $('meta[name="author"]').attr('content'),
            publisher: hints.publisher,
        })
    }

    // ---- Render helpers ----

    /**
     * Serialize schema to a JSON-LD <script> tag string.
     * Use this to inject into your HTML <head>.
     */
    static toScriptTag(schema: SchemaObject): string {
        return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`
    }

    /**
     * Serialize multiple schemas into a single <script> tag (array).
     */
    static toScriptTagMultiple(schemas: SchemaObject[]): string {
        return `<script type="application/ld+json">\n${JSON.stringify(schemas, null, 2)}\n</script>`
    }

    // ---- Private helpers ----

    private static detectType($: cheerio.CheerioAPI): 'faq' | 'product' | 'article' {
        const text = $('body').text().toLowerCase()
        const h1 = $('h1').first().text().toLowerCase()

        // FAQ detection
        if (
            text.includes('frequently asked') ||
            text.includes('faq') ||
            $('dt, .faq, [class*="faq"]').length > 2
        ) {
            return 'faq'
        }

        // Product detection
        if (
            text.match(/\$[\d,]+|€[\d,]+|£[\d,]+/) ||
            text.includes('add to cart') ||
            text.includes('buy now') ||
            h1.includes('pricing') ||
            text.includes('per month') ||
            text.includes('/month')
        ) {
            return 'product'
        }

        return 'article'
    }

    private static extractFAQs($: cheerio.CheerioAPI): FAQItem[] {
        const faqs: FAQItem[] = []

        // Pattern 1: dt/dd pairs
        $('dt').each((_, dt) => {
            const q = $(dt).text().trim()
            const a = $(dt).next('dd').text().trim()
            if (q && a) faqs.push({ q, a })
        })

        // Pattern 2: heading + paragraph pairs
        if (faqs.length === 0) {
            $('h3, h4').each((_, el) => {
                const q = $(el).text().trim()
                const a = $(el).next('p').text().trim()
                if (q && a && q.includes('?')) faqs.push({ q, a })
            })
        }

        return faqs
    }

    private static extractPrice($: cheerio.CheerioAPI): number | null {
        const text = $('body').text()
        const match = text.match(/\$\s*([\d,]+(?:\.\d{2})?)/)
        if (match) {
            return parseFloat(match[1].replace(',', ''))
        }
        return null
    }

    private static extractFeatures($: cheerio.CheerioAPI): string[] {
        const features: string[] = []

        // Look for feature lists
        $('ul li, ol li').each((_, el) => {
            const text = $(el).text().trim()
            if (text.length > 5 && text.length < 200) {
                features.push(text)
            }
        })

        return features.slice(0, 10) // Max 10 features
    }
}
