import { type NextRequest } from 'next/server'
import { fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'
import type { BackendAssetsResponse } from '@/types/dashboard.types'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data: rawData } = await fetchBackendJson(request, '/dashboards/top-targeted-assets')
    const raw = rawData as BackendAssetsResponse

    const assets = raw.assets ?? []

    const data = assets.map((asset, index) => ({
      id: `asset-${String(index + 1)}`,
      name: asset.hostname,
      ip: 'N/A',
      riskScore: Math.min(
        100,
        Math.round((asset.criticalCount / Math.max(asset.alertCount, 1)) * 100 + asset.alertCount)
      ),
      alertCount: asset.alertCount,
    }))

    return jsonNoStore({ data })
  } catch (error) {
    console.error('[dashboard/asset-risks]', error)
    return jsonNoStore({ data: null, error: 'Internal server error' }, { status: 502 })
  }
}
