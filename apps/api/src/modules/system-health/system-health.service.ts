import { Injectable } from '@nestjs/common'
import { SystemHealthRepository } from './system-health.repository'
import {
  buildHealthCheckListWhere,
  buildHealthCheckOrderBy,
  buildMetricListWhere,
  buildMetricOrderBy,
  buildHealthCheckRecord,
  buildMetricRecord,
  buildSystemHealthStats,
} from './system-health.utilities'
import { AppLogFeature } from '../../common/enums'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type {
  HealthCheckRecord,
  PaginatedHealthChecks,
  PaginatedMetrics,
  SystemHealthStats,
} from './system-health.types'

@Injectable()
export class SystemHealthService {
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: SystemHealthRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.SYSTEM_HEALTH, 'SystemHealthService')
  }

  /* ---------------------------------------------------------------- */
  /* LIST HEALTH CHECKS (paginated, tenant-scoped)                     */
  /* ---------------------------------------------------------------- */

  async listHealthChecks(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    serviceType?: string,
    status?: string
  ): Promise<PaginatedHealthChecks> {
    this.log.entry('listHealthChecks', tenantId, {
      page,
      limit,
      sortBy,
      sortOrder,
      serviceType,
      status,
    })

    const where = buildHealthCheckListWhere(tenantId, serviceType, status)
    const orderBy = buildHealthCheckOrderBy(sortBy, sortOrder)

    const [healthChecks, total] = await Promise.all([
      this.repository.findManyHealthChecks({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.repository.countHealthChecks(where),
    ])

    const data: HealthCheckRecord[] = healthChecks.map(buildHealthCheckRecord)

    this.log.success('listHealthChecks', tenantId, { total, returned: data.length, page, limit })

    return {
      data,
      pagination: buildPaginationMeta(page, limit, total),
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET LATEST HEALTH CHECKS                                          */
  /* ---------------------------------------------------------------- */

  async getLatestHealthChecks(tenantId: string): Promise<HealthCheckRecord[]> {
    this.log.entry('getLatestHealthChecks', tenantId)

    const healthChecks = await this.repository.findLatestHealthChecks(tenantId)

    this.log.success('getLatestHealthChecks', tenantId, { count: healthChecks.length })

    return healthChecks.map(buildHealthCheckRecord)
  }

  /* ---------------------------------------------------------------- */
  /* LIST METRICS (paginated, tenant-scoped)                           */
  /* ---------------------------------------------------------------- */

  async listMetrics(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    metricType?: string,
    metricName?: string
  ): Promise<PaginatedMetrics> {
    this.log.entry('listMetrics', tenantId, {
      page,
      limit,
      sortBy,
      sortOrder,
      metricType,
      metricName,
    })

    const where = buildMetricListWhere(tenantId, metricType, metricName)
    const orderBy = buildMetricOrderBy(sortBy, sortOrder)

    const [metrics, total] = await Promise.all([
      this.repository.findManyMetrics({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.repository.countMetrics(where),
    ])

    const data = metrics.map(buildMetricRecord)

    this.log.success('listMetrics', tenantId, { total, returned: data.length, page, limit })

    return {
      data,
      pagination: buildPaginationMeta(page, limit, total),
    }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getSystemHealthStats(tenantId: string): Promise<SystemHealthStats> {
    this.log.entry('getSystemHealthStats', tenantId)

    const latestChecks = await this.getLatestHealthChecks(tenantId)

    this.log.success('getSystemHealthStats', tenantId, {
      totalServices: latestChecks.length,
    })

    return buildSystemHealthStats(latestChecks)
  }
}
