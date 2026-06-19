import { Injectable, Logger } from '@nestjs/common'
import { CardVariant } from '../../../common/enums'
import { ShuffleService } from '../../connectors/services/shuffle.service'
import {
  buildErrorSummaryCard,
  mapShuffleWorkflowToEntity,
  mapShuffleWorkflowToOverviewEntity,
  mapShuffleWorkflowToOverviewRecentItem,
  mapShuffleWorkflowToRecentItem,
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
export class ShuffleWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(ShuffleWorkspaceStrategy.name)

  constructor(private readonly shuffleService: ShuffleService) {}

  async getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
  }> {
    const summaryCards: WorkspaceSummaryCard[] = []
    const recentItems: WorkspaceRecentItem[] = []
    const entitiesPreview: WorkspaceEntity[] = []

    await this.fetchOverviewWorkflows(config, summaryCards, recentItems, entitiesPreview)

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
      { key: 'refresh-workflows', label: 'Refresh Workflows', icon: 'refresh-cw' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    const workflows = await this.shuffleService.getWorkflows(config)
    const sliced = paginateArray(workflows, page, pageSize)
    const items = sliced.map(mapShuffleWorkflowToRecentItem)
    return { items, total: workflows.length, page, pageSize }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const workflows = await this.shuffleService.getWorkflows(config)
    const sliced = paginateArray(workflows, page, pageSize)
    const entities = sliced.map(mapShuffleWorkflowToEntity)
    return { entities, total: workflows.length, page, pageSize }
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
    params: Record<string, unknown>
  ): Promise<WorkspaceActionResponse> {
    switch (action) {
      case 'test-connection': {
        const result = await this.shuffleService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      case 'refresh-workflows': {
        const workflows = await this.shuffleService.getWorkflows(config)
        return {
          success: true,
          message: `Found ${workflows.length} workflows`,
          data: { count: workflows.length },
        }
      }
      case 'execute-workflow':
        return this.executeWorkflowAction(config, params)
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['test-connection', 'refresh-workflows', 'execute-workflow']
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE                                                           */
  /* ---------------------------------------------------------------- */

  private async fetchOverviewWorkflows(
    config: Record<string, unknown>,
    summaryCards: WorkspaceSummaryCard[],
    recentItems: WorkspaceRecentItem[],
    entitiesPreview: WorkspaceEntity[]
  ): Promise<void> {
    try {
      const workflows = await this.shuffleService.getWorkflows(config)

      summaryCards.push({
        key: 'workflows',
        label: 'Workflows',
        value: workflows.length,
        icon: 'workflow',
        variant: workflows.length > 0 ? CardVariant.SUCCESS : CardVariant.WARNING,
      })

      let activeCount = 0
      for (const wf of workflows.slice(0, 10)) {
        const w = wf as Record<string, unknown>
        if (w.is_valid) activeCount++

        if (entitiesPreview.length < 5) {
          entitiesPreview.push(mapShuffleWorkflowToOverviewEntity(wf))
        }

        if (recentItems.length < 5) {
          recentItems.push(mapShuffleWorkflowToOverviewRecentItem(wf))
        }
      }

      summaryCards.push({
        key: 'active-workflows',
        label: 'Active Workflows',
        value: activeCount,
        icon: 'check-circle',
        variant: activeCount > 0 ? CardVariant.SUCCESS : CardVariant.WARNING,
      })
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Shuffle workflows: ${error instanceof Error ? error.message : 'unknown'}`
      )
      summaryCards.push(buildErrorSummaryCard('workflows', 'Workflows', 'workflow'))
    }
  }

  private async executeWorkflowAction(
    config: Record<string, unknown>,
    params: Record<string, unknown>
  ): Promise<WorkspaceActionResponse> {
    const workflowId = params.workflowId as string | undefined
    if (!workflowId) {
      return { success: false, message: 'workflowId is required' }
    }
    const result = await this.shuffleService.executeWorkflow(
      config,
      workflowId,
      (params.data as Record<string, unknown>) ?? {}
    )
    return {
      success: true,
      message: `Workflow executed: ${result.executionId}`,
      data: { executionId: result.executionId },
    }
  }
}
