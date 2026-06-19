import api from '@/lib/api'
import type {
  ApiResponse,
  EntityRecord,
  EntityGraphData,
  EntitySearchParams,
  RiskBreakdownResponse,
  CreateEntityInput,
  UpdateEntityInput,
} from '@/types'

export const entityService = {
  list: (params?: EntitySearchParams) =>
    api.get<ApiResponse<EntityRecord[]>>('/entities', { params }).then(r => r.data),

  getById: (id: string) =>
    api.get<ApiResponse<EntityRecord>>(`/entities/${id}`).then(r => r.data),

  getGraph: (id: string) =>
    api.get<ApiResponse<EntityGraphData>>(`/entities/${id}/graph`).then(r => r.data),

  getTopRisky: () =>
    api.get<ApiResponse<EntityRecord[]>>('/entities/top-risky').then(r => r.data),

  getRiskBreakdown: (id: string) =>
    api
      .get<ApiResponse<RiskBreakdownResponse>>(`/entities/${id}/risk-breakdown`)
      .then(r => r.data),

  create: (data: CreateEntityInput) =>
    api.post<ApiResponse<EntityRecord>>('/entities', data).then(r => r.data),

  update: (id: string, data: UpdateEntityInput) =>
    api.patch<ApiResponse<EntityRecord>>(`/entities/${id}`, data).then(r => r.data),

  aiExplainRisk: (id: string) =>
    api.post<ApiResponse<unknown>>(`/entities/${id}/ai/explain-risk`).then(r => r.data.data),

  recalculateRisk: () =>
    api.post<ApiResponse<{ updatedCount: number }>>('/entities/recalculate-risk').then(r => r.data),
}
