import type { ReportModule } from '@/enums'
import api from '@/lib/api'
import type {
  AiResponse,
  ApiResponse,
  CreateReportFromTemplateInput,
  Report,
  ReportSearchParams,
  ReportStats,
  ReportTemplate,
} from '@/types'

export const reportService = {
  getReports: (params?: ReportSearchParams) =>
    api.get<ApiResponse<Report[]>>('/reports', { params }).then(r => r.data),

  getReportById: (id: string) => api.get<ApiResponse<Report>>(`/reports/${id}`).then(r => r.data),

  createReport: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Report>>('/reports', data).then(r => r.data),

  createReportFromTemplate: (data: CreateReportFromTemplateInput) =>
    api.post<ApiResponse<Report>>('/reports/from-template', data).then(r => r.data),

  updateReport: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<Report>>(`/reports/${id}`, data).then(r => r.data),

  deleteReport: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/reports/${id}`).then(r => r.data),

  getTemplates: (module?: ReportModule) =>
    api
      .get<ApiResponse<ReportTemplate[]>>('/reports/templates', {
        params: module ? { module } : undefined,
      })
      .then(r => r.data),

  getStats: () => api.get<ApiResponse<ReportStats>>('/reports/stats').then(r => r.data),

  aiExecutiveReport: (timeRange: string, connector?: string) =>
    api
      .post<ApiResponse<AiResponse>>('/reports/ai/executive', { timeRange, connector })
      .then(r => r.data.data),
}
