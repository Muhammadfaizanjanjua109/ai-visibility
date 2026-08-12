// ============================================================
// Shared robots.txt block-detection heuristic.
// Used by both the legacy `ContentAnalyzer.analyze()` crawlerAccessibility
// check and the AI Readiness Engine's CRAWLABILITY category — kept in its
// own module (rather than living in content-analyzer.ts) so audit-engine.ts
// can import it without creating a circular dependency between the two.
// ============================================================

interface RobotsGroup {
    agents: string[]
    disallow: string[]
    allow: string[]
    /** Once a rule line has been seen, the next User-agent line starts a new group. */
    rulesStarted: boolean
}

function parseRobotsGroups(robotsTxt: string): RobotsGroup[] {
    const groups: RobotsGroup[] = []
    let current: RobotsGroup | null = null

    for (const raw of robotsTxt.split(/\r?\n/)) {
        const line = raw.trim()

        const uaMatch = line.match(/^user-agent\s*:\s*(.*)$/i)
        if (uaMatch) {
            const ua = uaMatch[1].trim().toLowerCase()
            if (!current || current.rulesStarted) {
                current = { agents: [], disallow: [], allow: [], rulesStarted: false }
                groups.push(current)
            }
            current.agents.push(ua)
            continue
        }

        if (!current) continue

        const disallowMatch = line.match(/^disallow\s*:\s*(.*)$/i)
        if (disallowMatch) {
            current.disallow.push(disallowMatch[1].trim())
            current.rulesStarted = true
            continue
        }

        const allowMatch = line.match(/^allow\s*:\s*(.*)$/i)
        if (allowMatch) {
            current.allow.push(allowMatch[1].trim())
            current.rulesStarted = true
        }
    }

    return groups
}

/**
 * True if robots.txt disallows the whole site (`Disallow: /`) for this
 * bot. Uses the bot's own `User-agent:` group if one exists — a
 * bot-specific group always takes precedence over the wildcard `*` group,
 * per the robots.txt spec — and only falls back to `*` when no
 * bot-specific group is present. Deliberately conservative: a bare
 * `Disallow: /` alongside an `Allow: /` in the same group is treated as
 * ambiguous/permissive, not blocked, to avoid false positives on
 * legitimate configs this heuristic can't fully reason about.
 */
export function isBlockedInRobotsTxt(robotsTxt: string, botName: string): boolean {
    const groups = parseRobotsGroups(robotsTxt)
    const name = botName.toLowerCase()

    const specific = groups.find((g) => g.agents.includes(name))
    const wildcard = groups.find((g) => g.agents.includes('*'))
    const group = specific ?? wildcard
    if (!group) return false

    const hasFullDisallow = group.disallow.includes('/')
    const hasFullAllow = group.allow.includes('/')
    return hasFullDisallow && !hasFullAllow
}
