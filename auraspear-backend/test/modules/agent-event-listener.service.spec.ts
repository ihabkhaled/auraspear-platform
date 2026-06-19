import { AgentActionType, AiAgentId } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { AgentEventListenerService } from '../../src/modules/ai/orchestrator/agent-event-listener.service'

/* ------------------------------------------------------------------ */
/* Mock factories                                                      */
/* ------------------------------------------------------------------ */

function createMockOrchestratorService() {
  return {
    dispatchAgentTask: jest.fn().mockResolvedValue({
      dispatched: true,
      jobId: 'job-001',
      automationMode: 'event_driven',
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

function createMockAgentConfigService() {
  return {
    getAgentConfig: jest.fn().mockResolvedValue({
      isEnabled: true,
      triggerMode: 'auto_on_alert',
      triggerConfig: {},
    }),
  }
}

/* ------------------------------------------------------------------ */
/* Tests                                                               */
/* ------------------------------------------------------------------ */

describe('AgentEventListenerService', () => {
  const TENANT_ID = 'tenant-001'

  let orchestratorService: ReturnType<typeof createMockOrchestratorService>
  let agentConfigService: ReturnType<typeof createMockAgentConfigService>
  let appLogger: ReturnType<typeof createMockAppLogger>
  let service: AgentEventListenerService

  beforeEach(() => {
    jest.clearAllMocks()
    orchestratorService = createMockOrchestratorService()
    agentConfigService = createMockAgentConfigService()
    appLogger = createMockAppLogger()
    service = new AgentEventListenerService(
      orchestratorService as never,
      agentConfigService as never,
      appLogger as never
    )
  })

  /* ---------------------------------------------------------------- */
  /* onAlertCreated                                                     */
  /* ---------------------------------------------------------------- */

  describe('onAlertCreated', () => {
    it('should dispatch triage when agent is enabled', async () => {
      await service.onAlertCreated(TENANT_ID, 'alert-123')

      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledTimes(1)
      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        agentId: AiAgentId.ALERT_TRIAGE,
        actionType: AgentActionType.TRIAGE,
        payload: { alertId: 'alert-123' },
        triggeredBy: 'system:event-listener',
      })
      expect(appLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('onAlertCreated'),
        expect.objectContaining({ tenantId: TENANT_ID })
      )
    })

    it('should not throw when agent is disabled (fire-and-forget)', async () => {
      orchestratorService.dispatchAgentTask.mockRejectedValue(
        new BusinessException(403, 'Agent disabled', 'errors.orchestrator.agentDisabled')
      )

      await expect(service.onAlertCreated(TENANT_ID, 'alert-123')).resolves.toBeUndefined()

      expect(appLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('onAlertCreated'),
        expect.objectContaining({ tenantId: TENANT_ID })
      )
    })

    it('should log error when dispatch fails for any reason', async () => {
      orchestratorService.dispatchAgentTask.mockRejectedValue(new Error('Connection refused'))

      await service.onAlertCreated(TENANT_ID, 'alert-456')

      expect(appLogger.error).toHaveBeenCalledTimes(1)
      expect(appLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('onAlertCreated failed'),
        expect.objectContaining({
          metadata: expect.objectContaining({
            alertId: 'alert-456',
            error: 'Connection refused',
          }),
        })
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* onIncidentStatusChanged                                            */
  /* ---------------------------------------------------------------- */

  describe('onIncidentStatusChanged', () => {
    it('should dispatch escalation analysis', async () => {
      await service.onIncidentStatusChanged(TENANT_ID, 'incident-001', 'escalated')

      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledTimes(1)
      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        agentId: AiAgentId.INCIDENT_ESCALATION,
        actionType: AgentActionType.ESCALATE,
        payload: { incidentId: 'incident-001', newStatus: 'escalated' },
        triggeredBy: 'system:event-listener',
      })
    })

    it('should not throw when dispatch fails', async () => {
      orchestratorService.dispatchAgentTask.mockRejectedValue(new Error('Quota exceeded'))

      await expect(
        service.onIncidentStatusChanged(TENANT_ID, 'incident-001', 'escalated')
      ).resolves.toBeUndefined()

      expect(appLogger.error).toHaveBeenCalledTimes(1)
    })
  })

  /* ---------------------------------------------------------------- */
  /* onJobFailed                                                        */
  /* ---------------------------------------------------------------- */

  describe('onJobFailed', () => {
    it('should dispatch job health check', async () => {
      await service.onJobFailed(TENANT_ID, 'job-999', 'connector_sync')

      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledTimes(1)
      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        agentId: AiAgentId.JOB_HEALTH,
        actionType: AgentActionType.INVESTIGATE,
        payload: { jobId: 'job-999', jobType: 'connector_sync' },
        triggeredBy: 'system:event-listener',
      })
    })

    it('should not throw when dispatch fails', async () => {
      orchestratorService.dispatchAgentTask.mockRejectedValue(new Error('Budget exceeded'))

      await expect(
        service.onJobFailed(TENANT_ID, 'job-999', 'connector_sync')
      ).resolves.toBeUndefined()
    })
  })

  /* ---------------------------------------------------------------- */
  /* onConnectorSyncCompleted                                           */
  /* ---------------------------------------------------------------- */

  describe('onConnectorSyncCompleted', () => {
    it('should dispatch sync processing task', async () => {
      await service.onConnectorSyncCompleted(TENANT_ID, 'conn-001', 'wazuh')

      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledTimes(1)
      expect(orchestratorService.dispatchAgentTask).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        agentId: AiAgentId.ORCHESTRATOR,
        actionType: AgentActionType.SYNC,
        payload: { connectorId: 'conn-001', connectorType: 'wazuh' },
        triggeredBy: 'system:event-listener',
      })
    })

    it('should not throw when dispatch fails', async () => {
      orchestratorService.dispatchAgentTask.mockRejectedValue(new Error('Network error'))

      await expect(
        service.onConnectorSyncCompleted(TENANT_ID, 'conn-001', 'wazuh')
      ).resolves.toBeUndefined()
    })
  })
})
