import { Injectable, Logger } from '@nestjs/common'
import { CardVariant, Severity } from '../../../common/enums'
import { toIso } from '../../../common/utils/date-time.utility'
import { BedrockService } from '../../connectors/services/bedrock.service'
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
export class BedrockWorkspaceStrategy implements ConnectorWorkspaceStrategy {
  private readonly logger = new Logger(BedrockWorkspaceStrategy.name)

  constructor(private readonly bedrockService: BedrockService) {}

  async getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
  }> {
    const summaryCards: WorkspaceSummaryCard[] = []
    const recentItems: WorkspaceRecentItem[] = []
    const entitiesPreview: WorkspaceEntity[] = []

    const modelId = (config.modelId ?? 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') as string
    const region = (config.region ?? 'us-east-1') as string

    summaryCards.push(
      {
        key: 'model',
        label: 'Active Model',
        value: modelId.split('.').pop() ?? modelId,
        icon: 'brain',
        variant: CardVariant.INFO,
      },
      { key: 'region', label: 'Region', value: region, icon: 'globe', variant: CardVariant.DEFAULT }
    )

    // AI governance settings from config
    const nlHunting = config.nlHunting !== false
    const explainableAi = config.explainableAi !== false
    const auditLogging = config.auditLogging !== false

    summaryCards.push({
      key: 'governance',
      label: 'Governance Features',
      value:
        [nlHunting && 'NL Hunt', explainableAi && 'XAI', auditLogging && 'Audit']
          .filter(Boolean)
          .join(', ') || 'None',
      icon: 'shield-check',
      variant: auditLogging ? CardVariant.SUCCESS : CardVariant.WARNING,
    })

    entitiesPreview.push({
      id: modelId,
      name: modelId,
      status: 'configured',
      type: 'model',
      metadata: { region, provider: modelId.split('.')[0] },
    })

    recentItems.push({
      id: 'config-status',
      title: `Bedrock configured with ${modelId}`,
      description: `Region: ${region}`,
      timestamp: toIso(),
      severity: Severity.INFO,
      type: 'config',
    })

    const quickActions: WorkspaceQuickAction[] = [
      { key: 'test-connection', label: 'Test Connection', icon: 'play' },
    ]

    return { summaryCards, recentItems, entitiesPreview, quickActions }
  }

  async getRecentActivity(
    _config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    // Bedrock doesn't have a queryable activity feed — return config info
    return { items: [], total: 0, page, pageSize }
  }

  async getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    const modelId = (config.modelId ?? 'global.anthropic.claude-sonnet-4-5-20250929-v1:0') as string
    const region = (config.region ?? 'us-east-1') as string

    if (page > 1) {
      return { entities: [], total: 1, page, pageSize }
    }

    return {
      entities: [
        {
          id: modelId,
          name: modelId,
          status: 'configured',
          type: 'model',
          metadata: { region, provider: modelId.split('.')[0] },
        },
      ],
      total: 1,
      page,
      pageSize,
    }
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
        const result = await this.bedrockService.testConnection(config)
        return { success: result.ok, message: result.details }
      }
      default:
        return { success: false, message: `Unknown action: ${action}` }
    }
  }

  getAllowedActions(): string[] {
    return ['test-connection']
  }
}
