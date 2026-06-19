import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; controlId: string }> }
) {
  const { id, controlId } = await params
  return proxyToBackend(request, {
    path: `/compliance/frameworks/${id}/controls/${controlId}`,
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; controlId: string }> }
) {
  const { id, controlId } = await params
  return proxyToBackend(request, {
    path: `/compliance/frameworks/${id}/controls/${controlId}`,
  })
}
