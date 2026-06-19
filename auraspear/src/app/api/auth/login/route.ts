import { type NextRequest } from 'next/server'
import {
  BackendError,
  buildSetCookieHeaders,
  fetchBackendJson,
  jsonNoStore,
} from '@/lib/backend-proxy'
import type { BackendLoginWithTenants } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const result = await fetchBackendJson(request, '/auth/login', {
      method: 'POST',
      body,
    })

    const data = result.data as BackendLoginWithTenants

    const responseBody = {
      accessToken: data.accessToken,
      csrfToken: data.csrfToken,
      user: data.user,
      permissions: data.permissions ?? [],
      tenants: data.tenants,
    }

    const cookieHeaders = buildSetCookieHeaders(result.setCookieHeaders)
    if (cookieHeaders) {
      return jsonNoStore(responseBody, { headers: cookieHeaders })
    }
    return jsonNoStore(responseBody)
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
