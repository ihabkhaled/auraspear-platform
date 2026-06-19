import { type NextRequest } from 'next/server'
import {
  BackendError,
  buildSetCookieHeaders,
  fetchBackendJson,
  jsonNoStore,
} from '@/lib/backend-proxy'
import { normalizeSoarStats } from '@/lib/dashboard-kpi-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data, setCookieHeaders } = await fetchBackendJson(request, '/soar/stats')
    const headers = buildSetCookieHeaders(setCookieHeaders)

    return jsonNoStore(
      { data: normalizeSoarStats(data as Record<string, unknown>) },
      headers ? { headers } : undefined
    )
  } catch (error) {
    if (error instanceof BackendError) {
      return jsonNoStore(
        { data: null, error: error.message, messageKey: error.messageKey },
        { status: error.status }
      )
    }

    return jsonNoStore(
      { data: null, error: 'Backend unavailable', messageKey: 'errors.common.unknown' },
      { status: 502 }
    )
  }
}
