import { Injectable, Logger } from '@nestjs/common'
import { CardVariant, Severity } from '../../../common/enums'
import { InfluxDBService } from '../../connectors/services/influxdb.service'
import type {
  ConnectorWorkspaceStrategy,
  WorkspaceSummaryCard,
  WorkspaceRecentItem,
  WorkspaceEntity,
  WorkspaceQuickAction,
  WorkspaceRecentActivityResponse,
  WorkspaceEntitiesResponse,
  WorkspaceSearchRequest,
  WorkspaceSearchResponse,
  WorkspaceActionResponse,
} from '../types/connector-workspace.types'

@Injectable()
export class InfluxDBWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(InfluxDBWorkspaceStrategy.name)

  constructor(private readonly influxdbService: InfluxDBService) {}

  async getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
  }> {
    const summaryCards: WorkspaceSummaryCard[] = []
    const recentItems: WorkspaceRecentItem[] = []
    const entitiesPreview: WorkspaceEntity[] = []

    try {
      const buckets = await this.influxdbService.getBuckets(config)
      const userBuckets = buckets.filter(b => {
        const name = ((b as Record<string, unknown>).name ?? '') as string
        return !name.startsWith('_')
      })

      summaryCards.push({
        key: 'buckets',
        label: 'Buckets',
        value: userBuckets.length,
        icon: 'database',
        variant: userBuckets.length > 0 ? CardVariant.SUCCESS : CardVariant.WARNING,
      })

      for (const bucket of userBuckets.slice(0, 5)) {
        const b = bucket as Record<string, unknown>
        const retention = b.retentionRules as Array<Record<string, unknown>> | undefined
        const retentionSeconds = retention?.[0]?.everySeconds as number | undefined

        entitiesPreview.push({
          id: (b.id ?? b.name ?? '') as string,
          name: (b.name ?? 'Unnamed') as string,
          status: 'active',
          type: 'bucket',
          metadata: {
            retentionDays: retentionSeconds ? Math.floor(retentionSeconds / 86400) : 'infinite',
            orgID: b.orgID,
          },
        })

        recentItems.push({
          id: (b.id ?? '') as string,
          title: `Bucket: ${b.name as string}`,
          description: retentionSeconds
            ? `Retention: ${Math.floor(retentionSeconds / 86400)} days`
            : 'Retention: infinite',
          timestamp: (b.updatedAt ?? b.createdAt ?? '') as string,
          severity: Severity.INFO,
          type: 'bucket',
        })
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch InfluxDB buckets: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push({
        key: 'buckets',
        label: 'Buckets',
        value: 'N/A',
        icon: 'database',
        variant: CardVariant.ERROR,
      })
    }

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
      { key: 'refresh-buckets', label: 'Refresh Buckets', icon: 'refresh-cw' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    const buckets = await this.influxdbService.getBuckets(config)
    const start = (page - 1) * pageSize
    const sliced = buckets.slice(start, start + pageSize)

    const items: WorkspaceRecentItem[] = sliced.map(bucket => {
      const b = bucket as Record<string, unknown>
      return {
        id: (b.id ?? '') as string,
        title: `Bucket: ${b.name as string}`,
        timestamp: (b.updatedAt ?? '') as string,
        severity: Severity.INFO,
        type: 'bucket',
      }
    })

    return { items, total: buckets.length, page, pageSize }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const buckets = await this.influxdbService.getBuckets(config)
    const start = (page - 1) * pageSize
    const sliced = buckets.slice(start, start + pageSize)

    const entities: WorkspaceEntity[] = sliced.map(bucket => {
      const b = bucket as Record<string, unknown>
      return {
        id: (b.id ?? b.name ?? '') as string,
        name: (b.name ?? 'Unnamed') as string,
        status: 'active',
        type: 'bucket',
        metadata: { orgID: b.orgID },
      }
    })

    return { entities, total: buckets.length, page, pageSize }
  }

  async search(
    _config: Record<string, unknown>,
    request: WorkspaceSearchRequest
  ): Promise<WorkspaceSearchResponse> {
    return { results: [], total: 0, page: request.page ?? 1, pageSize: request.pageSize ?? 20 }
  }

  async executeAction(
    config: Record<string, unknown>,
    action: string,
    _params: Record<string, unknown>
  ): Promise<WorkspaceActionResponse> {
    switch (action) {
      case 'test-connection': {
        const result = await this.influxdbService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      case 'refresh-buckets': {
        const buckets = await this.influxdbService.getBuckets(config)
        return {
          success: true,
          message: `Found ${buckets.length} buckets`,
          data: { count: buckets.length },
        }
      }
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['test-connection', 'refresh-buckets']
  }
}
