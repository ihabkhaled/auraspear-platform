import { Injectable, Logger } from '@nestjs/common'
import { CardVariant, Severity } from '../../../common/enums'
import { GrafanaService } from '../../connectors/services/grafana.service'
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
export class GrafanaWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(GrafanaWorkspaceStrategy.name)

  constructor(private readonly grafanaService: GrafanaService) {}

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
      const dashboards = await this.grafanaService.getDashboards(config)

      summaryCards.push({
        key: 'dashboards',
        label: 'Dashboards',
        value: dashboards.length,
        icon: 'layout-dashboard',
        variant: dashboards.length > 0 ? CardVariant.SUCCESS : CardVariant.WARNING,
      })

      const folders = new Set<string>()
      for (const db of dashboards) {
        const d = db as Record<string, unknown>
        if (d.folderTitle) folders.add(d.folderTitle as string)
      }

      summaryCards.push({
        key: 'folders',
        label: 'Folders',
        value: folders.size,
        icon: 'folder',
        variant: CardVariant.DEFAULT,
      })

      for (const db of dashboards.slice(0, 5)) {
        const d = db as Record<string, unknown>
        entitiesPreview.push({
          id: (d.uid ?? d.id ?? '') as string,
          name: (d.title ?? 'Untitled') as string,
          status: 'available',
          type: 'dashboard',
          metadata: { folder: d.folderTitle, tags: d.tags, url: d.url },
        })

        recentItems.push({
          id: (d.uid ?? '') as string,
          title: (d.title ?? 'Dashboard') as string,
          description: (d.folderTitle as string) ?? undefined,
          timestamp: '',
          severity: Severity.INFO,
          type: 'dashboard',
        })
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Grafana dashboards: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push({
        key: 'dashboards',
        label: 'Dashboards',
        value: 'N/A',
        icon: 'layout-dashboard',
        variant: CardVariant.ERROR,
      })
    }

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
      { key: 'refresh-dashboards', label: 'Refresh Dashboards', icon: 'refresh-cw' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    const dashboards = await this.grafanaService.getDashboards(config)
    const start = (page - 1) * pageSize
    const sliced = dashboards.slice(start, start + pageSize)

    const items: WorkspaceRecentItem[] = sliced.map(db => {
      const d = db as Record<string, unknown>
      return {
        id: (d.uid ?? '') as string,
        title: (d.title ?? 'Dashboard') as string,
        timestamp: '',
        severity: Severity.INFO,
        type: 'dashboard',
      }
    })

    return { items, total: dashboards.length, page, pageSize }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const dashboards = await this.grafanaService.getDashboards(config)
    const start = (page - 1) * pageSize
    const sliced = dashboards.slice(start, start + pageSize)

    const entities: WorkspaceEntity[] = sliced.map(db => {
      const d = db as Record<string, unknown>
      return {
        id: (d.uid ?? d.id ?? '') as string,
        name: (d.title ?? 'Untitled') as string,
        status: 'available',
        type: 'dashboard',
        metadata: { folder: d.folderTitle, tags: d.tags },
      }
    })

    return { entities, total: dashboards.length, page, pageSize }
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
        const result = await this.grafanaService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      case 'refresh-dashboards': {
        const dashboards = await this.grafanaService.getDashboards(config)
        return {
          success: true,
          message: `Found ${dashboards.length} dashboards`,
          data: { count: dashboards.length },
        }
      }
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['test-connection', 'refresh-dashboards']
  }
}
