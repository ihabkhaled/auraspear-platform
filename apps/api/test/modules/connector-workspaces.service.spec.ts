import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { ConnectorWorkspacesService } from '../../src/modules/connector-workspaces/connector-workspaces.service'
import type {
  ConnectorWorkspaceStrategy,
  WorkspaceRecentActivityResponse,
  WorkspaceEntitiesResponse,
  WorkspaceSearchRequest,
  WorkspaceSearchResponse,
  WorkspaceActionResponse,
  WorkspaceSummaryCard,
  WorkspaceRecentItem,
  WorkspaceEntity,
  WorkspaceQuickAction,
} from '../../src/modules/connector-workspaces/types/connector-workspace.types'

const TENANT_ID = 'tenant-001'
const CONNECTOR_TYPE = 'wazuh'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockConnectorsService() {
  return {
    getDecryptedConfig: jest.fn(),
    findByType: jest.fn(),
  }
}

function createMockFactory() {
  return {
    hasStrategy: jest.fn(),
    getStrategy: jest.fn(),
  }
}

function createMockStrategy(): { [K in keyof ConnectorWorkspaceStrategy]: jest.Mock } {
  return {
    getOverview: jest.fn(),
    getRecentActivity: jest.fn(),
    getEntities: jest.fn(),
    search: jest.fn(),
    executeAction: jest.fn(),
    getAllowedActions: jest.fn(),
  }
}

function createMockConnectorResponse(overrides?: {
  type?: string
  enabled?: boolean
  lastTestOk?: boolean | null
  lastTestAt?: Date | null
  lastError?: string | null
}) {
  const hasLastTestOk = overrides !== undefined && 'lastTestOk' in overrides
  const hasLastTestAt = overrides !== undefined && 'lastTestAt' in overrides
  const hasLastError = overrides !== undefined && 'lastError' in overrides

  return {
    type: overrides?.type ?? CONNECTOR_TYPE,
    enabled: overrides?.enabled ?? true,
    lastTestOk: hasLastTestOk ? overrides.lastTestOk : true,
    lastTestAt: hasLastTestAt ? overrides.lastTestAt : toDay('2025-01-15T10:00:00Z').toDate(),
    lastError: hasLastError ? overrides.lastError : null,
  }
}

const mockConfig: Record<string, unknown> = {
  baseUrl: 'https://wazuh.local:55000',
  username: 'admin',
  password: 'secret',
}

const mockSummaryCards: WorkspaceSummaryCard[] = [
  { key: 'agents', label: 'Active Agents', value: 42 },
  { key: 'alerts', label: 'Alerts Today', value: 128, change: '+12%' },
]

const mockRecentItems: WorkspaceRecentItem[] = [
  {
    id: 'item-1',
    title: 'Agent disconnected',
    timestamp: '2025-01-15T10:00:00Z',
    severity: 'high' as never,
  },
  {
    id: 'item-2',
    title: 'New vulnerability detected',
    timestamp: '2025-01-15T09:30:00Z',
    severity: 'medium' as never,
  },
]

const mockEntities: WorkspaceEntity[] = [
  { id: 'agent-1', name: 'server-01', status: 'active', type: 'agent' },
  { id: 'agent-2', name: 'server-02', status: 'disconnected', type: 'agent' },
]

const mockQuickActions: WorkspaceQuickAction[] = [
  { key: 'restart', label: 'Restart Agent', description: 'Restart selected agent' },
  { key: 'scan', label: 'Run Scan', description: 'Run vulnerability scan' },
]

function createService(
  connectorsService: ReturnType<typeof createMockConnectorsService>,
  factory: ReturnType<typeof createMockFactory>
) {
  return new ConnectorWorkspacesService(
    connectorsService as never,
    factory as never,
    mockAppLogger as never
  )
}

