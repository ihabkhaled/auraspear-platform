import { Injectable, Logger } from '@nestjs/common'
import { MsspDashboardRepository } from './mssp-dashboard.repository'
import { buildPortfolioOverview } from './mssp-dashboard.utilities'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type {
  MsspPortfolioOverview,
  MsspTenantComparison,
  MsspTenantSummary,
} from '../entities/entities.types'

@Injectable()
export class MsspDashboardService {
  private readonly logger = new Logger(MsspDashboardService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly msspRepository: MsspDashboardRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.MSSP_DASHBOARD,
      'MsspDashboardService'
    )
  }

  async getPortfolioOverview(): Promise<MsspPortfolioOverview> {
    this.logger.log('getPortfolioOverview called')
    const tenants = await this.msspRepository.getAllTenants()
    const summaries = await this.buildTenantSummaries(tenants)
    const overview = buildPortfolioOverview(summaries)

    this.logger.log(
      `getPortfolioOverview completed, ${String(tenants.length)} tenants, ${String(overview.totalAlerts)} total alerts`
    )
    this.log.success('getPortfolioOverview', 'global', {
      tenantCount: tenants.length,
      totalAlerts: overview.totalAlerts,
      totalCriticalAlerts: overview.totalCriticalAlerts,
    })

    return overview
  }

  async getTenantComparison(): Promise<MsspTenantComparison> {
    this.logger.log('getTenantComparison called')
    const overview = await this.getPortfolioOverview()
    this.logger.log(
      `getTenantComparison completed, ${String(overview.tenants.length)} tenants compared`
    )
    return { tenants: overview.tenants }
  }

  private async buildTenantSummaries(
    tenants: Array<{ id: string; name: string }>
  ): Promise<MsspTenantSummary[]> {
    const tenantIds = tenants.map(t => t.id)

    const [alertCounts, caseCounts, huntCounts] = await Promise.all([
      this.msspRepository.countAlertsByTenant(tenantIds),
      this.msspRepository.countOpenCasesByTenant(tenantIds),
      this.msspRepository.countActiveHuntsByTenant(tenantIds),
    ])

    return Promise.all(
      tenants.map(async tenant =>
        this.buildSingleTenantSummary(tenant, alertCounts, caseCounts, huntCounts)
      )
    )
  }

  private async buildSingleTenantSummary(
    tenant: { id: string; name: string },
    alertCounts: Array<{ tenantId: string; alertCount: number; criticalAlerts: number }>,
    caseCounts: Array<{ tenantId: string; openCases: number }>,
    huntCounts: Array<{ tenantId: string; activeHunts: number }>
  ): Promise<MsspTenantSummary> {
    const alertData = alertCounts.find(a => a.tenantId === tenant.id)
    const caseData = caseCounts.find(c => c.tenantId === tenant.id)
    const huntData = huntCounts.find(h => h.tenantId === tenant.id)
    const [connectorHealth, aiUsage] = await Promise.all([
      this.msspRepository.countConnectorHealthByTenant(tenant.id),
      this.msspRepository.countAiUsageByTenant(tenant.id),
    ])

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      alertCount: alertData?.alertCount ?? 0,
      criticalAlerts: alertData?.criticalAlerts ?? 0,
      openCases: caseData?.openCases ?? 0,
      activeHunts: huntData?.activeHunts ?? 0,
      connectorHealth,
      aiUsage,
    }
  }
}
