import { Injectable, Logger } from '@nestjs/common'
import { CardVariant } from '../../../common/enums'
import { VelociraptorService } from '../../connectors/services/velociraptor.service'
import {
  buildErrorSummaryCard,
  isVelociraptorClientOnline,
  mapVelociraptorClientToEntity,
  mapVelociraptorClientToOverviewEntity,
  mapVelociraptorClientToRecentItem,
  paginateArray,
  sortVelociraptorClientsByLastSeen,
} from '../connector-workspaces.utilities'
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
export class VelociraptorWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(VelociraptorWorkspaceStrategy.name)

  constructor(private readonly velociraptorService: VelociraptorService) {}

  async getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
  }> {
    const summaryCards: WorkspaceSummaryCard[] = []
    const recentItems: WorkspaceRecentItem[] = []
    const entitiesPreview: WorkspaceEntity[] = []

    await this.fetchOverviewClients(config, summaryCards, recentItems, entitiesPreview)

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
      { key: 'refresh-clients', label: 'Refresh Clients', icon: 'refresh-cw' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    const clients = await this.velociraptorService.getClients(config)
    const sorted = sortVelociraptorClientsByLastSeen(clients)
    const sliced = paginateArray(sorted, page, pageSize)
    const items = sliced.map(mapVelociraptorClientToRecentItem)
    return { items, total: clients.length, page, pageSize }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const clients = await this.velociraptorService.getClients(config)
    const sliced = paginateArray(clients, page, pageSize)
    const entities = sliced.map(mapVelociraptorClientToEntity)
    return { entities, total: clients.length, page, pageSize }
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
        const result = await this.velociraptorService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      case 'refresh-clients': {
        const clients = await this.velociraptorService.getClients(config)
        return {
          success: true,
          message: `Found ${clients.length} clients`,
          data: { count: clients.length },
        }
      }
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['test-connection', 'refresh-clients']
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE                                                           */
  /* ---------------------------------------------------------------- */

  private async fetchOverviewClients(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    recentItems: WorkspaceRecentItem[],
    entitiesPreview: WorkspaceEntity[]
  ): Promise<void> {
    try {
      const clients = await this.velociraptorService.getClients(config)
      const onlineCount = clients.filter(isVelociraptorClientOnline).length

      summaryCards.push(
        {
          key: 'total-clients',
          label: 'Total Clients',
          value: clients.length,
          icon: 'laptop',
          variant: CardVariant.INFO,
        },
        {
          key: 'online-clients',
          label: 'Online Clients',
          value: onlineCount,
          icon: 'wifi',
          variant: onlineCount > 0 ? CardVariant.SUCCESS : CardVariant.WARNING,
        }
      )

      for (const client of clients.slice(0, 5)) {
        entitiesPreview.push(mapVelociraptorClientToOverviewEntity(client))
        recentItems.push(mapVelociraptorClientToRecentItem(client))
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Velociraptor clients: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push(buildErrorSummaryCard('total-clients', 'Total Clients', 'laptop'))
    }
  }
}
