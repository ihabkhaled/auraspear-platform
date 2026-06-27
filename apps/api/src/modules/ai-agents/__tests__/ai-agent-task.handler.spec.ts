jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { ApprovalStatus } from '../../../common/enums'
import { AiAgentTaskHandler } from '../ai-agent-task.handler'
import type { Job } from '@prisma/client'

function createMockAiAgentsRepository() {
  return {
    findFirstWithDetails: jest.fn(),
    findFirstSession: jest.fn(),
    updateSessionProviderInfo: jest.fn(),
    markSessionCompleted: jest.fn(),
    markSessionFailed: jest.fn(),
    findFirst: jest.fn(),
    createSession: jest.fn(),
  }
}

function createMockAiService() {
  return {
    runAgentTask: jest.fn(),
    resolveConnectorLabel: jest.fn(),
  }
}

function createMockWritebackService() {
  return {
    processSystemTriggeredResult: jest.fn(),
  }
}

function createMockAgentConfigRepository() {
  return {
    findApprovalByJobId: jest.fn(),
  }
}

function createHandler(
  repo = createMockAiAgentsRepository(),
  aiService = createMockAiService(),
  writebackService = createMockWritebackService(),
  agentConfigRepo = createMockAgentConfigRepository()
) {
  return new AiAgentTaskHandler(
    repo as never,
    aiService as never,
    writebackService as never,
    agentConfigRepo as never
  )
}

