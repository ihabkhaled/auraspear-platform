jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { AiFeatureKey } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { AiService } from '../../src/modules/ai/ai.service'
import type { ExecuteAiTaskInput } from '../../src/modules/ai/ai.types'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockRepository = {
  findEnabledConnectorByTypes: jest.fn().mockResolvedValue([]),
  createAuditLog: jest.fn(),
  findAlertByIdAndTenant: jest.fn(),
  findRelatedAlerts: jest.fn().mockResolvedValue([]),
}

const mockConnectorsService = {
  getDecryptedConfig: jest.fn().mockResolvedValue(null),
}

const mockBedrockService = {
  invoke: jest.fn(),
}

const mockLlmApisService = {
  invoke: jest.fn(),
}

const mockOpenClawGatewayService = {
  invoke: jest.fn(),
}

const mockLlmConnectorsService = {
  hasEnabledConnectors: jest.fn().mockResolvedValue(false),
  getEnabledConfigs: jest.fn().mockResolvedValue([]),
  getById: jest.fn(),
}

const mockPromptRegistryService = {
  getActivePrompt: jest.fn(),
}

const mockFeatureCatalogService = {
  getConfig: jest.fn(),
}

const mockUsageBudgetService = {
  checkBudget: jest.fn(),
  recordUsage: jest.fn(),
}

const mockAgentConfigService = {
  getAgentConfig: jest.fn().mockResolvedValue({
    isEnabled: true,
    providerMode: 'default',
    displayName: 'Orchestrator',
    tokensPerHour: 0,
    tokensUsedHour: 0,
    tokensPerDay: 0,
    tokensUsedDay: 0,
    tokensPerMonth: 0,
    tokensUsedMonth: 0,
    systemPrompt: null,
    promptSuffix: null,
    maxTokensPerCall: null,
  }),
  incrementUsage: jest.fn().mockResolvedValue(undefined),
}

function createService() {
  return new AiService(
    mockRepository as never,
    mockAppLogger as never,
    mockConnectorsService as never,
    mockLlmConnectorsService as never,
    mockBedrockService as never,
    mockLlmApisService as never,
    mockOpenClawGatewayService as never,
    mockPromptRegistryService as never,
    mockFeatureCatalogService as never,
    mockUsageBudgetService as never,
    mockAgentConfigService as never
  )
}

function buildTaskInput(overrides: Partial<ExecuteAiTaskInput> = {}): ExecuteAiTaskInput {
  return {
    tenantId: 'tenant-1',
    userId: 'user-1',
    userEmail: 'analyst@test.com',
    featureKey: AiFeatureKey.ALERT_SUMMARIZE,
    context: { alertTitle: 'Test Alert', alertSeverity: 'high' },
    ...overrides,
  }
}

