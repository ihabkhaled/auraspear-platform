import { type NextRequest } from 'next/server'
import { BackendError, fetchBackendJson, jsonNoStore } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { data } = await fetchBackendJson(request, '/auth/tenants')

    return jsonNoStore(data)
  } catch (error) {
    if (error instanceof BackendError) {
      return jsonNoStore(
        { messageKey: error.messageKey, message: error.message },
        { status: error.status }
      )
    }
    return jsonNoStore(
      { messageKey: 'errors.common.unknown', message: 'Backend unavailable' },
      { status: 502 }
    )
  }
}
