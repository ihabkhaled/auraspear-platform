jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { BusinessException } from '../../src/common/exceptions/business.exception'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import { AiService } from '../../src/modules/ai/ai.service'
import type { JwtPayload } from '../../src/common/interfaces/authenticated-request.interface'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockConnectorsService = {
  getDecryptedConfig: jest.fn().mockResolvedValue(null),
}

const mockBedrockService = { invoke: jest.fn() }
const mockLlmApisService = { invoke: jest.fn() }
const mockOpenClawGatewayService = { invoke: jest.fn() }

const mockLlmConnectorsService = {
  hasEnabledConnectors: jest.fn().mockResolvedValue(false),
  getEnabledConfigs: jest.fn().mockResolvedValue([]),
}

const mockPromptRegistryService = {
  getActivePrompt: jest.fn().mockResolvedValue('You are a SOC analyst.\n\n{{context}}'),
}

const mockFeatureCatalogService = {
  getConfig: jest.fn().mockResolvedValue({
    enabled: true,
    preferredProvider: null,
    maxTokens: 2048,
    approvalLevel: 'none',
    monthlyTokenBudget: null,
  }),
}

const mockUsageBudgetService = {
  checkBudget: jest.fn().mockResolvedValue({ allowed: true, used: 0, budget: 100000 }),
  recordUsage: jest.fn(),
}

const mockAgentConfigService = {
  getAgentConfig: jest.fn().mockResolvedValue({
    isEnabled: true,
    providerMode: 'default',
    temperature: 0.5,
    maxTokensPerCall: 2048,
    systemPrompt: null,
    promptSuffix: null,
    indexPatterns: [],
    osintSources: [],
    tokensPerHour: 50000,
    tokensPerDay: 500000,
    tokensPerMonth: 5000000,
    tokensUsedHour: 0,
    tokensUsedDay: 0,
    tokensUsedMonth: 0,
  }),
  incrementUsage: jest.fn(),
}

const mockOsintExecutorService = {
  enrichBySourceIds: jest.fn().mockResolvedValue({ results: [] }),
}

const mockUser: JwtPayload = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  email: 'test@test.com',
  role: UserRole.SOC_ANALYST_L1,
  tenantSlug: 'test-tenant',
}

function createMockRepository() {
  return {
    findEnabledConnectorByTypes: jest.fn().mockResolvedValue([]),
    createAuditLog: jest.fn(),
    findAlertByIdAndTenant: jest.fn(),
    findRelatedAlerts: jest.fn().mockResolvedValue([]),
  }
}

function createService(repository: ReturnType<typeof createMockRepository>) {
  return new AiService(
    repository as never,
    mockAppLogger as never,
    mockConnectorsService as never,
    mockLlmConnectorsService as never,
    mockBedrockService as never,
    mockLlmApisService as never,
    mockOpenClawGatewayService as never,
    mockPromptRegistryService as never,
    mockFeatureCatalogService as never,
    mockUsageBudgetService as never,
    mockAgentConfigService as never,
    mockOsintExecutorService as never
  )
}

describe('AiService', () => {
  let repository: ReturnType<typeof createMockRepository>
  let service: AiService

  beforeEach(() => {
    jest.clearAllMocks()
    mockConnectorsService.getDecryptedConfig.mockResolvedValue(null)
    mockLlmApisService.invoke.mockReset()
    mockBedrockService.invoke.mockReset()
    mockOpenClawGatewayService.invoke.mockReset()
    mockFeatureCatalogService.getConfig.mockResolvedValue({
      enabled: true,
      preferredProvider: null,
      maxTokens: 2048,
      approvalLevel: 'none',
      monthlyTokenBudget: null,
    })
    mockAgentConfigService.getAgentConfig.mockResolvedValue({
      isEnabled: true,
      providerMode: 'default',
      temperature: 0.5,
      maxTokensPerCall: 2048,
      systemPrompt: null,
      promptSuffix: null,
      indexPatterns: [],
      osintSources: [],
      tokensPerHour: 50000,
      tokensPerDay: 500000,
      tokensPerMonth: 5000000,
      tokensUsedHour: 0,
      tokensUsedDay: 0,
      tokensUsedMonth: 0,
    })
    repository = createMockRepository()
    service = createService(repository)
  })

  describe('aiHunt', () => {
    it('should return fallback response when no connectors available', async () => {
      const response = await service.aiHunt({ query: 'lateral movement detection' }, mockUser)
      expect(response).toBeDefined()
      expect(response.result).toBeDefined()
      expect(response.model).toBeDefined()
      expect(response.reasoning).toBeInstanceOf(Array)
      expect(response.reasoning.length).toBeGreaterThan(0)
    })

    it('should throw when feature is disabled', async () => {
      mockFeatureCatalogService.getConfig.mockResolvedValue({
        enabled: false,
        preferredProvider: null,
        maxTokens: 2048,
        approvalLevel: 'none',
        monthlyTokenBudget: null,
      })

      await expect(service.aiHunt({ query: 'test query' }, mockUser)).rejects.toThrow(
        BusinessException
      )
    })

    it('should throw when agent is disabled', async () => {
      mockAgentConfigService.getAgentConfig.mockResolvedValue({
        isEnabled: false,
        providerMode: 'default',
        temperature: 0.5,
        maxTokensPerCall: 2048,
        systemPrompt: null,
        promptSuffix: null,
        indexPatterns: [],
        osintSources: [],
        tokensPerHour: 50000,
        tokensPerDay: 500000,
        tokensPerMonth: 5000000,
        tokensUsedHour: 0,
        tokensUsedDay: 0,
        tokensUsedMonth: 0,
      })

      await expect(service.aiHunt({ query: 'test query' }, mockUser)).rejects.toThrow(
        BusinessException
      )
    })
  })

  describe('aiInvestigate', () => {
    it('should throw when alert not found', async () => {
      repository.findAlertByIdAndTenant.mockResolvedValue(null)

      await expect(service.aiInvestigate({ alertId: 'alert-1' }, mockUser)).rejects.toThrow()
    })
  })

  describe('aiExplain', () => {
    it('should return response for explain request', async () => {
      const response = await service.aiExplain(
        { prompt: 'What is a brute force attack?' },
        mockUser
      )
      expect(response).toBeDefined()
      expect(response.result).toBeDefined()
      expect(response.model).toBeDefined()
    })

    it('should throw when feature is disabled', async () => {
      mockFeatureCatalogService.getConfig.mockResolvedValue({
        enabled: false,
        preferredProvider: null,
        maxTokens: 2048,
        approvalLevel: 'none',
        monthlyTokenBudget: null,
      })

      await expect(service.aiExplain({ prompt: 'test' }, mockUser)).rejects.toThrow(
        BusinessException
      )
    })
  })

  describe('resolveConnectorLabel', () => {
    it('should return default for undefined connector', async () => {
      const result = await service.resolveConnectorLabel('tenant-1', undefined)
      expect(result.providerLabel).toBe('default')
    })

    it('should return default for "default" connector key', async () => {
      const result = await service.resolveConnectorLabel('tenant-1', 'default')
      expect(result.providerLabel).toBe('default')
    })
  })
})
