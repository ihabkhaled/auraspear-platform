import type { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  return proxyToBackend(request, { path: `/data-explorer/misp/events/${eventId}` })
}
