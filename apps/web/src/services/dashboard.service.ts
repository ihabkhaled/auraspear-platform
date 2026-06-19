import api from '@/lib/api'
import type {
  AiResponse,
  ApiResponse,
  DashboardKPI,
  AlertTrendPoint,
  DashboardAnalyticsOverview,
  DashboardOperationsOverview,
  ExplainAnomalyInput,
  MITRETechnique,
  AssetRisk,
  PipelineService,
  ExtendedKPIStats,
  MsspPortfolioOverview,
  MsspTenantComparison,
  RecentActivityItem,
  SeverityDataPoint,
} from '@/types'

export const dashboardService = {
  getKPIs: () => api.get<ApiResponse<DashboardKPI[]>>('/dashboard/kpis').then(r => r.data),

  getAlertTrends: () =>
    api.get<ApiResponse<AlertTrendPoint[]>>('/dashboard/alert-trends').then(r => r.data),

  getSeverityDistribution: () =>
    api.get<ApiResponse<SeverityDataPoint[]>>('/dashboard/severity-distribution').then(r => r.data),

  getMITREStats: () =>
    api.get<ApiResponse<MITRETechnique[]>>('/dashboard/mitre-stats').then(r => r.data),

  getAssetRisks: () =>
    api.get<ApiResponse<AssetRisk[]>>('/dashboard/asset-risks').then(r => r.data),

  getPipelineHealth: () =>
    api.get<ApiResponse<PipelineService[]>>('/dashboard/pipeline-health').then(r => r.data),

  getExtendedKPIs: () =>
    api.get<ApiResponse<ExtendedKPIStats>>('/dashboard/extended-kpis').then(r => r.data),

  getAnalyticsOverview: () =>
    api
      .get<ApiResponse<DashboardAnalyticsOverview>>('/dashboard/analytics-overview')
      .then(r => r.data),

  getOperationsOverview: () =>
    api
      .get<ApiResponse<DashboardOperationsOverview>>('/dashboard/operations-overview')
      .then(r => r.data),

  getRecentActivity: (limit = 10) =>
    api
      .get<ApiResponse<RecentActivityItem[]>>('/dashboard/recent-activity', {
        params: { limit },
      })
      .then(r => r.data),

  aiExplainAnomaly: (data: ExplainAnomalyInput, connector?: string) =>
    api
      .post<ApiResponse<AiResponse>>('/dashboard/ai/explain-anomaly', { ...data, connector })
      .then(r => r.data.data),

  aiDailySummary: (connector?: string) =>
    api
      .post<ApiResponse<AiResponse>>('/dashboard/ai/daily-summary', { connector })
      .then(r => r.data.data),

  getMsspPortfolio: () =>
    api.get<ApiResponse<MsspPortfolioOverview>>('/dashboards/mssp/portfolio').then(r => r.data),

  getMsspComparison: () =>
    api.get<ApiResponse<MsspTenantComparison>>('/dashboards/mssp/comparison').then(r => r.data),
}
