// ============================================================
// Category -> verb-phrase mapping for the 'problem' prompt cluster
// (e.g. "CRM software" -> "manage customer relationships").
// Deliberately a plain lookup table, not AI-powered — matched by
// substring against the category string, case-insensitive.
// ============================================================

/** Ordered so more specific keys (e.g. "help desk") are checked before broader ones. */
const VERB_MAP: Array<[keyword: string, verb: string]> = [
    ['crm', 'manage customer relationships'],
    ['project management', 'manage projects'],
    ['help desk', 'manage customer support'],
    ['customer support', 'manage customer support'],
    ['email marketing', 'run email marketing campaigns'],
    ['social media management', 'manage social media accounts'],
    ['social media', 'manage social media accounts'],
    ['accounting', 'manage business finances'],
    ['bookkeeping', 'manage business finances'],
    ['payroll', 'run payroll'],
    ['hr software', 'manage HR and employee data'],
    ['human resources', 'manage HR and employee data'],
    ['e-commerce', 'run an online store'],
    ['ecommerce', 'run an online store'],
    ['website builder', 'build a website'],
    ['password manager', 'manage passwords securely'],
    ['vpn', 'protect your internet connection'],
    ['antivirus', 'protect your computer from threats'],
    ['seo', 'improve search engine rankings'],
    ['analytics', 'track website analytics'],
    ['scheduling', 'schedule appointments'],
    ['invoicing', 'send and track invoices'],
    ['inventory management', 'manage inventory'],
    ['video conferencing', 'run video calls and meetings'],
    ['task management', 'manage tasks and to-dos'],
    ['time tracking', 'track work hours'],
]

/** Returns a verb phrase for the category, or `undefined` if no mapping exists (caller falls back to generic alternatives). */
export function inferVerb(category: string): string | undefined {
    const lower = category.toLowerCase()
    const match = VERB_MAP.find(([keyword]) => lower.includes(keyword))
    return match?.[1]
}
