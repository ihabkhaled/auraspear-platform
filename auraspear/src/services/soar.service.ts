import api from '@/lib/api'
import type {
  AiResponse,
  ApiResponse,
  SoarExecution,
  SoarExecutionSearchParams,
  SoarPlaybook,
  SoarPlaybookSearchParams,
  SoarStats,
} from '@/types'

export const soarService = {
  getPlaybooks: (params?: SoarPlaybookSearchParams) =>
    api.get<ApiResponse<SoarPlaybook[]>>('/soar/playbooks', { params }).then(r => r.data),

  getPlaybookById: (id: string) =>
    api.get<ApiResponse<SoarPlaybook>>(`/soar/playbooks/${id}`).then(r => r.data),

  createPlaybook: (data: Record<string, unknown>) =>
    api.post<ApiResponse<SoarPlaybook>>('/soar/playbooks', data).then(r => r.data),

  updatePlaybook: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<SoarPlaybook>>(`/soar/playbooks/${id}`, data).then(r => r.data),

  deletePlaybook: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/soar/playbooks/${id}`).then(r => r.data),

  executePlaybook: (id: string) =>
    api.post<ApiResponse<SoarExecution>>(`/soar/playbooks/${id}/execute`).then(r => r.data),

  getExecutions: (params?: SoarExecutionSearchParams) =>
    api.get<ApiResponse<SoarExecution[]>>('/soar/executions', { params }).then(r => r.data),

  getStats: () => api.get<ApiResponse<SoarStats>>('/soar/stats').then(r => r.data),

  aiDraftPlaybook: (description: string, connector?: string) =>
    api
      .post<ApiResponse<AiResponse>>('/soar/ai/draft-playbook', { description, connector })
      .then(r => r.data.data),
}
