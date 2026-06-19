import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: '/detection-rules/ai/draft', timeoutMs: 120_000 })
}
