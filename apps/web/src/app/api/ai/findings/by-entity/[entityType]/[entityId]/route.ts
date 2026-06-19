import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  const { entityType, entityId } = await params
  return proxyToBackend(request, {
    path: `/ai/findings/by-entity/${entityType}/${entityId}`,
  })
}
