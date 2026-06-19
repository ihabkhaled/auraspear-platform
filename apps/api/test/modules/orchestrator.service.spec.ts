import { AgentActionType, AgentAutomationMode, AgentRiskLevel } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { OrchestratorService } from '../../src/modules/ai/orchestrator/orchestrator.service'
import type { AgentConfigWithDefaults } from '../../src/modules/agent-config/agent-config.types'

/* ------------------------------------------------------------------ */
/* Mock factories                                                      */
/* ------------------------------------------------------------------ */

function createMockRepository() {
  return {
    findJobsByAgent: jest.fn().mockResolvedValue([]),
    countJobsByAgent: jest.fn().mockResolvedValue(0),
    countJobsSince: jest.fn().mockResolvedValue(0),
    countPendingApprovals: jest.fn().mockResolvedValue(0),
    countActiveAgentConfigs: jest.fn().mockResolvedValue(0),
    countTotalAgentConfigs: jest.fn().mockResolvedValue(0),
  }
}

function createMockAgentConfigService() {
  return {
    getAgentConfig: jest.fn(),
  }
}

function createMockJobService() {
  return {
    enqueue: jest.fn().mockResolvedValue({ id: 'job-001' }),
  }
}

function createMockUsageBudgetService() {
  return {
    checkBudget: jest.fn().mockResolvedValue({ allowed: true, used: 0, budget: null }),
  }
}

function createMockAppLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }
}

function buildEnabledAgentConfig(
  overrides: Partial<AgentConfigWithDefaults> = {}
): AgentConfigWithDefaults {
  return {
    agentId: 'alert-triage',
    displayName: 'Alert Triage Agent',
    description: 'Auto-triage incoming alerts',
    isEnabled: true,
    providerMode: 'default',
    model: null,
    temperature: 0.3,
    maxTokensPerCall: 2048,
    systemPrompt: null,
    promptSuffix: null,
    indexPatterns: [],
    tokensPerHour: 0,
    tokensPerDay: 0,
    tokensPerMonth: 0,
    tokensUsedHour: 0,
    tokensUsedDay: 0,
    tokensUsedMonth: 0,
    maxConcurrentRuns: 3,
    triggerMode: 'auto_on_alert',
    triggerConfig: null,
    osintSources: null,
    outputFormat: 'markdown',
    presentationSkills: [],
    lastResetHour: null,
    lastResetDay: null,
    lastResetMonth: null,
    hasCustomConfig: false,
    ...overrides,
  }
}

