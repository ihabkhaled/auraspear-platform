import api from '@/lib/api'
import type {
  ApiResponse,
  CorrelationRule,
  CorrelationSearchParams,
  CorrelationStats,
} from '@/types'

export const correlationService = {
  getRules: (params?: CorrelationSearchParams) =>
    api.get<ApiResponse<CorrelationRule[]>>('/correlation', { params }).then(r => r.data),

  getRuleById: (id: string) =>
    api.get<ApiResponse<CorrelationRule>>(`/correlation/${id}`).then(r => r.data),

  createRule: (data: Record<string, unknown>) =>
    api.post<ApiResponse<CorrelationRule>>('/correlation', data).then(r => r.data),

  updateRule: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<CorrelationRule>>(`/correlation/${id}`, data).then(r => r.data),

  deleteRule: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/correlation/${id}`).then(r => r.data),

  getCorrelationStats: () =>
    api.get<ApiResponse<CorrelationStats>>('/correlation/stats').then(r => r.data),
}
