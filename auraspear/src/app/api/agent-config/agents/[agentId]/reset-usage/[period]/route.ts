import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; period: string }> }
) {
  const { agentId, period } = await params
  return proxyToBackend(request, {
    path: `/agent-config/agents/${agentId}/reset-usage/${period}`,
  })
}
