import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { Prisma, SystemHealthCheck, SystemMetric } from '@prisma/client'

@Injectable()
export class SystemHealthRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ---------------------------------------------------------------- */
  /* HEALTH CHECKS                                                     */
  /* ---------------------------------------------------------------- */

  async findManyHealthChecks(params: {
    where: Prisma.SystemHealthCheckWhereInput
    skip: number
    take: number
    orderBy: Prisma.SystemHealthCheckOrderByWithRelationInput
  }): Promise<SystemHealthCheck[]> {
    return this.prisma.systemHealthCheck.findMany(params)
  }

  async countHealthChecks(where: Prisma.SystemHealthCheckWhereInput): Promise<number> {
    return this.prisma.systemHealthCheck.count({ where })
  }

  async findLatestHealthChecks(tenantId: string): Promise<SystemHealthCheck[]> {
    return this.prisma.systemHealthCheck.findMany({
      where: { tenantId },
      orderBy: { lastCheckedAt: 'desc' },
      distinct: ['serviceName'],
      take: 100,
    })
  }

  /* ---------------------------------------------------------------- */
  /* METRICS                                                           */
  /* ---------------------------------------------------------------- */

  async findManyMetrics(params: {
    where: Prisma.SystemMetricWhereInput
    skip: number
    take: number
    orderBy: Prisma.SystemMetricOrderByWithRelationInput
  }): Promise<SystemMetric[]> {
    return this.prisma.systemMetric.findMany(params)
  }

  async countMetrics(where: Prisma.SystemMetricWhereInput): Promise<number> {
    return this.prisma.systemMetric.count({ where })
  }
}
