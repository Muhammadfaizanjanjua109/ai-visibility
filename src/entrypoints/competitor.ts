// ============================================================
// ai-visibility/competitor
// Zero-dependency: analyzes a v0.7.0 MeasurementReport to explain why a
// competitor outranks a brand's AI visibility, with evidence-backed,
// actionable reasons. Pairs with ai-visibility/measure and ai-visibility/citations.
// ============================================================

export { CompetitorAnalyzer } from '../competitor/analyzer'
export { detectGapReasons, classifyImpactByRatio, classifyImpactByPercentGap } from '../competitor/gap-reasons'
export type { GapImpact, GapReason, CompetitorGap, GapSummary, CompetitorReport } from '../types'
