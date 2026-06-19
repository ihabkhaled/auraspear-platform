import { type NextRequest } from 'next/server'
import { fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'
import type { BackendTrendResponse } from '@/types/dashboard.types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data: rawData } = await fetchBackendJson(request, '/dashboards/alert-trend')
    const raw = rawData as BackendTrendResponse

    const data = raw.trend ?? []

    return jsonNoStore({ data })
  } catch (error) {
    console.error('[dashboard/alert-trends]', error)
    return jsonNoStore({ data: null, error: 'Internal server error' }, { status: 502 })
  }
}
