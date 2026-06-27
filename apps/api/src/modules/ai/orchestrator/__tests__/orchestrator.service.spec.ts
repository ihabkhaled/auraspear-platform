jest.mock('@prisma/client', () => ({ PrismaClient: class PrismaClient {} }))

import { AgentAutomationMode, AgentRiskLevel, ApprovalRiskLevel } from '../../../../common/enums'
import { OrchestratorService } from '../orchestrator.service'

function createMockRepository() {
  return {
    countJobsSince: jest.fn().mockResolvedValue(0),
    countPendingApprovals: jest.fn().mockResolvedValue(0),
    findJobsByAgent: jest.fn().mockResolvedValue([]),
    countJobsByAgent: jest.fn().mockResolvedValue(0),
    findApprovalByJobId: jest.fn(),
  }
}

function createMockAgentConfigService(triggerMode = 'auto_on_alert') {
  return {
    getAgentConfig: jest.fn().mockResolvedValue(makeAgentConfig(triggerMode)),
    getAgentConfigs: jest.fn().mockResolvedValue([]),
    createApproval: jest.fn().mockResolvedValue({ id: 'approval-uuid' }),
  }
}

function createMockJobService() {
  return {
    enqueue: jest.fn().mockResolvedValue({ id: 'job-db-uuid' }),
  }
}

function createMockUsageBudgetService() {
  return {
    checkBudget: jest.fn().mockResolvedValue({ allowed: true }),
  }
}

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function makeAgentConfig(triggerMode = 'auto_on_alert') {
  return {
    agentId: 'alert-triage',
    displayName: 'Alert Triage',
    description: 'Triages alerts',
    isEnabled: true,
    providerMode: 'inherit',
    model: null,
    temperature: 0.7,
    maxTokensPerCall: 4096,
    systemPrompt: null,
    promptSuffix: null,
    indexPatterns: [],
    tokensPerHour: 0,
    tokensPerDay: 0,
    tokensPerMonth: 0,
    tokensUsedHour: 0,
    tokensUsedDay: 0,
    tokensUsedMonth: 0,
    maxConcurrentRuns: 1,
    triggerMode,
    triggerConfig: null,
    osintSources: null,
    outputFormat: 'markdown',
    presentationSkills: [],
    lastResetHour: null,
    lastResetDay: null,
    lastResetMonth: null,
    hasCustomConfig: false,
  }
}

function createService(
  repository = createMockRepository(),
  agentConfigService = createMockAgentConfigService(),
  jobService = createMockJobService(),
  usageBudgetService = createMockUsageBudgetService()
) {
  return new OrchestratorService(
    repository as never,
    agentConfigService as never,
    jobService as never,
    usageBudgetService as never,
    mockAppLogger as never
  )
}

const BASE_INPUT = {
  tenantId: 'tenant-1',
  agentId: 'alert-triage',
  actionType: AgentRiskLevel.NONE as never,
  payload: {},
  triggeredBy: 'scheduler@system',
}

/**
 * Helper: spy on resolveAutomationMode so the action is treated as
 * requiring approval, regardless of the configured triggerMode.
 */
function forceApprovalRequired(service: OrchestratorService): void {
  jest.spyOn(service, 'resolveAutomationMode').mockReturnValue({
    mode: AgentAutomationMode.APPROVAL_REQUIRED,
    requiresApproval: true,
  })
}

