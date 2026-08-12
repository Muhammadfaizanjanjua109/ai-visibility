// ============================================================
// CLI: --from <file> loader
// Lets `citations`/`compare`/`report` reuse a `measure --json` output
// instead of re-querying engines (which costs API credits and time).
// ============================================================

import fs from 'fs'
import type { MeasurementReport } from '../../types'

export function loadReportFromFile(filePath: string): MeasurementReport {
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as MeasurementReport
}
