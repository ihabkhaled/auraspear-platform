import { Inject, Injectable, Logger, Optional, forwardRef } from '@nestjs/common'
import { nowDate, toIso } from '../../../common/utils/date-time.utility'
import { AgentEventListenerService } from '../../ai/orchestrator/agent-event-listener.service'
import { ConnectorsRepository } from '../../connectors/connectors.repository'
import type { Job } from '@prisma/client'

@Injectable()
export class ConnectorSyncHandler {
  private readonly logger = new Logger(ConnectorSyncHandler.name)

  constructor(
    private readonly connectorsRepository: ConnectorsRepository,
    @Optional()
    @Inject(forwardRef(() => AgentEventListenerService))
    private readonly agentEventListener: AgentEventListenerService | null
  ) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = job.payload as Record<string, unknown> | null
    const connectorId = payload?.['connectorId'] as string | undefined

    if (!connectorId) {
      throw new Error('connectorId is required in job payload')
    }

    const connector = await this.connectorsRepository.findByIdAndTenant(connectorId, job.tenantId)

    if (!connector) {
      throw new Error(`Connector ${connectorId} not found for tenant ${job.tenantId}`)
    }

    this.logger.log(
      `Syncing connector ${connector.name} (${connector.type}) for tenant ${job.tenantId}`
    )

    // Actual sync logic would be connector-type-specific
    // For now, update the lastSyncedAt timestamp
    await this.connectorsRepository.updateById(connectorId, {
      lastSyncAt: nowDate(),
    })

    const result = {
      connectorId,
      connectorType: connector.type,
      syncedAt: toIso(),
    }

    // Fire-and-forget — notify AI after successful connector sync
    if (this.agentEventListener) {
      void this.agentEventListener.onConnectorSyncCompleted(
        job.tenantId,
        connectorId,
        connector.type
      )
    }

    return result
  }
}
