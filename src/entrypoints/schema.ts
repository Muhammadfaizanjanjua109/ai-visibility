// ============================================================
// ai-visibility/schema
// Zero-dependency (statically) JSON-LD schema builder.
// SchemaBuilder.fromHTML() lazily loads `cheerio` on first call —
// every other method has no runtime dependency at all.
// ============================================================

export { SchemaBuilder } from '../schema/schema-builder'
export type {
    FAQItem,
    ProductSchemaData,
    ArticleSchemaData,
    OrganizationSchemaData,
    PersonSchemaData,
    WebSiteSchemaData,
    SoftwareApplicationSchemaData,
    BreadcrumbItem,
    BreadcrumbListOptions,
    DefinedTermSchemaData,
    DefinedTermSetSchemaData,
    OfferSchemaData,
    AggregateRatingSchemaData,
} from '../types'
