import api from '@/lib/api'
import type {
  AiCloudTriageResult,
  ApiResponse,
  CloudAccount,
  CloudFinding,
  CloudSecurityStats,
  CloudAccountSearchParams,
  CloudFindingSearchParams,
} from '@/types'

export const cloudSecurityService = {
  listAccounts: (params?: CloudAccountSearchParams) =>
    api.get<ApiResponse<CloudAccount[]>>('/cloud-security/accounts', { params }).then(r => r.data),

  getAccountById: (id: string) =>
    api.get<ApiResponse<CloudAccount>>(`/cloud-security/accounts/${id}`).then(r => r.data),

  createAccount: (data: Record<string, unknown>) =>
    api.post<ApiResponse<CloudAccount>>('/cloud-security/accounts', data).then(r => r.data),

  updateAccount: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<CloudAccount>>(`/cloud-security/accounts/${id}`, data).then(r => r.data),

  deleteAccount: (id: string) =>
    api
      .delete<ApiResponse<{ deleted: boolean }>>(`/cloud-security/accounts/${id}`)
      .then(r => r.data),

  listFindings: (params?: CloudFindingSearchParams) =>
    api.get<ApiResponse<CloudFinding[]>>('/cloud-security/findings', { params }).then(r => r.data),

  getStats: () =>
    api.get<ApiResponse<CloudSecurityStats>>('/cloud-security/stats').then(r => r.data),

  aiTriageFinding: (findingId: string, connector?: string) =>
    api
      .post<
        ApiResponse<AiCloudTriageResult>
      >(`/cloud-security/findings/${findingId}/ai/triage`, { connector })
      .then(r => r.data.data),
}
