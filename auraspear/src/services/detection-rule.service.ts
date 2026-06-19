import api from '@/lib/api'
import type {
  AiDetectionCopilotResult,
  ApiResponse,
  DetectionRule,
  DetectionRuleSimulationResult,
  DetectionRuleStats,
  DetectionRuleSearchParams,
} from '@/types'

export const detectionRuleService = {
  listRules: (params?: DetectionRuleSearchParams) =>
    api.get<ApiResponse<DetectionRule[]>>('/detection-rules', { params }).then(r => r.data),

  getRuleById: (id: string) =>
    api.get<ApiResponse<DetectionRule>>(`/detection-rules/${id}`).then(r => r.data),

  createRule: (data: Record<string, unknown>) =>
    api.post<ApiResponse<DetectionRule>>('/detection-rules', data).then(r => r.data),

  updateRule: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<DetectionRule>>(`/detection-rules/${id}`, data).then(r => r.data),

  deleteRule: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/detection-rules/${id}`).then(r => r.data),

  toggleRule: (id: string, enabled: boolean) =>
    api
      .patch<ApiResponse<DetectionRule>>(`/detection-rules/${id}/toggle`, { enabled })
      .then(r => r.data),

  simulateRule: (id: string, events: Record<string, unknown>[]) =>
    api
      .post<ApiResponse<DetectionRuleSimulationResult>>(`/detection-rules/${id}/simulate`, {
        events,
      })
      .then(r => r.data),

  getStats: () =>
    api.get<ApiResponse<DetectionRuleStats>>('/detection-rules/stats').then(r => r.data),

  // AI Detection Copilot
  aiDraftRule: (description: string, connector?: string) =>
    api
      .post<ApiResponse<AiDetectionCopilotResult>>('/detection-rules/ai/draft', {
        description,
        connector,
      })
      .then(r => r.data.data),

  aiTuning: (ruleId: string, connector?: string) =>
    api
      .post<ApiResponse<AiDetectionCopilotResult>>(`/detection-rules/${ruleId}/ai/tuning`, {
        connector,
      })
      .then(r => r.data.data),
}