function createService(deps: {
  repository: ReturnType<typeof createMockRepository>
  agentConfigService: ReturnType<typeof createMockAgentConfigService>
  jobService: ReturnType<typeof createMockJobService>
  usageBudgetService: ReturnType<typeof createMockUsageBudgetService>
  appLogger: ReturnType<typeof createMockAppLogger>
}) {
  return new OrchestratorService(
    deps.repository as never,
    deps.agentConfigService as never,
    deps.jobService as never,
    deps.usageBudgetService as never,
    deps.appLogger as never
  )
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('OrchestratorService', () => {
  const TENANT_ID = 'tenant-001'
  const AGENT_ID = 'alert-triage'

  let repository: ReturnType<typeof createMockRepository>
  let agentConfigService: ReturnType<typeof createMockAgentConfigService>
  let jobService: ReturnType<typeof createMockJobService>
  let usageBudgetService: ReturnType<typeof createMockUsageBudgetService>
  let appLogger: ReturnType<typeof createMockAppLogger>
  let service: OrchestratorService

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    agentConfigService = createMockAgentConfigService()
    jobService = createMockJobService()
    usageBudgetService = createMockUsageBudgetService()
    appLogger = createMockAppLogger()
    service = createService({
      repository,
      agentConfigService,
      jobService,
      usageBudgetService,
      appLogger,
    })
  })

  /* ---------------------------------------------------------------- */
  /* dispatchAgentTask                                                  */
  /* ---------------------------------------------------------------- */

  describe('dispatchAgentTask', () => {
    it('should enqueue job when agent is enabled and budget allows', async () => {
      const config = buildEnabledAgentConfig()
      agentConfigService.getAgentConfig.mockResolvedValue(config)

      const result = await service.dispatchAgentTask({
        tenantId: TENANT_ID,
        agentId: AGENT_ID,
        actionType: AgentActionType.TRIAGE,
        payload: { alertId: 'alert-1' },
        triggeredBy: 'system:event-listener',
      })

      expect(result.dispatched).toBe(true)
      expect(result.jobId).toBe('job-001')
      expect(jobService.enqueue).toHaveBeenCalledTimes(1)
      expect(jobService.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          type: 'ai_agent_task',
          payload: expect.objectContaining({
            agentId: AGENT_ID,
            actionType: AgentActionType.TRIAGE,
          }),
        })
      )
    })

    it('should throw when agent is disabled', async () => {
      const config = buildEnabledAgentConfig({ isEnabled: false })
      agentConfigService.getAgentConfig.mockResolvedValue(config)

      await expect(
        service.dispatchAgentTask({
          tenantId: TENANT_ID,
          agentId: AGENT_ID,
          actionType: AgentActionType.TRIAGE,
          payload: { alertId: 'alert-1' },
          triggeredBy: 'system:event-listener',
        })
      ).rejects.toThrow(BusinessException)

      expect(jobService.enqueue).not.toHaveBeenCalled()
    })

    it('should throw when budget exceeded', async () => {
      const config = buildEnabledAgentConfig()
      agentConfigService.getAgentConfig.mockResolvedValue(config)
      usageBudgetService.checkBudget.mockResolvedValue({
        allowed: false,
        used: 100000,
        budget: 100000,
      })

      await expect(
        service.dispatchAgentTask({
          tenantId: TENANT_ID,
          agentId: AGENT_ID,
          actionType: AgentActionType.TRIAGE,
          payload: { alertId: 'alert-1' },
          triggeredBy: 'system:event-listener',
        })
      ).rejects.toThrow(BusinessException)

      expect(jobService.enqueue).not.toHaveBeenCalled()
    })
  })

  /* ---------------------------------------------------------------- */
  /* canAgentExecute                                                    */
  /* ---------------------------------------------------------------- */

  describe('canAgentExecute', () => {
    it('should return allowed when agent is enabled with budget', async () => {
      const config = buildEnabledAgentConfig()

      const result = await service.canAgentExecute(
        TENANT_ID,
        AGENT_ID,
        AgentActionType.TRIAGE,
        config
      )

      expect(result.allowed).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should return denied when agent is disabled', async () => {
      const config = buildEnabledAgentConfig({ isEnabled: false })

      const result = await service.canAgentExecute(
        TENANT_ID,
        AGENT_ID,
        AgentActionType.TRIAGE,
        config
      )

      expect(result.allowed).toBe(false)
      expect(result.messageKey).toBe('errors.orchestrator.agentDisabled')
    })

    it('should return denied when hourly quota exceeded', async () => {
      const config = buildEnabledAgentConfig({
        tokensPerHour: 1000,
        tokensUsedHour: 1000,
      })

      const result = await service.canAgentExecute(
        TENANT_ID,
        AGENT_ID,
        AgentActionType.TRIAGE,
        config
      )

      expect(result.allowed).toBe(false)
      expect(result.messageKey).toBe('errors.orchestrator.quotaExceeded')
    })

    it('should return denied when monthly budget exceeded', async () => {
      const config = buildEnabledAgentConfig()
      usageBudgetService.checkBudget.mockResolvedValue({ allowed: false })

      const result = await service.canAgentExecute(
        TENANT_ID,
        AGENT_ID,
        AgentActionType.TRIAGE,
        config
      )

      expect(result.allowed).toBe(false)
      expect(result.messageKey).toBe('errors.orchestrator.budgetExceeded')
    })
  })

  /* ---------------------------------------------------------------- */
  /* resolveAutomationMode                                              */
  /* ---------------------------------------------------------------- */

  describe('resolveAutomationMode', () => {
    it('should map trigger modes correctly', () => {
      const manualConfig = buildEnabledAgentConfig({ triggerMode: 'manual_only' })
      const manualResult = service.resolveAutomationMode(manualConfig, AgentActionType.TRIAGE)
      expect(manualResult.mode).toBe(AgentAutomationMode.MANUAL_ONLY)

      const autoOnAlertConfig = buildEnabledAgentConfig({ triggerMode: 'auto_on_alert' })
      const autoResult = service.resolveAutomationMode(autoOnAlertConfig, AgentActionType.TRIAGE)
      expect(autoResult.mode).toBe(AgentAutomationMode.EVENT_DRIVEN)

      const autoByAgentConfig = buildEnabledAgentConfig({ triggerMode: 'auto_by_agent' })
      const agentResult = service.resolveAutomationMode(autoByAgentConfig, AgentActionType.TRIAGE)
      expect(agentResult.mode).toBe(AgentAutomationMode.ORCHESTRATOR_INVOKED)

      const scheduledConfig = buildEnabledAgentConfig({ triggerMode: 'scheduled' })
      const scheduledResult = service.resolveAutomationMode(scheduledConfig, AgentActionType.TRIAGE)
      expect(scheduledResult.mode).toBe(AgentAutomationMode.SCHEDULED)
    })

    it('should default to MANUAL_ONLY for unknown trigger modes', () => {
      const config = buildEnabledAgentConfig({ triggerMode: 'unknown_mode' })
      const result = service.resolveAutomationMode(config, AgentActionType.TRIAGE)
      expect(result.mode).toBe(AgentAutomationMode.MANUAL_ONLY)
    })
  })

  /* ---------------------------------------------------------------- */
  /* requiresApproval                                                   */
  /* ---------------------------------------------------------------- */

  describe('requiresApproval', () => {
    it('should return true for APPROVAL_REQUIRED mode', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.APPROVAL_REQUIRED,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(true)
    })

    it('should return true for AUTO_GOVERNED mode', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.AUTO_GOVERNED,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(true)
    })

    it('should return false for SUGGEST_ONLY mode', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.SUGGEST_ONLY,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(false)
    })

    it('should return true for AUTO_LOW_RISK with medium risk', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.AUTO_LOW_RISK,
        riskLevel: AgentRiskLevel.MEDIUM,
      })
      expect(result).toBe(true)
    })

    it('should return true for AUTO_LOW_RISK with high risk', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.AUTO_LOW_RISK,
        riskLevel: AgentRiskLevel.HIGH,
      })
      expect(result).toBe(true)
    })

    it('should return true for AUTO_LOW_RISK with critical risk', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.AUTO_LOW_RISK,
        riskLevel: AgentRiskLevel.CRITICAL,
      })
      expect(result).toBe(true)
    })

    it('should return false for AUTO_LOW_RISK with low risk', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.AUTO_LOW_RISK,
        riskLevel: AgentRiskLevel.LOW,
      })
      expect(result).toBe(false)
    })

    it('should return false for AUTO_LOW_RISK with no risk', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.AUTO_LOW_RISK,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(false)
    })

    it('should return false for MANUAL_ONLY mode', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.MANUAL_ONLY,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(false)
    })

    it('should return false for EVENT_DRIVEN mode with no risk', () => {
      const result = service.requiresApproval({
        mode: AgentAutomationMode.EVENT_DRIVEN,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(false)
    })
  })
})
