import { Injectable, Logger } from '@nestjs/common'
import { CardVariant } from '../../../common/enums'
import { LogstashService } from '../../connectors/services/logstash.service'
import {
  buildErrorSummaryCard,
  buildLogstashPipelineStatsItem,
  buildLogstashStatsSummaryCards,
  mapLogstashActivityItem,
  mapLogstashPipelineToEntity,
  mapLogstashPipelineToOverviewEntity,
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
export class LogstashWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(LogstashWorkspaceStrategy.name)

  constructor(private readonly logstashService: LogstashService) {}

  async getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
  }> {
    const summaryCards: WorkspaceSummaryCard[] = []
    const recentItems: WorkspaceRecentItem[] = []
    const entitiesPreview: WorkspaceEntity[] = []

    await this.fetchOverviewPipelines(config, summaryCards, entitiesPreview)
    await this.fetchOverviewStats(config, summaryCards, recentItems)

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'refresh-stats', label: 'Refresh Stats', icon: 'refresh-cw' },
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    const { pipelines: stats } = await this.logstashService.getPipelineStats(config)
    const allItems: WorkspaceRecentItem[] = []

    for (const [name, statValue] of Object.entries(stats)) {
      allItems.push(mapLogstashActivityItem(name, statValue))
    }

    return {
      items: paginateArray(allItems, page, pageSize),
      total: allItems.length,
      page,
      pageSize,
    }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const { pipelines } = await this.logstashService.getPipelines(config)
    const pipelineEntries = Object.entries(pipelines)
    const sliced = paginateArray(pipelineEntries, page, pageSize)
    const entities = sliced.map(([name, pipelineValue]) =>
      mapLogstashPipelineToEntity(name, pipelineValue)
    )

    return { entities, total: pipelineEntries.length, page, pageSize }
  }

  async search(
    _config: Record<string, unknown>,
    request: WorkspaceSearchRequest
  ): Promise<WorkspaceSearchResponse> {
    // Logstash doesn't support arbitrary search — return empty
    return { results: [], total: 0, page: request.page ?? 1, pageSize: request.pageSize ?? 20 }
  }

  async executeAction(
    config: Record<string, unknown>,
    action: string,
    _params: Record<string, unknown>
  ): Promise<WorkspaceActionResponse> {
    switch (action) {
      case 'refresh-stats': {
        const { pipelines } = await this.logstashService.getPipelineStats(config)
        const count = Object.keys(pipelines).length
        return { success: true, message: `Refreshed stats for ${count} pipelines`, data: { count } }
      }
      case 'test-connection': {
        const result = await this.logstashService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['refresh-stats', 'test-connection']
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Overview data fetching                                   */
  /* ---------------------------------------------------------------- */

  private async fetchOverviewPipelines(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    entitiesPreview: WorkspaceEntity[]
  ): Promise<void> {
    try {
      const { pipelines } = await this.logstashService.getPipelines(config)
      const pipelineNames = Object.keys(pipelines)

      summaryCards.push({
        key: 'pipelines',
        label: 'Pipelines',
        value: pipelineNames.length,
        icon: 'git-branch',
        variant: pipelineNames.length > 0 ? CardVariant.SUCCESS : CardVariant.WARNING,
      })

      for (const [name, pipelineValue] of Object.entries(pipelines).slice(0, 5)) {
        entitiesPreview.push(mapLogstashPipelineToOverviewEntity(name, pipelineValue))
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Logstash pipelines: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push(buildErrorSummaryCard('pipelines', 'Pipelines', 'git-branch'))
    }
  }

  private async fetchOverviewStats(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    recentItems: WorkspaceRecentItem[]
  ): Promise<void> {
    try {
      const { pipelines: stats } = await this.logstashService.getPipelineStats(config)

      let totalEventsIn = 0
      let totalEventsOut = 0
      let totalEventsFiltered = 0

      for (const [name, statValue] of Object.entries(stats)) {
        const { item, eventsIn, eventsOut, eventsFiltered } = buildLogstashPipelineStatsItem(
          name,
          statValue
        )
        totalEventsIn += eventsIn
        totalEventsOut += eventsOut
        totalEventsFiltered += eventsFiltered
        recentItems.push(item)
      }

      summaryCards.push(
        ...buildLogstashStatsSummaryCards(totalEventsIn, totalEventsOut, totalEventsFiltered)
      )
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Logstash stats: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }
}
