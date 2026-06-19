import api from '@/lib/api'
import type { AgentGraphNode, ScheduleHealthSummary } from '@/types'

function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiGraphService = {
  getGraph: () =>
    api.get('/ai-agents/graph').then(r => extractData<AgentGraphNode[]>(r)),

  getScheduleHealth: () =>
    api.get('/ai-agents/schedule-health').then(r => extractData<ScheduleHealthSummary>(r)),
}
