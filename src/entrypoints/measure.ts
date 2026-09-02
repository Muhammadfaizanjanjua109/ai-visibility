// ============================================================
// ai-visibility/measure
// Zero-dependency: statistical brand-visibility measurement across
// configured AI engines. Pairs with ai-visibility/engines (adapters) and
// ai-visibility/prompts (prompt generation).
// ============================================================

export { MeasurementEngine } from '../measure/measurement-engine'
export { analyzeEntities } from '../measure/brand-detection'
export type { EntityOutcome } from '../measure/brand-detection'
export { mean, variance, confidenceInterval } from '../measure/stats'
export {
    ENGINE_OBSERVABILITY,
    getEngineObservability,
    countDenominators,
    decomposeVisibility,
    recomposeCitationRate,
    observed,
    notObservable,
    notEvaluated,
} from '../measure/visibility-vector'
export type {
    MeasureConfig,
    MeasurementReport,
    BrandVisibility,
    EngineVisibility,
    PromptResult,
    RunResult,
    Observed,
    ObservationStatus,
    SearchActivation,
    RunOutcome,
    EngineObservability,
    VisibilityVectorObservation,
    VisibilityDenominators,
    VisibilityDecomposition,
    VisibilityVectorFile,
} from '../types'
