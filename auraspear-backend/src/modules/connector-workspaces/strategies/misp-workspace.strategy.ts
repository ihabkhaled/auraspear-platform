import { Injectable, Logger } from '@nestjs/common'
import { CardVariant } from '../../../common/enums'
import { MispService } from '../../connectors/services/misp.service'
import {
  buildErrorSummaryCard,
  mapMispAttributeToSearchResult,
  mapMispEventToEntity,
  mapMispEventToRecentItem,
  mapMispOverviewEvent,
  paginateArray,
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
export class MispWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(MispWorkspaceStrategy.name)

  constructor(private readonly mispService: MispService) {}

  async getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
  }> {
    const summaryCards: WorkspaceSummaryCard[] = []
    const recentItems: WorkspaceRecentItem[] = []
    const entitiesPreview: WorkspaceEntity[] = []

    await this.fetchOverviewEvents(config, summaryCards, recentItems, entitiesPreview)

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
      { key: 'refresh-events', label: 'Refresh Events', icon: 'refresh-cw' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    const limit = Math.min(pageSize * page, 100)
    const events = await this.mispService.getEvents(config, limit)
    const sliced = paginateArray(events, page, pageSize)
    const items = sliced.map(mapMispEventToRecentItem)
    return { items, total: events.length, page, pageSize }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const limit = Math.min(pageSize * page, 100)
    const events = await this.mispService.getEvents(config, limit)
    const sliced = paginateArray(events, page, pageSize)
    const entities = sliced.map(mapMispEventToEntity)
    return { entities, total: events.length, page, pageSize }
  }

  async search(
    config: Record<string, unknown>,
    request: WorkspaceSearchRequest
  ): Promise<WorkspaceSearchResponse> {
    const cleanedParameters = this.buildSearchParameters(request)
    const attributes = await this.mispService.searchAttributes(config, cleanedParameters)
    const results = attributes.slice(0, request.pageSize ?? 20).map(mapMispAttributeToSearchResult)

    return {
      results,
      total: attributes.length,
      page: request.page ?? 1,
      pageSize: request.pageSize ?? 20,
    }
  }

  async executeAction(
    config: Record<string, unknown>,
    action: string,
    _params: Record<string, unknown>
  ): Promise<WorkspaceActionResponse> {
    switch (action) {
      case 'test-connection': {
        const result = await this.mispService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      case 'refresh-events': {
        const events = await this.mispService.getEvents(config, 10)
        return {
          success: true,
          message: `Fetched ${events.length} events`,
          data: { count: events.length },
        }
      }
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['test-connection', 'refresh-events']
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Overview data fetching                                   */
  /* ---------------------------------------------------------------- */

  private async fetchOverviewEvents(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    recentItems: WorkspaceRecentItem[],
    entitiesPreview: WorkspaceEntity[]
  ): Promise<void> {
    try {
      const events = await this.mispService.getEvents(config, 20)

      summaryCards.push({
        key: 'recent-events',
        label: 'Recent Events',
        value: events.length,
        icon: 'shield',
        variant: events.length > 0 ? CardVariant.INFO : CardVariant.WARNING,
      })

      const tagCounts = new Map<string, number>()

      for (const event of events.slice(0, 5)) {
        const { recentItem, entity, tags } = mapMispOverviewEvent(event)
        recentItems.push(recentItem)
        entitiesPreview.push(entity)

        for (const tag of tags) {
          tagCounts.set(tag.name, (tagCounts.get(tag.name) ?? 0) + 1)
        }
      }

      summaryCards.push({
        key: 'top-tags',
        label: 'Unique Tags',
        value: tagCounts.size,
        icon: 'tag',
        variant: CardVariant.DEFAULT,
      })
    } catch (error) {
      this.logger.warn(
        `Failed to fetch MISP events: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push(buildErrorSummaryCard('recent-events', 'Recent Events', 'shield'))
    }
  }

  private buildSearchParameters(request: WorkspaceSearchRequest): Record<string, unknown> {
    const searchParameters: Record<string, unknown> = {
      value: request.query,
      type: (request.filters?.type as string) ?? undefined,
      category: (request.filters?.category as string) ?? undefined,
      limit: request.pageSize ?? 20,
      page: request.page ?? 1,
    }

    const cleanedParameters = Object.fromEntries(
      Object.entries(searchParameters).filter(([, v]) => v !== undefined)
    )

    if (request.from) {
      cleanedParameters.from = request.from
    }

    return cleanedParameters
  }
}
