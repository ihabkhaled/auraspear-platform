import { type NextRequest } from 'next/server'
import { streamFromBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return streamFromBackend(request, { path: `/reports/${id}/download` })
}
