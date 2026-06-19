import api from '@/lib/api'
import type {
  ApiResponse,
  CreateRunbookInput,
  RunbookRecord,
  RunbookSearchParams,
  UpdateRunbookInput,
} from '@/types'
import type { AiResponse } from '@/types/ai.types'

export const knowledgeService = {
  getAll: (params?: RunbookSearchParams) =>
    api.get<ApiResponse<RunbookRecord[]>>('/runbooks', { params }).then(r => r.data),

  getById: (id: string) => api.get<ApiResponse<RunbookRecord>>(`/runbooks/${id}`).then(r => r.data),

  create: (data: CreateRunbookInput) =>
    api.post<ApiResponse<RunbookRecord>>('/runbooks', data).then(r => r.data),

  update: (id: string, data: UpdateRunbookInput) =>
    api.patch<ApiResponse<RunbookRecord>>(`/runbooks/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/runbooks/${id}`).then(r => r.data),

  search: (q: string) =>
    api.get<ApiResponse<RunbookRecord[]>>('/runbooks/search', { params: { q } }).then(r => r.data),

  aiGenerate: (description: string, connector?: string) =>
    api
      .post<ApiResponse<AiResponse>>('/runbooks/ai/generate', { description, connector })
      .then(r => r.data.data),

  aiSearch: (query: string, connector?: string) =>
    api
      .post<ApiResponse<AiResponse>>('/runbooks/ai/search', { query, connector })
      .then(r => r.data.data),
}
