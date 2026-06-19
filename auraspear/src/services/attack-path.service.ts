import api from '@/lib/api'
import type {
  AiAttackPathSummaryResult,
  ApiResponse,
  AttackPath,
  AttackPathSearchParams,
  AttackPathStats,
} from '@/types'

export const attackPathService = {
  getAttackPaths: (params?: AttackPathSearchParams) =>
    api.get<ApiResponse<AttackPath[]>>('/attack-paths', { params }).then(r => r.data),

  getAttackPathById: (id: string) =>
    api.get<ApiResponse<AttackPath>>(`/attack-paths/${id}`).then(r => r.data),

  getAttackPathStats: () =>
    api.get<ApiResponse<AttackPathStats>>('/attack-paths/stats').then(r => r.data),

  createAttackPath: (data: Record<string, unknown>) =>
    api.post<ApiResponse<AttackPath>>('/attack-paths', data).then(r => r.data),

  updateAttackPath: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<AttackPath>>(`/attack-paths/${id}`, data).then(r => r.data),

  deleteAttackPath: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/attack-paths/${id}`).then(r => r.data),

  aiSummarize: (pathId: string, connector?: string) =>
    api
      .post<
        ApiResponse<AiAttackPathSummaryResult>
      >(`/attack-paths/${pathId}/ai/summarize`, { connector })
      .then(r => r.data.data),
}
