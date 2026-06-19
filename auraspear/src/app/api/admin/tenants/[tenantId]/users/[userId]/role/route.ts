import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  const { tenantId, userId } = await params
  return proxyToBackend(request, { path: `/tenants/${tenantId}/users/${userId}/role` })
}
