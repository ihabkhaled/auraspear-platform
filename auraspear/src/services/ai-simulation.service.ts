import api from '@/lib/api'
import type { AiSimulation, AiSimulationStats } from '@/types'

function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiSimulationService = {
  list: () => api.get('/ai-simulations').then(r => extractData<AiSimulation[]>(r)),

  create: (data: { name: string; description?: string; agentId: string; datasetJson: unknown }) =>
    api.post('/ai-simulations', data).then(r => extractData<AiSimulation>(r)),

  get: (id: string) =>
    api.get(`/ai-simulations/${id}`).then(r => extractData<AiSimulation>(r)),

  delete: (id: string) =>
    api.delete(`/ai-simulations/${id}`).then(r => extractData<{ success: boolean }>(r)),

  getStats: () => api.get('/ai-simulations/stats').then(r => extractData<AiSimulationStats>(r)),
}