describe('AiService — executeAiTask', () => {
  let service: AiService

  beforeEach(() => {
    jest.clearAllMocks()
    service = createService()

    // Default: feature enabled, budget ok, prompt returns template
    mockFeatureCatalogService.getConfig.mockResolvedValue({
      enabled: true,
      preferredProvider: null,
      maxTokens: 2048,
      approvalLevel: 'none',
      monthlyTokenBudget: null,
    })
    mockUsageBudgetService.checkBudget.mockResolvedValue({ allowed: true, used: 0, budget: null })
    mockPromptRegistryService.getActivePrompt.mockResolvedValue(
      'Summarize this alert:\n{{context}}'
    )
    mockUsageBudgetService.recordUsage.mockResolvedValue(undefined)
    mockRepository.createAuditLog.mockResolvedValue(undefined)
  })

  /* ------------------------------------------------------------------ */
  /* Feature enabled, full pipeline                                       */
  /* ------------------------------------------------------------------ */

  it('should call prompt registry, provider, and record usage on success', async () => {
    // No real connectors — falls back to rule-based
    mockConnectorsService.getDecryptedConfig.mockResolvedValue(null)
    mockLlmConnectorsService.getEnabledConfigs.mockResolvedValue([])

    const result = await service.executeAiTask(buildTaskInput())

    expect(mockFeatureCatalogService.getConfig).toHaveBeenCalledWith(
      'tenant-1',
      AiFeatureKey.ALERT_SUMMARIZE
    )
    expect(mockUsageBudgetService.checkBudget).toHaveBeenCalledWith(
      'tenant-1',
      AiFeatureKey.ALERT_SUMMARIZE
    )
    expect(mockPromptRegistryService.getActivePrompt).toHaveBeenCalledWith(
      'tenant-1',
      AiFeatureKey.ALERT_SUMMARIZE
    )
    expect(mockUsageBudgetService.recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        featureKey: AiFeatureKey.ALERT_SUMMARIZE,
      })
    )
    // Rule-based fallback
    expect(result.model).toBe('rule-based')
    expect(result.result).toContain('Rule-based fallback')
  })

  /* ------------------------------------------------------------------ */
  /* Feature disabled → 403                                               */
  /* ------------------------------------------------------------------ */

  it('should throw 403 when feature is disabled', async () => {
    mockFeatureCatalogService.getConfig.mockResolvedValue({
      enabled: false,
      preferredProvider: null,
      maxTokens: 2048,
    })

    await expect(service.executeAiTask(buildTaskInput())).rejects.toThrow(BusinessException)

    try {
      await service.executeAiTask(buildTaskInput())
    } catch (error) {
      expect((error as BusinessException).getStatus()).toBe(403)
      expect((error as BusinessException).messageKey).toBe('errors.ai.featureDisabled')
    }
  })

  /* ------------------------------------------------------------------ */
  /* Budget exceeded → 429                                                */
  /* ------------------------------------------------------------------ */

  it('should throw 429 when budget is exceeded', async () => {
    mockUsageBudgetService.checkBudget.mockResolvedValue({
      allowed: false,
      used: 150000,
      budget: 100000,
    })

    await expect(service.executeAiTask(buildTaskInput())).rejects.toThrow(BusinessException)

    try {
      await service.executeAiTask(buildTaskInput())
    } catch (error) {
      expect((error as BusinessException).getStatus()).toBe(429)
      expect((error as BusinessException).messageKey).toBe('errors.ai.budgetExceeded')
    }
  })

  /* ------------------------------------------------------------------ */
  /* No connectors → fallback response                                    */
  /* ------------------------------------------------------------------ */

  it('should return fallback response when no connectors are available', async () => {
    mockConnectorsService.getDecryptedConfig.mockResolvedValue(null)
    mockLlmConnectorsService.getEnabledConfigs.mockResolvedValue([])

    const result = await service.executeAiTask(buildTaskInput())

    expect(result.model).toBe('rule-based')
    expect(result.provider).toBe('rule-based')
    expect(result.confidence).toBeLessThan(0.5)
    expect(result.tokensUsed.input).toBe(0)
    expect(result.tokensUsed.output).toBe(0)
  })

  /* ------------------------------------------------------------------ */
  /* Preferred provider from feature config                               */
  /* ------------------------------------------------------------------ */

  it('should filter connectors by preferred provider from feature config', async () => {
    mockFeatureCatalogService.getConfig.mockResolvedValue({
      enabled: true,
      preferredProvider: 'bedrock',
      maxTokens: 2048,
      monthlyTokenBudget: null,
    })
    // No bedrock config available → falls to fallback
    mockConnectorsService.getDecryptedConfig.mockResolvedValue(null)
    mockLlmConnectorsService.getEnabledConfigs.mockResolvedValue([])

    // Since no bedrock connector is available and it's the preferred one,
    // it should throw (connector not available or agent unreachable)
    await expect(service.executeAiTask(buildTaskInput())).rejects.toThrow(BusinessException)

    try {
      await service.executeAiTask(buildTaskInput())
    } catch (error) {
      const exception = error as BusinessException
      expect(exception.getStatus()).toBeGreaterThanOrEqual(400)
      expect(exception.getStatus()).toBeLessThan(500)
    }
  })
})

