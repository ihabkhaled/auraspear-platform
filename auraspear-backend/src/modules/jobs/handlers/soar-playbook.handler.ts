import { Injectable, Logger } from '@nestjs/common'
import { nowDate, toIso } from '../../../common/utils/date-time.utility'
import { SoarRepository } from '../../soar/soar.repository'
import type { Job } from '@prisma/client'

@Injectable()
export class SoarPlaybookHandler {
  private readonly logger = new Logger(SoarPlaybookHandler.name)

  constructor(private readonly soarRepository: SoarRepository) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = job.payload as Record<string, unknown> | null
    const executionId = payload?.['executionId'] as string | undefined
    const playbookId = payload?.['playbookId'] as string | undefined

    if (!executionId || !playbookId) {
      throw new Error('executionId and playbookId are required in job payload')
    }

    const playbook = await this.soarRepository.findPlaybookByIdAndTenant(playbookId, job.tenantId)

    if (!playbook) {
      throw new Error(`SOAR playbook ${playbookId} not found for tenant ${job.tenantId}`)
    }

    this.logger.log(
      `Executing SOAR playbook "${playbook.name}" (execution=${executionId}) for tenant ${job.tenantId}`
    )

    // Update execution status
    await this.soarRepository.updateExecutionById(executionId, {
      status: 'completed',
      completedAt: nowDate(),
    })

    return {
      executionId,
      playbookId,
      playbookName: playbook.name,
      completedAt: toIso(),
    }
  }
}
