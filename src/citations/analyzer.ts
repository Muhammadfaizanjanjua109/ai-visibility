// ============================================================
// Citation Source Analysis (v0.8.0)
// Analyzes the raw responses collected by the v0.7.0 Measurement Engine to
// extract and classify where AI engines cite information about a brand —
// see docs/measurement.md for the underlying MeasurementReport shape.
// ============================================================

import type { CitationReport, CitationSource, MeasurementReport, SourceType } from '../types'
import { classifySource } from './source-classify'
import { extractSourceRefs } from './url-extract'

interface SourceAggregate {
    domain: string
    url?: string
    mentions: number
    mentionsBrand: boolean
    competitors: Set<string>
    firstSeen: string
}

function emptySourcesByType(): Record<SourceType, CitationSource[]> {
    return {
        'own-domain': [],
        'review-site': [],
        'comparison-site': [],
        news: [],
        forum: [],
        social: [],
        documentation: [],
        marketplace: [],
        other: [],
    }
}

export class CitationAnalyzer {
    analyze(report: MeasurementReport, brandDomain: string): CitationReport {
        const byDomain = new Map<string, SourceAggregate>()

        for (const promptResult of report.perPrompt) {
            for (const run of promptResult.runs) {
                const refs = extractSourceRefs(run.rawResponse, run.citedUrls)
                for (const ref of refs) {
                    let agg = byDomain.get(ref.domain)
                    if (!agg) {
                        agg = { domain: ref.domain, url: ref.url, mentions: 0, mentionsBrand: false, competitors: new Set(), firstSeen: promptResult.cluster }
                        byDomain.set(ref.domain, agg)
                    }
                    if (!agg.url && ref.url) agg.url = ref.url
                    agg.mentions += 1
                    if (run.mentioned) agg.mentionsBrand = true
                    for (const competitor of run.competitorsMentioned) agg.competitors.add(competitor)
                }
            }
        }

        const sources: CitationSource[] = [...byDomain.values()]
            .map((agg) => ({
                domain: agg.domain,
                url: agg.url,
                mentions: agg.mentions,
                type: classifySource(agg.domain, brandDomain, agg.url),
                mentionsBrand: agg.mentionsBrand,
                mentionsCompetitors: [...agg.competitors].sort(),
                firstSeen: agg.firstSeen,
            }))
            .sort((a, b) => b.mentions - a.mentions || a.domain.localeCompare(b.domain))

        const sourcesByType = emptySourcesByType()
        for (const source of sources) sourcesByType[source.type].push(source)

        const totalMentions = sources.reduce((sum, s) => sum + s.mentions, 0)
        const ownDomainMentions = sourcesByType['own-domain'].reduce((sum, s) => sum + s.mentions, 0)
        const domainCoverage = totalMentions > 0 ? ownDomainMentions / totalMentions : 0
        const thirdPartyCoverage = totalMentions > 0 ? (totalMentions - ownDomainMentions) / totalMentions : 0

        const topCompetitorSources = sources
            .filter((s) => !s.mentionsBrand && s.mentionsCompetitors.length > 0)
            .sort((a, b) => b.mentions - a.mentions)

        return {
            brand: report.brand,
            brandDomain,
            sources,
            sourcesByType,
            totalMentions,
            domainCoverage,
            thirdPartyCoverage,
            topCompetitorSources,
        }
    }
}
