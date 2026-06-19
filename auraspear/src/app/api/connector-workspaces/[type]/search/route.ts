import type { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  return proxyToBackend(request, { path: `/connector-workspaces/${type}/search` })
}
