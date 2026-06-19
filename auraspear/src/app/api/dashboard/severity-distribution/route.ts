import { type NextRequest } from 'next/server'
import { fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'
import type { BackendSeverityDistributionResponse, SeverityDataPoint } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data: rawData } = await fetchBackendJson(request, '/dashboards/severity-distribution')
    const raw = rawData as BackendSeverityDistributionResponse

    const data: SeverityDataPoint[] = raw.distribution.map(entry => ({
      name: entry.severity,
      value: entry.count,
      severity: entry.severity,
    }))

    return jsonNoStore({ data })
  } catch (error) {
    console.error('[dashboard/severity-distribution]', error)
    return jsonNoStore({ data: null, error: 'Internal server error' }, { status: 502 })
  }
}
