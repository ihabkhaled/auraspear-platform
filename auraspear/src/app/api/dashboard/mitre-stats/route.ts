import { type NextRequest } from 'next/server'
import { fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'
import type { BackendMitreResponse } from '@/types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data: rawData } = await fetchBackendJson(request, '/dashboards/mitre-top-techniques')
    const raw = rawData as BackendMitreResponse

    const techniques = raw.techniques ?? []
    const maxCount = Math.max(...techniques.map(t => t.count), 1)

    const data = techniques.map(t => ({
      id: t.id,
      name: t.id,
      count: t.count,
      percentage: Math.round((t.count / maxCount) * 100),
    }))

    return jsonNoStore({ data })
  } catch (error) {
    console.error('[dashboard/mitre-stats]', error)
    return jsonNoStore({ data: null, error: 'Internal server error' }, { status: 502 })
  }
}
