import { Injectable } from '@nestjs/common'
import { daysAgo } from '../../common/utils/date-time.utility'
import { PrismaService } from '../../prisma/prisma.service'
import type { TenantAlertCounts, TenantCaseCounts, TenantHuntCounts } from './dashboards.types'

@Injectable()
export class MsspDashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getAllTenants(): Promise<Array<{ id: string; name: string }>> {
    return this.prisma.tenant.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  }

  async countAlertsByTenant(tenantIds: string[]): Promise<TenantAlertCounts[]> {
    const results = await Promise.all(
      tenantIds.map(async tenantId => {
        const [tenant, alertCount, criticalAlerts] = await Promise.all([
          this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { name: true },
          }),
          this.prisma.alert.count({
            where: { tenantId },
          }),
          this.prisma.alert.count({
            where: { tenantId, severity: 'critical' },
          }),
        ])

        return {
          tenantId,
          tenantName: tenant?.name ?? 'Unknown',
          alertCount,
          criticalAlerts,
        }
      })
    )

    return results
  }

  async countOpenCasesByTenant(tenantIds: string[]): Promise<TenantCaseCounts[]> {
    const results = await Promise.all(
      tenantIds.map(async tenantId => {
        const openCases = await this.prisma.case.count({
          where: { tenantId, status: { in: ['open', 'in_progress'] } },
        })
        return { tenantId, openCases }
      })
    )

    return results
  }

  async countActiveHuntsByTenant(tenantIds: string[]): Promise<TenantHuntCounts[]> {
    const results = await Promise.all(
      tenantIds.map(async tenantId => {
        const activeHunts = await this.prisma.huntSession.count({
          where: { tenantId, status: 'running' },
        })
        return { tenantId, activeHunts }
      })
    )

    return results
  }

  async countConnectorHealthByTenant(tenantId: string): Promise<number> {
    const totalConnectors = await this.prisma.connectorConfig.count({
      where: { tenantId },
    })

    if (totalConnectors === 0) {
      return 100
    }

    const healthyConnectors = await this.prisma.connectorConfig.count({
      where: { tenantId, enabled: true },
    })

    return Math.round((healthyConnectors / totalConnectors) * 100)
  }

  async countAiUsageByTenant(tenantId: string): Promise<number> {
    const thirtyDaysAgo = daysAgo(30)

    return this.prisma.aiUsageLedger.count({
      where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
    })
  }
}
