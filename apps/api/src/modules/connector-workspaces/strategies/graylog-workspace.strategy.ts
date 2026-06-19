import { Injectable, Logger } from '@nestjs/common'
import { CardVariant } from '../../../common/enums'
import { daysAgo, toIso } from '../../../common/utils/date-time.utility'
import { sanitizeEsQueryString } from '../../../common/utils/es-sanitize.utility'
import { GraylogService } from '../../connectors/services/graylog.service'
import {
  buildErrorSummaryCard,
  buildGraylogDefinitionOverviewEntity,
  mapGraylogDefinitionToEntity,
  mapGraylogEventToRecentItem,
  mapGraylogOverviewEvent,
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
export class GraylogWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(GraylogWorkspaceStrategy.name)

  constructor(private readonly graylogService: GraylogService) {}

  async getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
  }> {
    const summaryCards: WorkspaceSummaryCard[] = []
    const recentItems: WorkspaceRecentItem[] = []
    const entitiesPreview: WorkspaceEntity[] = []

    await this.fetchOverviewEvents(config, summaryCards, recentItems)
    await this.fetchOverviewDefinitions(config, summaryCards, entitiesPreview)

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    const result = await this.graylogService.searchEvents(config, {
      timerange: { type: 'relative', range: 86400 },
      page,
      per_page: pageSize,
    })

    const items = result.events.map(mapGraylogEventToRecentItem)
    return { items, total: result.total, page, pageSize }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const definitions = await this.graylogService.getEventDefinitions(config)
    const sliced = paginateArray(definitions, page, pageSize)
    const entities = sliced.map(mapGraylogDefinitionToEntity)
    return { entities, total: definitions.length, page, pageSize }
  }

  async search(
    config: Record<string, unknown>,
    request: WorkspaceSearchRequest
  ): Promise<WorkspaceSearchResponse> {
    const sanitizedQuery = sanitizeEsQueryString(request.query)
    if (sanitizedQuery.length === 0) {
      return { results: [], total: 0, page: request.page ?? 1, pageSize: request.pageSize ?? 20 }
    }

    const filter = this.buildSearchFilter(request, sanitizedQuery)
    const result = await this.graylogService.searchEvents(config, filter)
    const results = result.events.map(mapGraylogEventToRecentItem)

    return {
      results,
      total: result.total,
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
        const result = await this.graylogService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['test-connection']
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Overview data fetching                                   */
  /* ---------------------------------------------------------------- */

  private async fetchOverviewEvents(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    recentItems: WorkspaceRecentItem[]
  ): Promise<void> {
    try {
      const eventResult = await this.graylogService.searchEvents(config, {
        timerange: { type: 'relative', range: 86400 },
        page: 1,
        per_page: 10,
      })

      summaryCards.push({
        key: 'events-24h',
        label: 'Events (24h)',
        value: eventResult.total,
        icon: 'activity',
        variant: eventResult.total > 0 ? CardVariant.INFO : CardVariant.SUCCESS,
      })

      for (const event of eventResult.events.slice(0, 5)) {
        recentItems.push(mapGraylogOverviewEvent(event))
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Graylog events: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push(buildErrorSummaryCard('events-24h', 'Events (24h)', 'activity'))
    }
  }

  private async fetchOverviewDefinitions(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    entitiesPreview: WorkspaceEntity[]
  ): Promise<void> {
    try {
      const definitions = await this.graylogService.getEventDefinitions(config)
      summaryCards.push({
        key: 'event-definitions',
        label: 'Event Definitions',
        value: definitions.length,
        icon: 'list',
        variant: CardVariant.DEFAULT,
      })

      for (const definition of definitions.slice(0, 5)) {
        entitiesPreview.push(buildGraylogDefinitionOverviewEntity(definition))
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Graylog definitions: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }

  private buildSearchFilter(
    request: WorkspaceSearchRequest,
    sanitizedQuery: string
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {
      query: sanitizedQuery,
      page: request.page ?? 1,
      per_page: request.pageSize ?? 20,
      timerange: { type: 'relative', range: 86400 },
    }

    if (request.from ?? request.to) {
      filter.timerange = {
        type: 'absolute',
        from: request.from ?? toIso(daysAgo(1)),
        to: request.to ?? toIso(),
      }
    }

    return filter
  }
}
