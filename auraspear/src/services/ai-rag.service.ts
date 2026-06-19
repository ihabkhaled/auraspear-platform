import api from '@/lib/api'
import type { RagStats, RagTraceResult } from '@/types'

function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiRagService = {
  trace: (query: string) =>
    api.get('/rag/trace', { params: { query } }).then(r => extractData<RagTraceResult>(r)),

  getStats: () => api.get('/rag/stats').then(r => extractData<RagStats>(r)),
}
