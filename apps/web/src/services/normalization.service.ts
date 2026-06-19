import api from '@/lib/api'
import type {
  AiResponse,
  ApiResponse,
  NormalizationPipeline,
  NormalizationStats,
  NormalizationSearchParams,
} from '@/types'

export const normalizationService = {
  listPipelines: (params?: NormalizationSearchParams) =>
    api
      .get<ApiResponse<NormalizationPipeline[]>>('/normalization/pipelines', { params })
      .then(r => r.data),

  getPipelineById: (id: string) =>
    api.get<ApiResponse<NormalizationPipeline>>(`/normalization/pipelines/${id}`).then(r => r.data),

  createPipeline: (data: Record<string, unknown>) =>
    api
      .post<ApiResponse<NormalizationPipeline>>('/normalization/pipelines', data)
      .then(r => r.data),

  updatePipeline: (id: string, data: Record<string, unknown>) =>
    api
      .patch<ApiResponse<NormalizationPipeline>>(`/normalization/pipelines/${id}`, data)
      .then(r => r.data),

  deletePipeline: (id: string) =>
    api
      .delete<ApiResponse<{ deleted: boolean }>>(`/normalization/pipelines/${id}`)
      .then(r => r.data),

  getStats: () =>
    api.get<ApiResponse<NormalizationStats>>('/normalization/pipelines/stats').then(r => r.data),

  aiVerifyPipeline: (pipelineId: string, sampleEvents: unknown[], connector?: string) =>
    api
      .post<ApiResponse<AiResponse>>(`/normalization/pipelines/${pipelineId}/ai/verify`, {
        sampleEvents,
        connector,
      })
      .then(r => r.data.data),
}
