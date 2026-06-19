import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  return proxyToBackend(request, { path: `/connectors/${type}/test` })
}
