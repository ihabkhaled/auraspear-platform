import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ featureKey: string }> }
) {
  const { featureKey } = await params
  return proxyToBackend(request, { path: `/ai-features/${featureKey}` })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ featureKey: string }> }
) {
  const { featureKey } = await params
  return proxyToBackend(request, { path: `/ai-features/${featureKey}` })
}
