import { Injectable } from '@nestjs/common'
import { OrchestratorService } from './orchestrator.service'
import { AgentActionType, AiAgentId, AiTriggerMode, AppLogFeature } from '../../../common/enums'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { ServiceLogger } from '../../../common/services/service-logger'
import { AgentConfigService } from '../../agent-config/agent-config.service'

/**
 * Listens for domain events and dispatches agent tasks via the orchestrator.
 * Checks agent triggerMode and triggerConfig before dispatching.
 * All methods are fire-and-forget — they never throw and never block the caller.
 */
@Injectable()
export class AgentEventListenerService {
  private readonly log: ServiceLogger

  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly agentConfigService: AgentConfigService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.AI, 'AgentEventListenerService')
  }

  /**
   * Called after a new alert is persisted.
   * Dispatches the alert-triage agent IF triggerMode is auto_on_alert
   * AND the alert severity matches the triggerConfig filter (if any).
   */
  async onAlertCreated(tenantId: string, alertId: string, alertSeverity?: string): Promise<void> {
    try {
      const config = await this.agentConfigService.getAgentConfig(tenantId, AiAgentId.ALERT_TRIAGE)

      if (!config.isEnabled) {
        return
      }

      if (
        config.triggerMode !== AiTriggerMode.AUTO_ON_ALERT &&
        config.triggerMode !== AiTriggerMode.MANUAL_ONLY
      ) {
        return
      }

      // If triggerMode is manual_only, skip auto dispatch
      if (config.triggerMode === AiTriggerMode.MANUAL_ONLY) {
        return
      }

      // Check triggerConfig severity filter
      const triggerConfig = config.triggerConfig as Record<string, unknown>
      if (triggerConfig && alertSeverity) {
        const minSeverities = triggerConfig.minSeverities as string[] | undefined
        if (minSeverities && minSeverities.length > 0 && !minSeverities.includes(alertSeverity)) {
          this.log.debug(
            'onAlertCreated',
            tenantId,
            `Skipping: alert severity "${alertSeverity}" not in filter ${JSON.stringify(minSeverities)}`
          )
          return
        }
      }

      await this.orchestratorService.dispatchAgentTask({
        tenantId,
        agentId: AiAgentId.ALERT_TRIAGE,
        actionType: AgentActionType.TRIAGE,
        payload: { alertId, alertSeverity },
        triggeredBy: 'system:event-listener',
      })
      this.log.success('onAlertCreated', tenantId, { alertId, alertSeverity })
    } catch (error) {
      this.log.error('onAlertCreated', tenantId, error, { alertId })
    }
  }

  /**
   * Called after an incident status changes (e.g., escalation).
   * Dispatches the incident-escalation agent if trigger mode allows.
   */
  async onIncidentStatusChanged(
    tenantId: string,
    incidentId: string,
    newStatus: string
  ): Promise<void> {
    try {
      const config = await this.agentConfigService.getAgentConfig(
        tenantId,
        AiAgentId.INCIDENT_ESCALATION
      )

      if (!config.isEnabled || config.triggerMode === AiTriggerMode.MANUAL_ONLY) {
        return
      }

      // Check triggerConfig status filter
      const triggerConfig = config.triggerConfig as Record<string, unknown>
      if (triggerConfig) {
        const onStatuses = triggerConfig.onStatuses as string[] | undefined
        if (onStatuses && onStatuses.length > 0 && !onStatuses.includes(newStatus)) {
          return
        }
      }

      await this.orchestratorService.dispatchAgentTask({
        tenantId,
        agentId: AiAgentId.INCIDENT_ESCALATION,
        actionType: AgentActionType.ESCALATE,
        payload: { incidentId, newStatus },
        triggeredBy: 'system:event-listener',
      })
      this.log.success('onIncidentStatusChanged', tenantId, { incidentId, newStatus })
    } catch (error) {
      this.log.error('onIncidentStatusChanged', tenantId, error, { incidentId, newStatus })
    }
  }

  /**
   * Called after a job fails permanently (no more retries).
   * Dispatches the job-health agent for diagnosis.
   */
  async onJobFailed(tenantId: string, jobId: string, jobType: string): Promise<void> {
    try {
      await this.orchestratorService.dispatchAgentTask({
        tenantId,
        agentId: AiAgentId.JOB_HEALTH,
        actionType: AgentActionType.INVESTIGATE,
        payload: { jobId, jobType },
        triggeredBy: 'system:event-listener',
      })
      this.log.success('onJobFailed', tenantId, { jobId, jobType })
    } catch (error) {
      this.log.error('onJobFailed', tenantId, error, { jobId, jobType })
    }
  }

  /**
   * Called after a connector sync completes successfully.
   * Dispatches the orchestrator agent to process sync results.
   */
  async onConnectorSyncCompleted(
    tenantId: string,
    connectorId: string,
    connectorType: string
  ): Promise<void> {
    try {
      await this.orchestratorService.dispatchAgentTask({
        tenantId,
        agentId: AiAgentId.ORCHESTRATOR,
        actionType: AgentActionType.SYNC,
        payload: { connectorId, connectorType },
        triggeredBy: 'system:event-listener',
      })
      this.log.success('onConnectorSyncCompleted', tenantId, { connectorId, connectorType })
    } catch (error) {
      this.log.error('onConnectorSyncCompleted', tenantId, error, {
        connectorId,
        connectorType,
      })
    }
  }
}
