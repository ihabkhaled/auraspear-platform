import api from '@/lib/api'
import type {
  ApiResponse,
  SystemHealthCheck,
  SystemMetric,
  SystemHealthStats,
  HealthCheckSearchParams,
  MetricSearchParams,
} from '@/types'

export const systemHealthService = {
  listHealthChecks: (params?: HealthCheckSearchParams) =>
    api
      .get<ApiResponse<SystemHealthCheck[]>>('/system-health/checks', { params })
      .then(r => r.data),

  getLatestChecks: () =>
    api.get<ApiResponse<SystemHealthCheck[]>>('/system-health/checks/latest').then(r => r.data),

  listMetrics: (params?: MetricSearchParams) =>
    api.get<ApiResponse<SystemMetric[]>>('/system-health/metrics', { params }).then(r => r.data),

  getStats: () => api.get<ApiResponse<SystemHealthStats>>('/system-health/stats').then(r => r.data),
}
