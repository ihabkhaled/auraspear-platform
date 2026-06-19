import api from '@/lib/api'
import type {
  AiUebaNarrativeResult,
  ApiResponse,
  MlModel,
  MlModelSearchParams,
  UebaAnomaly,
  UebaAnomalySearchParams,
  UebaEntity,
  UebaEntitySearchParams,
  UebaStats,
} from '@/types'

export const uebaService = {
  getEntities: (params?: UebaEntitySearchParams) =>
    api.get<ApiResponse<UebaEntity[]>>('/ueba/entities', { params }).then(r => r.data),

  getEntityById: (id: string) =>
    api.get<ApiResponse<UebaEntity>>(`/ueba/entities/${id}`).then(r => r.data),

  getAnomalies: (params?: UebaAnomalySearchParams) =>
    api.get<ApiResponse<UebaAnomaly[]>>('/ueba/anomalies', { params }).then(r => r.data),

  getModels: (params?: MlModelSearchParams) =>
    api.get<ApiResponse<MlModel[]>>('/ueba/models', { params }).then(r => r.data),

  createEntity: (data: Record<string, unknown>) =>
    api.post<ApiResponse<UebaEntity>>('/ueba/entities', data).then(r => r.data),

  updateEntity: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<UebaEntity>>(`/ueba/entities/${id}`, data).then(r => r.data),

  deleteEntity: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/ueba/entities/${id}`).then(r => r.data),

  resolveAnomaly: (id: string) =>
    api.patch<ApiResponse<UebaAnomaly>>(`/ueba/anomalies/${id}/resolve`).then(r => r.data),

  getStats: () => api.get<ApiResponse<UebaStats>>('/ueba/stats').then(r => r.data),

  aiExplainAnomaly: (anomalyId: string, connector?: string) =>
    api
      .post<
        ApiResponse<AiUebaNarrativeResult>
      >(`/ueba/anomalies/${anomalyId}/ai/explain`, { connector })
      .then(r => r.data.data),
}
