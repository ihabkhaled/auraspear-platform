import api from '@/lib/api'
import type { AiEvalRun, AiEvalStats, AiEvalSuite } from '@/types'

function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiEvalService = {
  listSuites: () => api.get('/ai-eval/suites').then(r => extractData<AiEvalSuite[]>(r)),

  createSuite: (data: { name: string; description?: string; datasetJson: unknown }) =>
    api.post('/ai-eval/suites', data).then(r => extractData<AiEvalSuite>(r)),

  deleteSuite: (id: string) =>
    api.delete(`/ai-eval/suites/${id}`).then(r => extractData<{ success: boolean }>(r)),

  listRuns: (suiteId?: string) =>
    api
      .get('/ai-eval/runs', { params: suiteId ? { suiteId } : {} })
      .then(r => extractData<AiEvalRun[]>(r)),

  getRunDetail: (id: string) =>
    api.get(`/ai-eval/runs/${id}`).then(r => extractData<AiEvalRun>(r)),

  startRun: (data: { suiteId: string; provider: string; model: string }) =>
    api.post('/ai-eval/runs', data).then(r => extractData<AiEvalRun>(r)),

  getStats: () => api.get('/ai-eval/stats').then(r => extractData<AiEvalStats>(r)),
}
