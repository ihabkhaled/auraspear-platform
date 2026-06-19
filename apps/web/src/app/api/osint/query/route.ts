import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: '/osint/query', timeoutMs: 60_000 })
}
