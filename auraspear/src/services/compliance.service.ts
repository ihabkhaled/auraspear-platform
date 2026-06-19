import api from '@/lib/api'
import type {
  ApiResponse,
  ComplianceControl,
  ComplianceFramework,
  ComplianceSearchParams,
  ComplianceStats,
} from '@/types'

export const complianceService = {
  getFrameworks: (params?: ComplianceSearchParams) =>
    api
      .get<ApiResponse<ComplianceFramework[]>>('/compliance/frameworks', { params })
      .then(r => r.data),

  getFrameworkById: (id: string) =>
    api.get<ApiResponse<ComplianceFramework>>(`/compliance/frameworks/${id}`).then(r => r.data),

  createFramework: (data: Record<string, unknown>) =>
    api.post<ApiResponse<ComplianceFramework>>('/compliance/frameworks', data).then(r => r.data),

  updateFramework: (id: string, data: Record<string, unknown>) =>
    api
      .patch<ApiResponse<ComplianceFramework>>(`/compliance/frameworks/${id}`, data)
      .then(r => r.data),

  deleteFramework: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/compliance/frameworks/${id}`).then(r => r.data),

  getControls: (frameworkId: string) =>
    api
      .get<ApiResponse<ComplianceControl[]>>(`/compliance/frameworks/${frameworkId}/controls`)
      .then(r => r.data),

  createControl: (frameworkId: string, data: Record<string, unknown>) =>
    api
      .post<ApiResponse<ComplianceControl>>(`/compliance/frameworks/${frameworkId}/controls`, data)
      .then(r => r.data),

  updateControl: (frameworkId: string, controlId: string, data: Record<string, unknown>) =>
    api
      .patch<
        ApiResponse<ComplianceControl>
      >(`/compliance/frameworks/${frameworkId}/controls/${controlId}`, data)
      .then(r => r.data),

  deleteControl: (frameworkId: string, controlId: string) =>
    api
      .delete<
        ApiResponse<{ deleted: boolean }>
      >(`/compliance/frameworks/${frameworkId}/controls/${controlId}`)
      .then(r => r.data),

  getStats: () => api.get<ApiResponse<ComplianceStats>>('/compliance/stats').then(r => r.data),
}
