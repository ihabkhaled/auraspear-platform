import { Injectable, Logger } from '@nestjs/common'
import { CardVariant } from '../../../common/enums'
import { daysAgo, toIso } from '../../../common/utils/date-time.utility'
import {
  sanitizeEsQueryString,
  buildSafeQueryStringClause,
} from '../../../common/utils/es-sanitize.utility'
import { WazuhService } from '../../connectors/services/wazuh.service'
import {
  alertVariant,
  buildErrorSummaryCard,
  mapWazuhAgentToEntity,
  mapWazuhAgentToOverviewEntity,
  mapWazuhHitToActivityItem,
  mapWazuhHitToRecentItem,
  mapWazuhHitToSearchResult,
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
export class WazuhWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(WazuhWorkspaceStrategy.name)

  constructor(private readonly wazuhService: WazuhService) {}

  async getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
  }> {
    const summaryCards: WorkspaceSummaryCard[] = []
    const recentItems: WorkspaceRecentItem[] = []
    const entitiesPreview: WorkspaceEntity[] = []

    await this.fetchOverviewAgents(config, summaryCards, entitiesPreview)
    await this.fetchOverviewAlerts(config, summaryCards, recentItems)

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'refresh-agents', label: 'Refresh Agents', icon: 'refresh-cw' },
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    const from = (page - 1) * pageSize
    const result = await this.wazuhService.searchAlerts(config, {
      size: pageSize,
      from,
      sort: [{ timestamp: { order: 'desc' } }],
      query: { match_all: {} },
    })

    const items = result.hits.map(mapWazuhHitToActivityItem)
    return { items, total: result.total, page, pageSize }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const agents = await this.wazuhService.getAgents(config)
    const sliced = paginateArray(agents, page, pageSize)
    const entities = sliced.map(mapWazuhAgentToEntity)
    return { entities, total: agents.length, page, pageSize }
  }

  async search(
    config: Record<string, unknown>,
    request: WorkspaceSearchRequest
  ): Promise<WorkspaceSearchResponse> {
    const sanitizedQuery = sanitizeEsQueryString(request.query)
    if (sanitizedQuery.length === 0) {
      return { results: [], total: 0, page: request.page ?? 1, pageSize: request.pageSize ?? 20 }
    }

    const esQuery = this.buildSearchQuery(request, sanitizedQuery)
    const result = await this.wazuhService.searchAlerts(config, esQuery)
    const results = result.hits.map(mapWazuhHitToSearchResult)

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
      case 'refresh-agents': {
        const agents = await this.wazuhService.getAgents(config)
        return {
          success: true,
          message: `Refreshed ${agents.length} agents`,
          data: { count: agents.length },
        }
      }
      case 'test-connection': {
        const result = await this.wazuhService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['refresh-agents', 'test-connection']
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Overview data fetching                                   */
  /* ---------------------------------------------------------------- */

  private async fetchOverviewAgents(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    entitiesPreview: WorkspaceEntity[]
  ): Promise<void> {
    try {
      const agents = await this.wazuhService.getAgents(config)
      const activeCount = agents.length
      summaryCards.push({
        key: 'active-agents',
        label: 'Active Agents',
        value: activeCount,
        icon: 'monitor',
        variant: activeCount > 0 ? CardVariant.SUCCESS : CardVariant.WARNING,
      })

      for (const agent of agents.slice(0, 5)) {
        entitiesPreview.push(mapWazuhAgentToOverviewEntity(agent))
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Wazuh agents: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push(buildErrorSummaryCard('active-agents', 'Active Agents', 'monitor'))
    }
  }

  private async fetchOverviewAlerts(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    recentItems: WorkspaceRecentItem[]
  ): Promise<void> {
    try {
      const dayAgo = daysAgo(1)
      const alertResult = await this.wazuhService.searchAlerts(config, {
        size: 10,
        sort: [{ timestamp: { order: 'desc' } }],
        query: {
          range: {
            timestamp: {
              gte: toIso(dayAgo),
              lte: toIso(),
            },
          },
        },
      })

      summaryCards.push({
        key: 'alerts-24h',
        label: 'Alerts (24h)',
        value: alertResult.total,
        icon: 'alert-triangle',
        variant: alertVariant(alertResult.total),
      })

      for (const hit of alertResult.hits.slice(0, 5)) {
        recentItems.push(mapWazuhHitToRecentItem(hit))
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Wazuh alerts: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push(buildErrorSummaryCard('alerts-24h', 'Alerts (24h)', 'alert-triangle'))
    }
  }

  private buildSearchQuery(
    request: WorkspaceSearchRequest,
    sanitizedQuery: string
  ): Record<string, unknown> {
    const from = ((request.page ?? 1) - 1) * (request.pageSize ?? 20)
    const esQuery: Record<string, unknown> = {
      size: request.pageSize ?? 20,
      from,
      sort: [{ timestamp: { order: 'desc' } }],
      query: {
        bool: {
          must: [buildSafeQueryStringClause(sanitizedQuery, 'AND')],
          filter: [] as Record<string, unknown>[],
        },
      },
    }

    if (request.from ?? request.to) {
      const range: Record<string, unknown> = {}
      if (request.from) range.gte = request.from
      if (request.to) range.lte = request.to
      ;((esQuery.query as Record<string, unknown>).bool as Record<string, unknown>).filter = [
        { range: { timestamp: range } },
      ]
    }

    return esQuery
  }
}
