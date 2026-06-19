import { type NextRequest } from 'next/server'
import { ServiceStatus } from '@/enums'
import { fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'
import type { BackendPipelineResponse } from '@/types/dashboard.types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data: rawData } = await fetchBackendJson(request, '/dashboards/pipeline-health')
    const raw = rawData as BackendPipelineResponse

    const pipelines = raw.pipelines ?? []

    const data = pipelines.map(p => ({
      name: p.name,
      status: p.status,
      healthy: p.status === ServiceStatus.HEALTHY,
    }))

    return jsonNoStore({ data })
  } catch (error) {
    console.error('[dashboard/pipeline-health]', error)
    return jsonNoStore({ data: null, error: 'Internal server error' }, { status: 502 })
  }
}