describe('OrchestratorService SEC-02 dispatch ordering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('when action requires approval', () => {
    it('creates approval record BEFORE enqueuing the job', async () => {
      const agentConfigService = createMockAgentConfigService()
      const jobService = createMockJobService()
      const callOrder: string[] = []

      agentConfigService.createApproval.mockImplementation(async () => {
        callOrder.push('createApproval')
        return { id: 'approval-uuid' }
      })
      jobService.enqueue.mockImplementation(async () => {
        callOrder.push('enqueue')
        return { id: 'job-uuid' }
      })

      const service = createService(undefined, agentConfigService, jobService)
      forceApprovalRequired(service)
      await service.dispatchAgentTask(BASE_INPUT)

      expect(callOrder).toEqual(['createApproval', 'enqueue'])
    })

    it('does NOT enqueue when approval record creation fails (fail safe)', async () => {
      const agentConfigService = createMockAgentConfigService()
      agentConfigService.createApproval.mockRejectedValue(new Error('DB connection lost'))
      const jobService = createMockJobService()

      const service = createService(undefined, agentConfigService, jobService)
      forceApprovalRequired(service)

      await expect(service.dispatchAgentTask(BASE_INPUT)).rejects.toThrow('DB connection lost')

      expect(jobService.enqueue).not.toHaveBeenCalled()
    })

    it('stores the same pendingJobId in both approval actionData and job payload', async () => {
      const agentConfigService = createMockAgentConfigService()
      const jobService = createMockJobService()

      let capturedApprovalData: Record<string, unknown> = {}
      let capturedJobParams: Record<string, unknown> = {}

      agentConfigService.createApproval.mockImplementation(
        async (data: Record<string, unknown>) => {
          capturedApprovalData = data
          return { id: 'approval-uuid' }
        }
      )
      jobService.enqueue.mockImplementation(async (params: Record<string, unknown>) => {
        capturedJobParams = params
        return { id: 'job-db-uuid' }
      })

      const service = createService(undefined, agentConfigService, jobService)
      forceApprovalRequired(service)
      await service.dispatchAgentTask(BASE_INPUT)

      const approvalActionData = capturedApprovalData.actionData as Record<string, unknown>
      const jobPayload = capturedJobParams.payload as Record<string, unknown>
      expect(approvalActionData.jobId).toBeDefined()
      expect(typeof approvalActionData.jobId).toBe('string')
      expect(approvalActionData.jobId).toBe(jobPayload.jobId)
    })

    it('uses the ApprovalRiskLevel enum value for riskLevel', async () => {
      const agentConfigService = createMockAgentConfigService()
      const jobService = createMockJobService()

      let capturedApprovalData: Record<string, unknown> = {}
      agentConfigService.createApproval.mockImplementation(
        async (data: Record<string, unknown>) => {
          capturedApprovalData = data
          return { id: 'approval-uuid' }
        }
      )

      const service = createService(undefined, agentConfigService, jobService)
      forceApprovalRequired(service)
      await service.dispatchAgentTask(BASE_INPUT)

      expect(capturedApprovalData.riskLevel).toBe(ApprovalRiskLevel.MEDIUM)
    })
  })

  describe('when action does NOT require approval', () => {
    it('enqueues directly without creating an approval record (auto_on_alert mode)', async () => {
      const agentConfigService = createMockAgentConfigService('auto_on_alert')
      const jobService = createMockJobService()

      const service = createService(undefined, agentConfigService, jobService)
      await service.dispatchAgentTask(BASE_INPUT)

      expect(agentConfigService.createApproval).not.toHaveBeenCalled()
      expect(jobService.enqueue).toHaveBeenCalledTimes(1)
    })

    it('enqueues directly without creating an approval record (manual_only mode)', async () => {
      const agentConfigService = createMockAgentConfigService('manual_only')
      const jobService = createMockJobService()

      const service = createService(undefined, agentConfigService, jobService)
      await service.dispatchAgentTask(BASE_INPUT)

      expect(agentConfigService.createApproval).not.toHaveBeenCalled()
      expect(jobService.enqueue).toHaveBeenCalledTimes(1)
    })
  })

  describe('requiresApproval method', () => {
    it('returns true for APPROVAL_REQUIRED mode', () => {
      const service = createService()
      const result = service.requiresApproval({
        mode: AgentAutomationMode.APPROVAL_REQUIRED,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(true)
    })

    it('returns true for AUTO_GOVERNED mode', () => {
      const service = createService()
      const result = service.requiresApproval({
        mode: AgentAutomationMode.AUTO_GOVERNED,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(true)
    })

    it('returns false for SUGGEST_ONLY mode', () => {
      const service = createService()
      const result = service.requiresApproval({
        mode: AgentAutomationMode.SUGGEST_ONLY,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(false)
    })

    it('returns false for EVENT_DRIVEN mode with no-risk action', () => {
      const service = createService()
      const result = service.requiresApproval({
        mode: AgentAutomationMode.EVENT_DRIVEN,
        riskLevel: AgentRiskLevel.NONE,
      })
      expect(result).toBe(false)
    })
  })
})
