import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params
  return proxyToBackend(request, { path: `/tenants/${tenantId}/users/check-email` })
}
