import api from '@/lib/api'
import type {
  ApiResponse,
  CancelJobResult,
  JobRecord,
  JobRuntimeStats,
  JobSearchParams,
} from '@/types'

export const jobService = {
  getJobs: (params?: JobSearchParams) =>
    api.get<ApiResponse<JobRecord[]>>('/jobs', { params }).then(r => r.data),

  getJobStats: () => api.get<ApiResponse<JobRuntimeStats>>('/jobs/stats').then(r => r.data),

  retryJob: (id: string) => api.post<ApiResponse<JobRecord>>(`/jobs/${id}/retry`).then(r => r.data),

  cancelJob: (id: string) =>
    api.post<ApiResponse<CancelJobResult>>(`/jobs/${id}/cancel`).then(r => r.data),

  cancelAllJobs: () =>
    api.post<ApiResponse<{ cancelled: number }>>('/jobs/cancel-all').then(r => r.data),
}
