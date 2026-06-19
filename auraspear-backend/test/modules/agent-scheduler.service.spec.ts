import { AgentSchedulerService } from '../../src/modules/ai/orchestrator/agent-scheduler.service'

function createMockScheduleService() {
  return {
    findDueSchedules: jest.fn().mockResolvedValue([]),
    markRunStarted: jest.fn().mockResolvedValue(undefined),
    markRunCompleted: jest.fn().mockResolvedValue(undefined),
  }
}

function createMockOrchestratorService() {
  return {
    dispatchAgentTask: jest.fn().mockResolvedValue({
      dispatched: true,
      jobId: 'job-001',
      automationMode: 'scheduled',
      requiresApproval: false,
    }),
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

describe('AgentSchedulerService', () => {
  let service: AgentSchedulerService
  let scheduleService: ReturnType<typeof createMockScheduleService>
  let orchestratorService: ReturnType<typeof createMockOrchestratorService>
  let appLogger: ReturnType<typeof createMockAppLogger>

  beforeEach(() => {
    scheduleService = createMockScheduleService()
    orchestratorService = createMockOrchestratorService()
    appLogger = createMockAppLogger()
    service = new AgentSchedulerService(
      orchestratorService as never,
      scheduleService as never,
      appLogger as never
    )
  })

  describe('processDueSchedules', () => {
    it('should do nothing when no schedules are due', async () => {
      scheduleService.findDueSchedules.mockResolvedValue([])

      await service.processDueSchedules()

      expect(scheduleService.findDueSchedules).toHaveBeenCalledTimes(1)
      expect(orchestratorService.dispatchAgentTask).not.toHaveBeenCalled()
    })

    it('should dispatch due schedules and mark them started', async () => {
      const dueSchedule = {
        id: 'sched-001',
        tenantId: 'tenant-001',
        agentId: 'alert-triage',
        module: 'alerts',
        executionMode: 'suggest_only',
        cronExpression: '0 */10 * * * *',
        timezone: 'UTC',
      }
      scheduleService.findDueSchedules.mockResolvedValue([dueSchedule])

      await service.processDueSchedules()

      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledTimes(1)
      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-001',
          agentId: 'alert-triage',
          triggeredBy: 'system:scheduler',
        })
      )
    })

    it('should continue processing when one schedule fails', async () => {
      const schedules = [
        {
          id: 'sched-001',
          tenantId: 'tenant-001',
          agentId: 'alert-triage',
          module: 'alerts',
          executionMode: 'suggest_only',
        },
        {
          id: 'sched-002',
          tenantId: 'tenant-001',
          agentId: 'job-health',
          module: 'jobs',
          executionMode: 'suggest_only',
        },
      ]
      scheduleService.findDueSchedules.mockResolvedValue(schedules)
      orchestratorService.dispatchAgentTask
        .mockRejectedValueOnce(new Error('Agent disabled'))
        .mockResolvedValueOnce({ dispatched: true, jobId: 'job-002' })

      await service.processDueSchedules()

      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledTimes(2)
    })

    it('should not throw even if all schedules fail', async () => {
      scheduleService.findDueSchedules.mockResolvedValue([
        { id: 's1', tenantId: 't1', agentId: 'a1', module: 'm1', executionMode: 'suggest_only' },
      ])
      orchestratorService.dispatchAgentTask.mockRejectedValue(new Error('fail'))

      await expect(service.processDueSchedules()).resolves.toBe(0)
    })
  })
})
