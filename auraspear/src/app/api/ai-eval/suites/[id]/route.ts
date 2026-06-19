import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'
import type { DynamicIdRouteContext } from '@/types'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest, context: DynamicIdRouteContext) {
  const { id } = await context.params
  return proxyToBackend(request, { path: `/ai-eval/suites/${id}` })
}
