import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: '/ai-usage/cost-rates' })
}

export async function PUT(request: NextRequest) {
  return proxyToBackend(request, { path: '/ai-usage/cost-rates' })
}
