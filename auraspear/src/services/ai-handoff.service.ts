import api from '@/lib/api'
import type { AiHandoffHistoryItem, AiHandoffPromoteResult, AiHandoffStats } from '@/types'

function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiHandoffService = {
  promote: (data: {
    findingId: string
    targetModule: string
    title?: string
    description?: string
  }) => api.post('/ai-handoffs/promote', data).then(r => extractData<AiHandoffPromoteResult>(r)),

  getHistory: (params?: Record<string, string | number>) =>
    api.get('/ai-handoffs/history', { params }).then(r => {
      const body = r.data as { data: AiHandoffHistoryItem[]; total: number }
      return { data: Array.isArray(body.data) ? body.data : [], total: Number(body.total ?? 0) }
    }),

  getStats: () =>
    api.get('/ai-handoffs/stats').then(r => extractData<AiHandoffStats>(r)),

  getFindingLinks: (findingId: string) =>
    api.get(`/ai-handoffs/findings/${findingId}/links`).then(r => extractData<unknown[]>(r)),
}
