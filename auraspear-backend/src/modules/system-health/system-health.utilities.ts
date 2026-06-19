import { HEALTH_CHECK_SORT_FIELDS, METRIC_SORT_FIELDS } from './system-health.constants'
import { ServiceStatus } from '../../common/enums'
import { nowDate } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type {
  HealthCheckRecord,
  MetricRecord,
  SystemHealthStats,
  HealthCheckEntity,
  MetricEntity,
} from './system-health.types'
import type { Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* QUERY BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildHealthCheckListWhere(
  tenantId: string,
  serviceType?: string,
  status?: string
): Prisma.SystemHealthCheckWhereInput {
  const where: Prisma.SystemHealthCheckWhereInput = { tenantId }

  if (serviceType) {
    where.serviceType = serviceType as Prisma.EnumServiceTypeFilter
  }

  if (status) {
    where.status = status as Prisma.EnumServiceStatusFilter
  }

  return where
}

export function buildHealthCheckOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.SystemHealthCheckOrderByWithRelationInput {
  return buildOrderBy(HEALTH_CHECK_SORT_FIELDS, 'lastCheckedAt', sortBy, sortOrder)
}

export function buildMetricListWhere(
  tenantId: string,
  metricType?: string,
  metricName?: string
): Prisma.SystemMetricWhereInput {
  const where: Prisma.SystemMetricWhereInput = { tenantId }

  if (metricType) {
    where.metricType = metricType as Prisma.EnumMetricTypeFilter
  }

  if (metricName) {
    where.metricName = { contains: metricName, mode: 'insensitive' }
  }

  return where
}

export function buildMetricOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.SystemMetricOrderByWithRelationInput {
  return buildOrderBy(METRIC_SORT_FIELDS, 'recordedAt', sortBy, sortOrder)
}

/* ---------------------------------------------------------------- */
/* RECORD MAPPING                                                    */
/* ---------------------------------------------------------------- */

export function buildHealthCheckRecord(hc: HealthCheckEntity): HealthCheckRecord {
  return {
    id: hc.id,
    tenantId: hc.tenantId,
    serviceName: hc.serviceName,
    serviceType: hc.serviceType,
    status: hc.status,
    responseTimeMs: hc.responseTimeMs,
    message: hc.errorMessage,
    metadata: hc.metadata as Record<string, unknown> | null,
    checkedAt: hc.lastCheckedAt,
    createdAt: hc.createdAt,
  }
}

export function buildMetricRecord(m: MetricEntity): MetricRecord {
  return {
    id: m.id,
    tenantId: m.tenantId,
    metricName: m.metricName,
    metricType: m.metricType,
    value: m.value,
    unit: m.unit,
    tags: m.tags as Record<string, unknown> | null,
    recordedAt: m.recordedAt,
    createdAt: m.createdAt,
  }
}

/* ---------------------------------------------------------------- */
/* STATS BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildSystemHealthStats(latestChecks: HealthCheckRecord[]): SystemHealthStats {
  const totalServices = latestChecks.length
  const healthyServices = latestChecks.filter(hc => hc.status === ServiceStatus.HEALTHY).length
  const degradedServices = latestChecks.filter(hc => hc.status === ServiceStatus.DEGRADED).length
  const downServices = latestChecks.filter(hc => hc.status === ServiceStatus.DOWN).length

  const responseTimes = latestChecks
    .map(hc => hc.responseTimeMs)
    .filter((ms): ms is number => ms !== null)

  let avgResponseTimeMs: number | null = null
  if (responseTimes.length > 0) {
    let totalResponseMs = 0
    for (const ms of responseTimes) {
      totalResponseMs += ms
    }
    avgResponseTimeMs = Math.round((totalResponseMs / responseTimes.length) * 100) / 100
  }

  let lastCheckedAt: Date | null = null
  if (latestChecks.length > 0) {
    lastCheckedAt = latestChecks[0]?.checkedAt ?? nowDate()
    for (const hc of latestChecks) {
      if (hc.checkedAt > lastCheckedAt) {
        lastCheckedAt = hc.checkedAt
      }
    }
  }

  return {
    totalServices,
    healthyServices,
    degradedServices,
    downServices,
    avgResponseTimeMs,
    lastCheckedAt,
  }
}
