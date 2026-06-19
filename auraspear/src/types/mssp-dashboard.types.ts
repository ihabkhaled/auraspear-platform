export interface MsspTenantSummary {
  tenantId: string
  tenantName: string
  alertCount: number
  criticalAlerts: number
  openCases: number
  activeHunts: number
  connectorHealth: number
  aiUsage: number
}

export interface MsspPortfolioOverview {
  tenants: MsspTenantSummary[]
  totalAlerts: number
  totalCriticalAlerts: number
  totalOpenCases: number
}

export interface MsspTenantComparison {
  tenants: MsspTenantSummary[]
}

export interface MsspTenantCardProps {
  summary: MsspTenantSummary
  t: (key: string) => string
}

export interface MsspPortfolioKpiProps {
  overview: MsspPortfolioOverview
  t: (key: string) => string
}
