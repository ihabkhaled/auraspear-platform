import api from '@/lib/api'
import type {
  AiBudgetAlert,
  AiCostRate,
  AiFinopsDashboard,
  AiMonthlyUsage,
  AiUsageSummary,
} from '@/types'

/**
 * Extract the actual payload from a proxy response.
 * The proxy wraps non-wrapped backend responses as { data: T }.
 */
function extractData<T>(response: { data: unknown }): T {
  const body = response.data as Record<string, unknown>
  if (body !== null && typeof body === 'object' && 'data' in body) {
    return body['data'] as T
  }
  return body as T
}

export const aiUsageService = {
  getUsageSummary: (startDate?: string, endDate?: string) =>
    api
      .get('/ai-usage', { params: { startDate, endDate } })
      .then(r => extractData<AiUsageSummary>(r)),

  getMonthlyUsage: () => api.get('/ai-usage/monthly').then(r => extractData<AiMonthlyUsage>(r)),

  getFinopsDashboard: () =>
    api.get('/ai-usage/finops').then(r => extractData<AiFinopsDashboard>(r)),

  listCostRates: () => api.get('/ai-usage/cost-rates').then(r => extractData<AiCostRate[]>(r)),

  upsertCostRate: (data: {
    provider: string
    model: string
    inputCostPer1k: number
    outputCostPer1k: number
  }) => api.put('/ai-usage/cost-rates', data).then(r => extractData<AiCostRate>(r)),

  deleteCostRate: (id: string) =>
    api.delete(`/ai-usage/cost-rates/${id}`).then(r => extractData<unknown>(r)),

  listBudgetAlerts: () =>
    api.get('/ai-usage/budget-alerts').then(r => extractData<AiBudgetAlert[]>(r)),

  upsertBudgetAlert: (data: {
    scope: string
    scopeKey?: string
    monthlyBudget: number
    alertThresholds: string
  }) => api.put('/ai-usage/budget-alerts', data).then(r => extractData<AiBudgetAlert>(r)),

  updateBudgetAlert: (
    id: string,
    data: {
      scope?: string
      scopeKey?: string | null
      monthlyBudget?: number
      alertThresholds?: string
    }
  ) => api.patch(`/ai-usage/budget-alerts/${id}`, data).then(r => extractData<AiBudgetAlert>(r)),

  deleteBudgetAlert: (id: string) =>
    api.delete(`/ai-usage/budget-alerts/${id}`).then(r => extractData<unknown>(r)),

  toggleBudgetAlert: (id: string, enabled: boolean) =>
    api
      .post(`/ai-usage/budget-alerts/${id}/toggle`, { enabled })
      .then(r => extractData<unknown>(r)),
}
