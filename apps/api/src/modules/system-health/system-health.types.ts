import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'

export interface HealthCheckRecord {
  id: string
  tenantId: string
  serviceName: string
  serviceType: string
  status: string
  responseTimeMs: number | null
  message: string | null
  metadata: Record<string, unknown> | null
  checkedAt: Date
  createdAt: Date
}

export type PaginatedHealthChecks = PaginatedResponse<HealthCheckRecord>

export interface MetricRecord {
  id: string
  tenantId: string
  metricName: string
  metricType: string
  value: number
  unit: string | null
  tags: Record<string, unknown> | null
  recordedAt: Date
  createdAt: Date
}

export type PaginatedMetrics = PaginatedResponse<MetricRecord>

export interface SystemHealthStats {
  totalServices: number
  healthyServices: number
  degradedServices: number
  downServices: number
  avgResponseTimeMs: number | null
  lastCheckedAt: Date | null
}

export interface HealthCheckEntity {
  id: string
  tenantId: string
  serviceName: string
  serviceType: string
  status: string
  responseTimeMs: number | null
  errorMessage: string | null
  metadata: unknown
  lastCheckedAt: Date
  createdAt: Date
}

export interface MetricEntity {
  id: string
  tenantId: string
  metricName: string
  metricType: string
  value: number
  unit: string | null
  tags: unknown
  recordedAt: Date
  createdAt: Date
}
