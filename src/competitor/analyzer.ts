// ============================================================
// Competitor Gap Analysis (v0.8.0)
// "Why they're winning" — turns MeasurementReport data into a ranked,
// evidence-backed explanation of each competitor's visibility advantage.
// ============================================================

import type { CompetitorGap, CompetitorReport, GapSummary, MeasurementReport } from '../types'
import { detectGapReasons } from './gap-reasons'

function summarize(gaps: CompetitorGap[]): GapSummary {
    if (gaps.length === 0) return { averageGap: 0, biggestGap: null, smallestGap: null }

    const averageGap = gaps.reduce((sum, g) => sum + g.visibility.gap, 0) / gaps.length
    const biggest = gaps.reduce((a, b) => (b.visibility.gap > a.visibility.gap ? b : a))
    const smallest = gaps.reduce((a, b) => (b.visibility.gap < a.visibility.gap ? b : a))

    return { averageGap, biggestGap: biggest.competitor, smallestGap: smallest.competitor }
}

export class CompetitorAnalyzer {
    analyze(report: MeasurementReport, brand: string, competitors: string[]): CompetitorReport {
        const gaps: CompetitorGap[] = competitors.map((competitor) => {
            const yours = report.summary.mentionRate
            const theirs = report.competitors[competitor]?.mentionRate ?? 0

            return {
                competitor,
                visibility: { yours, theirs, gap: theirs - yours },
                reasons: detectGapReasons(report, brand, competitor),
            }
        })

        gaps.sort((a, b) => b.visibility.gap - a.visibility.gap)

        return { brand, competitors: gaps, overallGap: summarize(gaps) }
    }
}
