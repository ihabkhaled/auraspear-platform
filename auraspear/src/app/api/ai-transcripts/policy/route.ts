import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'
export const dynamic = 'force-dynamic'
export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: '/ai-transcripts/policy' })
}
export async function PATCH(request: NextRequest) {
  return proxyToBackend(request, { path: '/ai-transcripts/policy' })
}
