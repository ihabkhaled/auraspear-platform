import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') ?? '10'
  return proxyToBackend(request, { path: '/dashboards/recent-activity', params: { limit } })
}
