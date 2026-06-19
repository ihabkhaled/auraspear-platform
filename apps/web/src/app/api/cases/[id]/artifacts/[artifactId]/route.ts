import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  const { id, artifactId } = await params
  return proxyToBackend(request, { path: `/cases/${id}/artifacts/${artifactId}` })
}