describe('ConnectorWorkspacesService', () => {
  let connectorsService: ReturnType<typeof createMockConnectorsService>
  let factory: ReturnType<typeof createMockFactory>
  let strategy: ReturnType<typeof createMockStrategy>
  let service: ConnectorWorkspacesService

  beforeEach(() => {
    jest.clearAllMocks()
    connectorsService = createMockConnectorsService()
    factory = createMockFactory()
    strategy = createMockStrategy()
    service = createService(connectorsService, factory)
  })

  /**
   * Sets up the happy-path mocks: factory has the strategy, connector is
   * configured and enabled, and findByType returns metadata.
   */
  function setupHappyPath(connectorOverrides?: Parameters<typeof createMockConnectorResponse>[0]) {
    factory.hasStrategy.mockReturnValue(true)
    factory.getStrategy.mockReturnValue(strategy)
    connectorsService.getDecryptedConfig.mockResolvedValue(mockConfig)
    connectorsService.findByType.mockResolvedValue(createMockConnectorResponse(connectorOverrides))
  }

  /* ------------------------------------------------------------------ */
  /* resolveConnector — error cases                                      */
  /* ------------------------------------------------------------------ */

  describe('resolveConnector (shared error paths)', () => {
    it('should throw 400 when connector type is unsupported', async () => {
      factory.hasStrategy.mockReturnValue(false)

      await expect(service.getOverview(TENANT_ID, 'unsupported')).rejects.toThrow(BusinessException)

      try {
        await service.getOverview(TENANT_ID, 'unsupported')
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).message).toContain('Unsupported connector type')
        expect((error as BusinessException).messageKey).toBe(
          'errors.connectorWorkspaces.unsupportedType'
        )
      }
    })

    it('should throw 404 when connector is not configured or not enabled', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.getOverview(TENANT_ID, CONNECTOR_TYPE)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.getOverview(TENANT_ID, CONNECTOR_TYPE)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
        expect((error as BusinessException).message).toContain('not configured or not enabled')
        expect((error as BusinessException).messageKey).toBe(
          'errors.connectorWorkspaces.notConfigured'
        )
      }
    })

    it('should log warning when connector type is unsupported', async () => {
      factory.hasStrategy.mockReturnValue(false)

      await expect(service.getOverview(TENANT_ID, 'unsupported')).rejects.toThrow(BusinessException)

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Unsupported connector type requested',
        expect.objectContaining({
          metadata: expect.objectContaining({ connectorType: 'unsupported' }),
        })
      )
    })

    it('should log warning when connector is not configured', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.getOverview(TENANT_ID, CONNECTOR_TYPE)).rejects.toThrow(
        BusinessException
      )

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Connector not configured or not enabled',
        expect.objectContaining({
          metadata: expect.objectContaining({ connectorType: CONNECTOR_TYPE }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getStrategyOrThrow — error case                                     */
  /* ------------------------------------------------------------------ */

  describe('getStrategyOrThrow (no strategy found)', () => {
    it('should throw 400 when factory returns no strategy', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(mockConfig)
      connectorsService.findByType.mockResolvedValue(createMockConnectorResponse())
      factory.getStrategy.mockReturnValue(undefined)

      await expect(service.getOverview(TENANT_ID, CONNECTOR_TYPE)).rejects.toThrow(
        BusinessException
      )

      try {
        factory.getStrategy.mockReturnValue(undefined)
        await service.getOverview(TENANT_ID, CONNECTOR_TYPE)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
        expect((error as BusinessException).message).toContain('No workspace strategy')
        expect((error as BusinessException).messageKey).toBe(
          'errors.connectorWorkspaces.unsupportedType'
        )
      }
    })

    it('should log warning when no strategy is found', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(mockConfig)
      connectorsService.findByType.mockResolvedValue(createMockConnectorResponse())
      factory.getStrategy.mockReturnValue(undefined)

      await expect(service.getOverview(TENANT_ID, CONNECTOR_TYPE)).rejects.toThrow(
        BusinessException
      )

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'No workspace strategy found for connector type',
        expect.objectContaining({
          metadata: expect.objectContaining({ connectorType: CONNECTOR_TYPE }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* deriveStatus                                                        */
  /* ------------------------------------------------------------------ */

  describe('deriveStatus (via getOverview connector info)', () => {
    it('should return "disabled" when connector is not enabled', async () => {
      setupHappyPath({ enabled: false, lastTestOk: true })
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      const result = await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(result.connector.status).toBe('disabled')
      expect(result.connector.enabled).toBe(false)
    })

    it('should return "connected" when enabled and lastTestOk is true', async () => {
      setupHappyPath({ enabled: true, lastTestOk: true })
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      const result = await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(result.connector.status).toBe('connected')
    })

    it('should return "disconnected" when enabled and lastTestOk is false', async () => {
      setupHappyPath({ enabled: true, lastTestOk: false })
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      const result = await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(result.connector.status).toBe('disconnected')
    })

    it('should return "not_tested" when enabled and lastTestOk is null', async () => {
      setupHappyPath({ enabled: true, lastTestOk: null })
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      const result = await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(result.connector.status).toBe('not_tested')
    })
  })

  /* ------------------------------------------------------------------ */
  /* getOverview                                                         */
  /* ------------------------------------------------------------------ */

  describe('getOverview', () => {
    it('should return full overview with connector info and strategy data', async () => {
      setupHappyPath()
      strategy.getOverview.mockResolvedValue({
        summaryCards: mockSummaryCards,
        recentItems: mockRecentItems,
        entitiesPreview: mockEntities,
        quickActions: mockQuickActions,
        metadata: { version: '4.9.0' },
      })

      const result = await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(result.connector.type).toBe(CONNECTOR_TYPE)
      expect(result.connector.status).toBe('connected')
      expect(result.connector.enabled).toBe(true)
      expect(result.connector.lastTestedAt).toBe('2025-01-15T10:00:00.000Z')
      expect(result.connector.latencyMs).toBeNull()
      expect(result.connector.healthMessage).toBeNull()
      expect(result.summaryCards).toEqual(mockSummaryCards)
      expect(result.recentItems).toEqual(mockRecentItems)
      expect(result.entitiesPreview).toEqual(mockEntities)
      expect(result.quickActions).toEqual(mockQuickActions)
      expect(result.metadata).toEqual({ version: '4.9.0' })
    })

    it('should set lastTestedAt to null when lastTestAt is null', async () => {
      setupHappyPath({ lastTestAt: null })
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      const result = await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(result.connector.lastTestedAt).toBeNull()
    })

    it('should include healthMessage from connector lastError', async () => {
      setupHappyPath({ lastError: 'Connection timeout after 30s' })
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      const result = await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(result.connector.healthMessage).toBe('Connection timeout after 30s')
    })

    it('should call strategy.getOverview with the decrypted config', async () => {
      setupHappyPath()
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(strategy.getOverview).toHaveBeenCalledWith(mockConfig)
    })

    it('should log debug message when fetching overview', async () => {
      setupHappyPath()
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Fetching connector workspace getOverview',
        expect.objectContaining({
          action: 'getOverview',
          tenantId: TENANT_ID,
          metadata: { connectorType: CONNECTOR_TYPE },
        })
      )
    })

    it('should call connectorsService.getDecryptedConfig with tenantId and type', async () => {
      setupHappyPath()
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(connectorsService.getDecryptedConfig).toHaveBeenCalledWith(TENANT_ID, CONNECTOR_TYPE)
    })

    it('should call connectorsService.findByType with tenantId and type', async () => {
      setupHappyPath()
      strategy.getOverview.mockResolvedValue({
        summaryCards: [],
        recentItems: [],
        entitiesPreview: [],
        quickActions: [],
      })

      await service.getOverview(TENANT_ID, CONNECTOR_TYPE)

      expect(connectorsService.findByType).toHaveBeenCalledWith(TENANT_ID, CONNECTOR_TYPE)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getRecentActivity                                                   */
  /* ------------------------------------------------------------------ */

  describe('getRecentActivity', () => {
    const page = 1
    const pageSize = 20

    it('should return paginated recent activity from strategy', async () => {
      setupHappyPath()
      const expectedResponse: WorkspaceRecentActivityResponse = {
        items: mockRecentItems,
        total: 50,
        page,
        pageSize,
      }
      strategy.getRecentActivity.mockResolvedValue(expectedResponse)

      const result = await service.getRecentActivity(TENANT_ID, CONNECTOR_TYPE, page, pageSize)

      expect(result).toEqual(expectedResponse)
      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(50)
      expect(result.page).toBe(page)
      expect(result.pageSize).toBe(pageSize)
    })

    it('should call strategy.getRecentActivity with config, page, and pageSize', async () => {
      setupHappyPath()
      strategy.getRecentActivity.mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 10,
      })

      await service.getRecentActivity(TENANT_ID, CONNECTOR_TYPE, 2, 10)

      expect(strategy.getRecentActivity).toHaveBeenCalledWith(mockConfig, 2, 10)
    })

    it('should log debug message for recent activity', async () => {
      setupHappyPath()
      strategy.getRecentActivity.mockResolvedValue({
        items: [],
        total: 0,
        page,
        pageSize,
      })

      await service.getRecentActivity(TENANT_ID, CONNECTOR_TYPE, page, pageSize)

      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Fetching connector workspace getRecentActivity',
        expect.objectContaining({
          action: 'getRecentActivity',
          tenantId: TENANT_ID,
          metadata: { connectorType: CONNECTOR_TYPE, page, pageSize },
        })
      )
    })

    it('should throw 400 for unsupported connector type', async () => {
      factory.hasStrategy.mockReturnValue(false)

      await expect(
        service.getRecentActivity(TENANT_ID, 'unsupported', page, pageSize)
      ).rejects.toThrow(BusinessException)

      try {
        await service.getRecentActivity(TENANT_ID, 'unsupported', page, pageSize)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should throw 404 when connector is not configured', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(
        service.getRecentActivity(TENANT_ID, CONNECTOR_TYPE, page, pageSize)
      ).rejects.toThrow(BusinessException)

      try {
        await service.getRecentActivity(TENANT_ID, CONNECTOR_TYPE, page, pageSize)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* getEntities                                                         */
  /* ------------------------------------------------------------------ */

  describe('getEntities', () => {
    const page = 1
    const pageSize = 25

    it('should return paginated entities from strategy', async () => {
      setupHappyPath()
      const expectedResponse: WorkspaceEntitiesResponse = {
        entities: mockEntities,
        total: 100,
        page,
        pageSize,
      }
      strategy.getEntities.mockResolvedValue(expectedResponse)

      const result = await service.getEntities(TENANT_ID, CONNECTOR_TYPE, page, pageSize)

      expect(result).toEqual(expectedResponse)
      expect(result.entities).toHaveLength(2)
      expect(result.total).toBe(100)
    })

    it('should call strategy.getEntities with config, page, and pageSize', async () => {
      setupHappyPath()
      strategy.getEntities.mockResolvedValue({
        entities: [],
        total: 0,
        page: 3,
        pageSize: 50,
      })

      await service.getEntities(TENANT_ID, CONNECTOR_TYPE, 3, 50)

      expect(strategy.getEntities).toHaveBeenCalledWith(mockConfig, 3, 50)
    })

    it('should log debug message for entities', async () => {
      setupHappyPath()
      strategy.getEntities.mockResolvedValue({
        entities: [],
        total: 0,
        page,
        pageSize,
      })

      await service.getEntities(TENANT_ID, CONNECTOR_TYPE, page, pageSize)

      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Fetching connector workspace getEntities',
        expect.objectContaining({
          action: 'getEntities',
          tenantId: TENANT_ID,
          metadata: { connectorType: CONNECTOR_TYPE, page, pageSize },
        })
      )
    })

    it('should throw 400 for unsupported connector type', async () => {
      factory.hasStrategy.mockReturnValue(false)

      await expect(service.getEntities(TENANT_ID, 'unsupported', page, pageSize)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.getEntities(TENANT_ID, 'unsupported', page, pageSize)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should throw 404 when connector is not configured', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.getEntities(TENANT_ID, CONNECTOR_TYPE, page, pageSize)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.getEntities(TENANT_ID, CONNECTOR_TYPE, page, pageSize)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should return empty entities when strategy returns none', async () => {
      setupHappyPath()
      strategy.getEntities.mockResolvedValue({
        entities: [],
        total: 0,
        page,
        pageSize,
      })

      const result = await service.getEntities(TENANT_ID, CONNECTOR_TYPE, page, pageSize)

      expect(result.entities).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* search                                                              */
  /* ------------------------------------------------------------------ */

  describe('search', () => {
    const searchRequest: WorkspaceSearchRequest = {
      query: 'failed login',
      filters: { severity: 'high' },
      page: 1,
      pageSize: 20,
      from: '2025-01-01T00:00:00Z',
      to: '2025-01-15T23:59:59Z',
    }

    it('should return search results from strategy', async () => {
      setupHappyPath()
      const expectedResponse: WorkspaceSearchResponse = {
        results: mockRecentItems,
        total: 2,
        page: 1,
        pageSize: 20,
      }
      strategy.search.mockResolvedValue(expectedResponse)

      const result = await service.search(TENANT_ID, CONNECTOR_TYPE, searchRequest)

      expect(result).toEqual(expectedResponse)
      expect(result.results).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should call strategy.search with config and request', async () => {
      setupHappyPath()
      strategy.search.mockResolvedValue({
        results: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })

      await service.search(TENANT_ID, CONNECTOR_TYPE, searchRequest)

      expect(strategy.search).toHaveBeenCalledWith(mockConfig, searchRequest)
    })

    it('should log debug message for search', async () => {
      setupHappyPath()
      strategy.search.mockResolvedValue({
        results: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })

      await service.search(TENANT_ID, CONNECTOR_TYPE, searchRequest)

      expect(mockAppLogger.debug).toHaveBeenCalledWith(
        'Fetching connector workspace search',
        expect.objectContaining({
          action: 'search',
          tenantId: TENANT_ID,
          metadata: { connectorType: CONNECTOR_TYPE, query: 'failed login' },
        })
      )
    })

    it('should throw 400 for unsupported connector type', async () => {
      factory.hasStrategy.mockReturnValue(false)

      await expect(service.search(TENANT_ID, 'unsupported', searchRequest)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.search(TENANT_ID, 'unsupported', searchRequest)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should throw 404 when connector is not configured', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.search(TENANT_ID, CONNECTOR_TYPE, searchRequest)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.search(TENANT_ID, CONNECTOR_TYPE, searchRequest)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should handle search with minimal request (query only)', async () => {
      setupHappyPath()
      const minimalRequest: WorkspaceSearchRequest = { query: 'test' }
      strategy.search.mockResolvedValue({
        results: [],
        total: 0,
        page: 1,
        pageSize: 20,
      })

      await service.search(TENANT_ID, CONNECTOR_TYPE, minimalRequest)

      expect(strategy.search).toHaveBeenCalledWith(mockConfig, minimalRequest)
    })
  })

  /* ------------------------------------------------------------------ */
  /* executeAction                                                       */
  /* ------------------------------------------------------------------ */

  describe('executeAction', () => {
    const actionName = 'restart'
    const actionParameters: Record<string, unknown> = { agentId: 'agent-001' }

    it('should execute action and return response when action is allowed', async () => {
      setupHappyPath()
      strategy.getAllowedActions.mockReturnValue(['restart', 'scan', 'update'])
      const expectedResponse: WorkspaceActionResponse = {
        success: true,
        message: 'Agent restarted successfully',
        data: { agentId: 'agent-001', newStatus: 'restarting' },
      }
      strategy.executeAction.mockResolvedValue(expectedResponse)

      const result = await service.executeAction(
        TENANT_ID,
        CONNECTOR_TYPE,
        actionName,
        actionParameters
      )

      expect(result).toEqual(expectedResponse)
      expect(result.success).toBe(true)
      expect(result.message).toBe('Agent restarted successfully')
    })

    it('should call strategy.executeAction with config, action, and params', async () => {
      setupHappyPath()
      strategy.getAllowedActions.mockReturnValue(['restart'])
      strategy.executeAction.mockResolvedValue({
        success: true,
        message: 'Done',
      })

      await service.executeAction(TENANT_ID, CONNECTOR_TYPE, actionName, actionParameters)

      expect(strategy.executeAction).toHaveBeenCalledWith(mockConfig, actionName, actionParameters)
    })

    it('should throw 403 when action is not in the allowlist', async () => {
      setupHappyPath()
      strategy.getAllowedActions.mockReturnValue(['scan', 'update'])

      await expect(
        service.executeAction(TENANT_ID, CONNECTOR_TYPE, 'deleteAll', actionParameters)
      ).rejects.toThrow(BusinessException)

      try {
        await service.executeAction(TENANT_ID, CONNECTOR_TYPE, 'deleteAll', actionParameters)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(403)
        expect((error as BusinessException).message).toContain("Action 'deleteAll' is not allowed")
        expect((error as BusinessException).messageKey).toBe(
          'errors.connectorWorkspaces.actionNotAllowed'
        )
      }
    })

    it('should log warning when action is denied', async () => {
      setupHappyPath()
      strategy.getAllowedActions.mockReturnValue(['scan'])

      await expect(
        service.executeAction(TENANT_ID, CONNECTOR_TYPE, 'forbidden', actionParameters)
      ).rejects.toThrow(BusinessException)

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'Workspace action denied — not in allowlist',
        expect.objectContaining({
          action: 'executeAction',
          metadata: expect.objectContaining({
            connectorType: CONNECTOR_TYPE,
            requestedAction: 'forbidden',
          }),
        })
      )
    })

    it('should log info when action is executed successfully', async () => {
      setupHappyPath()
      strategy.getAllowedActions.mockReturnValue(['restart'])
      strategy.executeAction.mockResolvedValue({ success: true, message: 'Done' })

      await service.executeAction(TENANT_ID, CONNECTOR_TYPE, actionName, actionParameters)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'Executing workspace action',
        expect.objectContaining({
          action: 'executeAction',
          metadata: expect.objectContaining({
            connectorType: CONNECTOR_TYPE,
            executedAction: actionName,
          }),
        })
      )
    })

    it('should throw 400 for unsupported connector type', async () => {
      factory.hasStrategy.mockReturnValue(false)

      await expect(
        service.executeAction(TENANT_ID, 'unsupported', actionName, actionParameters)
      ).rejects.toThrow(BusinessException)

      try {
        await service.executeAction(TENANT_ID, 'unsupported', actionName, actionParameters)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should throw 404 when connector is not configured', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(
        service.executeAction(TENANT_ID, CONNECTOR_TYPE, actionName, actionParameters)
      ).rejects.toThrow(BusinessException)

      try {
        await service.executeAction(TENANT_ID, CONNECTOR_TYPE, actionName, actionParameters)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw 403 when allowed actions list is empty', async () => {
      setupHappyPath()
      strategy.getAllowedActions.mockReturnValue([])

      await expect(
        service.executeAction(TENANT_ID, CONNECTOR_TYPE, actionName, actionParameters)
      ).rejects.toThrow(BusinessException)

      try {
        await service.executeAction(TENANT_ID, CONNECTOR_TYPE, actionName, actionParameters)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(403)
      }
    })

    it('should pass empty params when no params are provided', async () => {
      setupHappyPath()
      strategy.getAllowedActions.mockReturnValue(['restart'])
      strategy.executeAction.mockResolvedValue({ success: true, message: 'Done' })

      const emptyParameters: Record<string, unknown> = {}
      await service.executeAction(TENANT_ID, CONNECTOR_TYPE, actionName, emptyParameters)

      expect(strategy.executeAction).toHaveBeenCalledWith(mockConfig, actionName, emptyParameters)
    })
  })

  /* ------------------------------------------------------------------ */
  /* Integration-style: method + resolveConnector + getStrategyOrThrow   */
  /* ------------------------------------------------------------------ */

  describe('full resolution flow', () => {
    it('should call factory.hasStrategy before getDecryptedConfig', async () => {
      factory.hasStrategy.mockReturnValue(false)

      await expect(service.getOverview(TENANT_ID, CONNECTOR_TYPE)).rejects.toThrow(
        BusinessException
      )

      expect(factory.hasStrategy).toHaveBeenCalledWith(CONNECTOR_TYPE)
      expect(connectorsService.getDecryptedConfig).not.toHaveBeenCalled()
    })

    it('should call getDecryptedConfig before findByType', async () => {
      factory.hasStrategy.mockReturnValue(true)
      connectorsService.getDecryptedConfig.mockResolvedValue(null)

      await expect(service.getOverview(TENANT_ID, CONNECTOR_TYPE)).rejects.toThrow(
        BusinessException
      )

      expect(connectorsService.getDecryptedConfig).toHaveBeenCalledWith(TENANT_ID, CONNECTOR_TYPE)
      expect(connectorsService.findByType).not.toHaveBeenCalled()
    })

    it('should call factory.getStrategy after resolveConnector succeeds', async () => {
      setupHappyPath()
      factory.getStrategy.mockReturnValue(undefined)

      await expect(service.getOverview(TENANT_ID, CONNECTOR_TYPE)).rejects.toThrow(
        BusinessException
      )

      expect(factory.getStrategy).toHaveBeenCalledWith(CONNECTOR_TYPE)
    })

    it('should propagate strategy errors without catching them', async () => {
      setupHappyPath()
      const strategyError = new Error('External API failure')
      strategy.getOverview.mockRejectedValue(strategyError)

      await expect(service.getOverview(TENANT_ID, CONNECTOR_TYPE)).rejects.toThrow(
        'External API failure'
      )
    })

    it('should propagate strategy errors for getRecentActivity', async () => {
      setupHappyPath()
      strategy.getRecentActivity.mockRejectedValue(new Error('Timeout'))

      await expect(service.getRecentActivity(TENANT_ID, CONNECTOR_TYPE, 1, 20)).rejects.toThrow(
        'Timeout'
      )
    })

    it('should propagate strategy errors for getEntities', async () => {
      setupHappyPath()
      strategy.getEntities.mockRejectedValue(new Error('Service unavailable'))

      await expect(service.getEntities(TENANT_ID, CONNECTOR_TYPE, 1, 20)).rejects.toThrow(
        'Service unavailable'
      )
    })

    it('should propagate strategy errors for search', async () => {
      setupHappyPath()
      strategy.search.mockRejectedValue(new Error('Query parse error'))

      await expect(
        service.search(TENANT_ID, CONNECTOR_TYPE, { query: 'bad query' })
      ).rejects.toThrow('Query parse error')
    })

    it('should propagate strategy errors for executeAction', async () => {
      setupHappyPath()
      strategy.getAllowedActions.mockReturnValue(['restart'])
      strategy.executeAction.mockRejectedValue(new Error('Agent not found'))

      await expect(service.executeAction(TENANT_ID, CONNECTOR_TYPE, 'restart', {})).rejects.toThrow(
        'Agent not found'
      )
    })
  })
})
