import type { HealthCheckStatus, MetricType, ServiceType, SortOrder } from '@/enums'

export interface SystemHealthCheck {
  id: string
  tenantId: string
  serviceType: ServiceType
  status: HealthCheckStatus
  responseTimeMs: number | null
  message: string | null
  version: string | null
  checkedAt: string
}

export interface SystemMetric {
  id: string
  tenantId: string
  serviceType: ServiceType
  metricType: MetricType
  value: number
  unit: string
  recordedAt: string
}

export interface SystemHealthStats {
  totalServices: number
  healthyServices: number
  degradedServices: number
  downServices: number
  avgResponseTimeMs: number | null
  lastCheckedAt: string | null
}

export interface HealthCheckSearchParams {
  page?: number
  limit?: number
  serviceType?: string
  status?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface MetricSearchParams {
  page?: number
  limit?: number
  serviceType?: string
  metricType?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface SystemHealthKpiCardsProps {
  stats: SystemHealthStats | undefined
  isLoading: boolean
}

export interface SystemHealthFiltersProps {
  serviceTypeFilter: string
  statusFilter: string
  onServiceTypeChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export interface SystemHealthDetailPanelProps {
  healthCheck: SystemHealthCheck | null
  metrics: SystemMetric[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface UseSystemHealthPageDetailOptions {
  metricsData: { data?: SystemMetric[] } | undefined
}

export interface SystemHealthColumnTranslations {
  systemHealth: (key: string) => string
  common: (key: string) => string
}
