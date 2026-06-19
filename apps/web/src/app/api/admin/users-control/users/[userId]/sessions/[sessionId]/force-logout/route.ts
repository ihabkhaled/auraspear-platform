import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'
import type { DynamicUserSessionIdRouteContext } from '@/types'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, context: DynamicUserSessionIdRouteContext) {
  const { userId, sessionId } = await context.params

  return proxyToBackend(request, {
    path: `/users-control/users/${userId}/sessions/${sessionId}/force-logout`,
  })
}
