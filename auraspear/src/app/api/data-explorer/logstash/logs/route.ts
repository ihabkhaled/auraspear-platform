import type { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: '/data-explorer/logstash/logs' })
}
