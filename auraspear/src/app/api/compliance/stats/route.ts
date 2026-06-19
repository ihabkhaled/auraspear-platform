import { type NextRequest } from 'next/server'
import { fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'
import type { ComplianceStats, ComplianceStatsSource } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data } = await fetchBackendJson(request, '/compliance/stats')
    const compliance = (data as ComplianceStatsSource | null) ?? null

    const normalized: ComplianceStats = {
      totalFrameworks: compliance?.totalFrameworks ?? 0,
      avgComplianceScore:
        compliance?.avgComplianceScore ?? compliance?.overallComplianceScore ?? null,
      passedControls: compliance?.passedControls ?? 0,
      failedControls: compliance?.failedControls ?? 0,
      notAssessedControls: compliance?.notAssessedControls ?? 0,
    }

    return jsonNoStore({ data: normalized })
  } catch (error) {
    console.error('[compliance/stats]', error)
    return jsonNoStore({ data: null, error: 'Internal server error' }, { status: 502 })
  }
}
