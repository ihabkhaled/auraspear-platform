import type { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: '/data-explorer/shuffle/sync' })
}
