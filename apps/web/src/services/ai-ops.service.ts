import api from '@/lib/api'
import type { AiOpsWorkspace } from '@/types'

function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiOpsService = {
  getWorkspace: () => api.get('/ai-ops/workspace').then(r => extractData<AiOpsWorkspace>(r)),
}