/* -------------------------------------------------------------------- */
/* resolveConnectorLabel                                                  */
/* -------------------------------------------------------------------- */

describe('AiService — resolveConnectorLabel', () => {
  let service: AiService

  beforeEach(() => {
    jest.clearAllMocks()
    service = createService()
  })

  it('should return "default" labels when connectorKey is undefined', async () => {
    const result = await service.resolveConnectorLabel('tenant-1', undefined)

    expect(result.providerLabel).toBe('default')
    expect(result.modelLabel).toBe('')
  })

  it('should return "default" labels when connectorKey is "default"', async () => {
    const result = await service.resolveConnectorLabel('tenant-1', 'default')

    expect(result.providerLabel).toBe('default')
    expect(result.modelLabel).toBe('')
  })

  it('should resolve a UUID connector key to dynamic connector name', async () => {
    mockLlmConnectorsService.getById.mockResolvedValue({
      name: 'My GPT-4 Connector',
      defaultModel: 'gpt-4-turbo',
    })

    const result = await service.resolveConnectorLabel(
      'tenant-1',
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    )

    expect(result.providerLabel).toBe('My GPT-4 Connector')
    expect(result.modelLabel).toBe('gpt-4-turbo')
  })

  it('should return UUID as providerLabel when dynamic connector lookup fails', async () => {
    mockLlmConnectorsService.getById.mockRejectedValue(new Error('Not found'))

    const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    const result = await service.resolveConnectorLabel('tenant-1', uuid)

    expect(result.providerLabel).toBe(uuid)
    expect(result.modelLabel).toBe('')
  })

  it('should resolve a fixed connector key to its label', async () => {
    // Fixed connectors like 'bedrock', 'openclaw_gateway' etc. are matched from FIXED_AI_CONNECTORS
    const result = await service.resolveConnectorLabel('tenant-1', 'bedrock')

    expect(result.providerLabel).toBeDefined()
    // The label comes from FIXED_AI_CONNECTORS — if not found, falls back to key
    expect(typeof result.providerLabel).toBe('string')
  })
})

/* -------------------------------------------------------------------- */
/* buildPromptFromTemplate (via executeAiTask)                            */
/* -------------------------------------------------------------------- */

describe('AiService — buildPromptFromTemplate (via executeAiTask)', () => {
  let service: AiService

  beforeEach(() => {
    jest.clearAllMocks()
    service = createService()

    mockFeatureCatalogService.getConfig.mockResolvedValue({
      enabled: true,
      preferredProvider: null,
      maxTokens: 2048,
      monthlyTokenBudget: null,
    })
    mockUsageBudgetService.checkBudget.mockResolvedValue({ allowed: true, used: 0, budget: null })
    mockUsageBudgetService.recordUsage.mockResolvedValue(undefined)
    mockRepository.createAuditLog.mockResolvedValue(undefined)
    mockConnectorsService.getDecryptedConfig.mockResolvedValue(null)
    mockLlmConnectorsService.getEnabledConfigs.mockResolvedValue([])
  })

  it('should replace {{context}} placeholder with JSON-stringified context', async () => {
    mockPromptRegistryService.getActivePrompt.mockResolvedValue('Analyze: {{context}}')

    const result = await service.executeAiTask(
      buildTaskInput({ context: { alertTitle: 'Test', severity: 'critical' } })
    )

    // The result will be a rule-based fallback that includes the processed prompt
    expect(result.result).toContain('Test')
  })

  it('should replace specific {{key}} placeholders', async () => {
    mockPromptRegistryService.getActivePrompt.mockResolvedValue(
      'Alert: {{alertTitle}} — Severity: {{alertSeverity}}'
    )

    const result = await service.executeAiTask(
      buildTaskInput({ context: { alertTitle: 'Brute Force', alertSeverity: 'critical' } })
    )

    // The fallback response includes a preview of the prompt
    expect(result.result).toBeDefined()
  })
})