function makeJob(overrides = {}) {
  return {
    id: 'db-job-uuid',
    tenantId: 'tenant-1',
    type: 'ai_agent_task',
    status: 'pending',
    payload: {},
    result: null,
    error: null,
    attempts: 0,
    maxAttempts: 2,
    idempotencyKey: null,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Job
}
describe('AiAgentTaskHandler SEC-02 approval gate', () => {
  describe('requiresApproval === true', () => {
    it('skips execution when no approval record exists (fail safe)', async () => {
      const agentConfigRepo = createMockAgentConfigRepository()
      agentConfigRepo.findApprovalByJobId.mockResolvedValue(null)
      const aiService = createMockAiService()
      const handler = createHandler(undefined, aiService, undefined, agentConfigRepo)
      const job = makeJob({
        payload: {
          agentId: 'alert-triage',
          triggeredBy: 'scheduler@system',
          requiresApproval: true,
          jobId: 'pending-uuid-1',
        },
      })

      const result = await handler.handle(job)

      expect(result).toEqual({
        skipped: true,
        reason: 'approval_not_granted',
        agentId: 'alert-triage',
      })
      expect(agentConfigRepo.findApprovalByJobId).toHaveBeenCalledWith('tenant-1', 'pending-uuid-1')
      expect(aiService.runAgentTask).not.toHaveBeenCalled()
    })

    it('skips execution when approval status is PENDING', async () => {
      const agentConfigRepo = createMockAgentConfigRepository()
      agentConfigRepo.findApprovalByJobId.mockResolvedValue({
        id: 'a1',
        status: ApprovalStatus.PENDING,
      })
      const aiService = createMockAiService()
      const handler = createHandler(undefined, aiService, undefined, agentConfigRepo)
      const job = makeJob({
        payload: {
          agentId: 'alert-triage',
          triggeredBy: 'scheduler@system',
          requiresApproval: true,
          jobId: 'pending-uuid-2',
        },
      })

      const result = await handler.handle(job)

      expect(result).toEqual({
        skipped: true,
        reason: 'approval_not_granted',
        agentId: 'alert-triage',
      })
      expect(aiService.runAgentTask).not.toHaveBeenCalled()
    })

    it('skips execution when approval status is REJECTED', async () => {
      const agentConfigRepo = createMockAgentConfigRepository()
      agentConfigRepo.findApprovalByJobId.mockResolvedValue({
        id: 'a2',
        status: ApprovalStatus.REJECTED,
      })
      const aiService = createMockAiService()
      const handler = createHandler(undefined, aiService, undefined, agentConfigRepo)
      const job = makeJob({
        payload: {
          agentId: 'alert-triage',
          triggeredBy: 'scheduler@system',
          requiresApproval: true,
          jobId: 'pending-uuid-3',
        },
      })

      const result = await handler.handle(job)

      expect(result).toEqual({
        skipped: true,
        reason: 'approval_not_granted',
        agentId: 'alert-triage',
      })
      expect(aiService.runAgentTask).not.toHaveBeenCalled()
    })
    it('skips execution when approval status is EXPIRED', async () => {
      const agentConfigRepo = createMockAgentConfigRepository()
      agentConfigRepo.findApprovalByJobId.mockResolvedValue({
        id: 'a3',
        status: ApprovalStatus.EXPIRED,
      })
      const aiService = createMockAiService()
      const handler = createHandler(undefined, aiService, undefined, agentConfigRepo)
      const job = makeJob({
        payload: {
          agentId: 'alert-triage',
          triggeredBy: 'scheduler@system',
          requiresApproval: true,
          jobId: 'pending-uuid-4',
        },
      })

      const result = await handler.handle(job)

      expect(result).toEqual({
        skipped: true,
        reason: 'approval_not_granted',
        agentId: 'alert-triage',
      })
      expect(aiService.runAgentTask).not.toHaveBeenCalled()
    })

    it('skips execution fail-safe when jobId is absent from payload', async () => {
      const agentConfigRepo = createMockAgentConfigRepository()
      const aiService = createMockAiService()
      const handler = createHandler(undefined, aiService, undefined, agentConfigRepo)
      const job = makeJob({
        payload: {
          agentId: 'alert-triage',
          triggeredBy: 'scheduler@system',
          requiresApproval: true,
        },
      })

      const result = await handler.handle(job)

      expect(result).toEqual({
        skipped: true,
        reason: 'approval_not_granted',
        agentId: 'alert-triage',
      })
      expect(agentConfigRepo.findApprovalByJobId).not.toHaveBeenCalled()
      expect(aiService.runAgentTask).not.toHaveBeenCalled()
    })

    it('proceeds when approval status is APPROVED (system-triggered path)', async () => {
      const agentConfigRepo = createMockAgentConfigRepository()
      agentConfigRepo.findApprovalByJobId.mockResolvedValue({
        id: 'a4',
        status: ApprovalStatus.APPROVED,
      })
      const repo = createMockAiAgentsRepository()
      repo.findFirst.mockResolvedValue(null)
      const aiService = createMockAiService()
      aiService.runAgentTask.mockResolvedValue({
        result: 'analysis complete',
        model: 'claude-3-sonnet',
        provider: 'bedrock',
        tokensUsed: { input: 100, output: 50 },
      })
      const writebackService = createMockWritebackService()
      writebackService.processSystemTriggeredResult.mockResolvedValue(undefined)
      const handler = createHandler(repo, aiService, writebackService, agentConfigRepo)
      const job = makeJob({
        payload: {
          agentId: 'alert-triage',
          triggeredBy: 'scheduler@system',
          requiresApproval: true,
          jobId: 'pending-uuid-5',
          actionType: 'analyze',
        },
      })

      const result = await handler.handle(job)

      expect(agentConfigRepo.findApprovalByJobId).toHaveBeenCalledWith('tenant-1', 'pending-uuid-5')
      expect(aiService.runAgentTask).toHaveBeenCalledTimes(1)
      expect(result).toMatchObject({ agentId: 'alert-triage' })
    })
  })

  describe('requiresApproval is false or absent', () => {
    it('does NOT check approval record and executes normally', async () => {
      const agentConfigRepo = createMockAgentConfigRepository()
      const repo = createMockAiAgentsRepository()
      repo.findFirst.mockResolvedValue(null)
      const aiService = createMockAiService()
      aiService.runAgentTask.mockResolvedValue({
        result: 'done',
        model: 'claude-3-sonnet',
        provider: 'bedrock',
        tokensUsed: { input: 50, output: 25 },
      })
      const writebackService = createMockWritebackService()
      writebackService.processSystemTriggeredResult.mockResolvedValue(undefined)
      const handler = createHandler(repo, aiService, writebackService, agentConfigRepo)
      const job = makeJob({
        payload: {
          agentId: 'alert-triage',
          triggeredBy: 'scheduler@system',
          requiresApproval: false,
          jobId: 'pending-uuid-6',
          actionType: 'analyze',
        },
      })

      await handler.handle(job)

      expect(agentConfigRepo.findApprovalByJobId).not.toHaveBeenCalled()
      expect(aiService.runAgentTask).toHaveBeenCalledTimes(1)
    })
  })
})
