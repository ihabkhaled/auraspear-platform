import type { MsspPortfolioOverview, MsspTenantSummary } from '../entities/entities.types'

export function buildPortfolioOverview(
  summaries: MsspTenantSummary[]
): MsspPortfolioOverview {
  let totalAlerts = 0
  let totalCriticalAlerts = 0
  let totalOpenCases = 0

  for (const summary of summaries) {
    totalAlerts += summary.alertCount
    totalCriticalAlerts += summary.criticalAlerts
    totalOpenCases += summary.openCases
  }

  return { tenants: summaries, totalAlerts, totalCriticalAlerts, totalOpenCases }
}
