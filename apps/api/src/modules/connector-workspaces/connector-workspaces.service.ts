import { Injectable, Logger } from '@nestjs/common'
import { ConnectorWorkspaceFactoryService } from './connector-workspace-factory.service'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ConnectorsService } from '../connectors/connectors.service'
import type {
  ConnectorWorkspaceOverview,
  ConnectorWorkspaceStrategy,
  WorkspaceRecentActivityResponse,
  WorkspaceEntitiesResponse,
  WorkspaceSearchRequest,
  WorkspaceSearchResponse,
  WorkspaceActionResponse,
} from './types/connector-workspace.types'

@Injectable()
export class ConnectorWorkspacesService {
  private readonly logger = new Logger(ConnectorWorkspacesService.name)

  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly factory: ConnectorWorkspaceFactoryService,
    private readonly appLogger: AppLoggerService
  ) {}

  async getOverview(tenantId: string, type: string): Promise<ConnectorWorkspaceOverview> {
    this.logAction('getOverview', tenantId, type)

    const { config, connectorInfo } = await this.resolveConnector(tenantId, type)
    const strategy = this.getStrategyOrThrow(type)
    const strategyResult = await strategy.getOverview(config)

    return { connector: connectorInfo, ...strategyResult }
  }

  async getRecentActivity(
    tenantId: string,
    type: string,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse> {
    this.logAction('getRecentActivity', tenantId, type, { page, pageSize })

    const { config } = await this.resolveConnector(tenantId, type)
    const strategy = this.getStrategyOrThrow(type)

    return strategy.getRecentActivity(config, page, pageSize)
  }

  async getEntities(
    tenantId: string,
    type: string,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse> {
    this.logAction('getEntities', tenantId, type, { page, pageSize })

    const { config } = await this.resolveConnector(tenantId, type)
    const strategy = this.getStrategyOrThrow(type)

    return strategy.getEntities(config, page, pageSize)
  }

  async search(
    tenantId: string,
    type: string,
    request: WorkspaceSearchRequest
  ): Promise<WorkspaceSearchResponse> {
    this.logAction('search', tenantId, type, { query: request.query })

    const { config } = await this.resolveConnector(tenantId, type)
    const strategy = this.getStrategyOrThrow(type)

    return strategy.search(config, request)
  }

  async executeAction(
    tenantId: string,
    type: string,
    action: string,
    params: Record<string, unknown>
  ): Promise<WorkspaceActionResponse> {
    const { config } = await this.resolveConnector(tenantId, type)
    const strategy = this.getStrategyOrThrow(type)

    this.guardAllowedAction(strategy, type, action, tenantId)
    this.logActionExecution(tenantId, type, action)

    return strategy.executeAction(config, action, params)
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Connector resolution                                     */
  /* ---------------------------------------------------------------- */

  private async resolveConnector(
    tenantId: string,
    type: string
  ): Promise<{
    config: Record<string, unknown>
    connectorInfo: ConnectorWorkspaceOverview['connector']
  }> {
    this.guardSupportedType(type, tenantId)
    const decryptedConfig = await this.getDecryptedConfigOrThrow(tenantId, type)
    const connectorInfo = await this.buildConnectorInfo(tenantId, type)
    return { config: decryptedConfig, connectorInfo }
  }

  private guardSupportedType(type: string, tenantId: string): void {
    if (!this.factory.hasStrategy(type)) {
      this.appLogger.warn('Unsupported connector type requested', {
        feature: AppLogFeature.CONNECTOR_WORKSPACES,
        action: 'resolveConnector',
        className: 'ConnectorWorkspacesService',
        sourceType: AppLogSourceType.SERVICE,
        outcome: AppLogOutcome.FAILURE,
        metadata: { tenantId, connectorType: type },
      })
      throw new BusinessException(
        400,
        `Unsupported connector type: ${type}`,
        'errors.connectorWorkspaces.unsupportedType'
      )
    }
  }

  private async getDecryptedConfigOrThrow(
    tenantId: string,
    type: string
  ): Promise<Record<string, unknown>> {
    const decryptedConfig = await this.connectorsService.getDecryptedConfig(tenantId, type)

    if (!decryptedConfig) {
      this.appLogger.warn('Connector not configured or not enabled', {
        feature: AppLogFeature.CONNECTOR_WORKSPACES,
        action: 'resolveConnector',
        className: 'ConnectorWorkspacesService',
        sourceType: AppLogSourceType.SERVICE,
        outcome: AppLogOutcome.FAILURE,
        metadata: { tenantId, connectorType: type },
      })
      throw new BusinessException(
        404,
        `Connector '${type}' is not configured or not enabled for this tenant`,
        'errors.connectorWorkspaces.notConfigured'
      )
    }

    return decryptedConfig
  }

  private async buildConnectorInfo(
    tenantId: string,
    type: string
  ): Promise<ConnectorWorkspaceOverview['connector']> {
    const connectorResponse = await this.connectorsService.findByType(tenantId, type)
    return {
      type: connectorResponse.type,
      status: this.deriveStatus(connectorResponse),
      enabled: connectorResponse.enabled,
      lastTestedAt: connectorResponse.lastTestAt
        ? connectorResponse.lastTestAt.toISOString()
        : null,
      latencyMs: null,
      healthMessage: connectorResponse.lastError,
    }
  }

  private getStrategyOrThrow(type: string): ConnectorWorkspaceStrategy {
    const strategy = this.factory.getStrategy(type)
    if (!strategy) {
      this.appLogger.warn('No workspace strategy found for connector type', {
        feature: AppLogFeature.CONNECTOR_WORKSPACES,
        action: 'getStrategyOrThrow',
        className: 'ConnectorWorkspacesService',
        sourceType: AppLogSourceType.SERVICE,
        outcome: AppLogOutcome.FAILURE,
        metadata: { connectorType: type },
      })
      throw new BusinessException(
        400,
        `No workspace strategy for connector type: ${type}`,
        'errors.connectorWorkspaces.unsupportedType'
      )
    }
    return strategy
  }

  private deriveStatus(connector: { lastTestOk: boolean | null; enabled: boolean }): string {
    if (!connector.enabled) return 'disabled'
    if (connector.lastTestOk === true) return 'connected'
    if (connector.lastTestOk === false) return 'disconnected'
    return 'not_tested'
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Action helpers                                           */
  /* ---------------------------------------------------------------- */

  private guardAllowedAction(
    strategy: ConnectorWorkspaceStrategy,
    type: string,
    action: string,
    tenantId: string
  ): void {
    const allowed = strategy.getAllowedActions()
    if (!allowed.includes(action)) {
      this.appLogger.warn('Workspace action denied — not in allowlist', {
        feature: AppLogFeature.CONNECTOR_WORKSPACES,
        action: 'executeAction',
        outcome: AppLogOutcome.DENIED,
        tenantId,
        sourceType: AppLogSourceType.SERVICE,
        className: 'ConnectorWorkspacesService',
        functionName: 'executeAction',
        metadata: { connectorType: type, requestedAction: action },
      })

      throw new BusinessException(
        403,
        `Action '${action}' is not allowed for connector '${type}'`,
        'errors.connectorWorkspaces.actionNotAllowed'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logAction(
    action: string,
    tenantId: string,
    type: string,
    extraMetadata?: Record<string, unknown>
  ): void {
    this.appLogger.debug(`Fetching connector workspace ${action}`, {
      feature: AppLogFeature.CONNECTOR_WORKSPACES,
      action,
      outcome: AppLogOutcome.SUCCESS,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'ConnectorWorkspacesService',
      functionName: action,
      metadata: { connectorType: type, ...extraMetadata },
    })
  }

  private logActionExecution(tenantId: string, type: string, action: string): void {
    this.logger.log(
      `Executing workspace action '${action}' for connector '${type}' in tenant '${tenantId}'`
    )

    this.appLogger.info('Executing workspace action', {
      feature: AppLogFeature.CONNECTOR_WORKSPACES,
      action: 'executeAction',
      outcome: AppLogOutcome.SUCCESS,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'ConnectorWorkspacesService',
      functionName: 'executeAction',
      metadata: { connectorType: type, executedAction: action },
    })
  }
}
