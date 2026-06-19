import { MessageRole, ReasoningStepStatus } from '@/enums'
import api from '@/lib/api'
import { nowISO, uniqueId } from '@/lib/dayjs'
import type { ApiResponse, HuntSession, HuntMessage, HuntEvent } from '@/types'
import type { AiResponse } from '@/types/ai.types'

export const huntService = {
  createSession: (data: { query: string; timeRange: string }) =>
    api.post<ApiResponse<HuntSession>>('/hunt/sessions', data).then(r => r.data),

  getSession: (sessionId: string) =>
    api.get<ApiResponse<HuntSession>>(`/hunt/sessions/${sessionId}`).then(r => r.data),

  sendMessage: async (_sessionId: string, content: string): Promise<ApiResponse<HuntMessage>> => {
    const response = await api.post<ApiResponse<AiResponse>>('/hunt/messages', { query: content })
    const ai = response.data.data

    const message: HuntMessage = {
      id: uniqueId('ai'),
      role: MessageRole.AI,
      content: ai?.result ?? '',
      timestamp: nowISO(),
      reasoningSteps: (ai?.reasoning ?? []).map((step, i) => ({
        id: `step-${String(i)}`,
        label: step,
        status: ReasoningStepStatus.COMPLETED,
      })),
      actions: ai?.confidence !== undefined && ai.confidence >= 0.8 ? ['complete'] : [],
    }

    return { data: message }
  },

  getEvents: (sessionId: string, page = 1, limit = 50) =>
    api
      .get<ApiResponse<HuntEvent[]>>(`/hunt/sessions/${sessionId}/events`, {
        params: { page, limit },
      })
      .then(r => r.data),
}
