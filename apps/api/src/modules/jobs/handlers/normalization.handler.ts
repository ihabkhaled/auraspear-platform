import { Injectable, Logger } from '@nestjs/common'
import { nowDate, toIso } from '../../../common/utils/date-time.utility'
import { NormalizationExecutor } from '../../normalization/normalization.executor'
import { NormalizationRepository } from '../../normalization/normalization.repository'
import type { NormalizationStep } from '../../normalization/normalization.types'
import type { Job } from '@prisma/client'

@Injectable()
export class NormalizationHandler {
  private readonly logger = new Logger(NormalizationHandler.name)

  constructor(
    private readonly normalizationRepository: NormalizationRepository,
    private readonly normalizationExecutor: NormalizationExecutor
  ) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = job.payload as Record<string, unknown> | null
    const pipelineId = payload?.['pipelineId'] as string | undefined

    if (!pipelineId) {
      throw new Error('pipelineId is required in job payload')
    }

    const pipeline = await this.normalizationRepository.findFirstPipelineByIdAndTenant(
      pipelineId,
      job.tenantId
    )

    if (!pipeline) {
      throw new Error(`Normalization pipeline ${pipelineId} not found for tenant ${job.tenantId}`)
    }

    if (pipeline.status !== 'active') {
      this.logger.warn(
        `Pipeline ${pipelineId} is not active (status=${pipeline.status}), skipping execution`
      )
      return {
        pipelineId,
        pipelineName: pipeline.name,
        skipped: true,
        reason: `Pipeline status is ${pipeline.status}`,
      }
    }

    this.logger.log(
      `Executing normalization pipeline "${pipeline.name}" for tenant ${job.tenantId}`
    )

    // Parse steps from the pipeline's fieldMappings configuration
    const steps = Array.isArray(pipeline.fieldMappings)
      ? (pipeline.fieldMappings as unknown as NormalizationStep[])
      : []

    // Execute pipeline with empty events (foundation for real event ingestion)
    const events: Record<string, unknown>[] = []
    const { result } = await this.normalizationExecutor.executePipeline(
      { id: pipeline.id, name: pipeline.name, steps },
      events
    )

    // Update pipeline metrics
    const currentProcessedCount = Number(pipeline.processedCount)
    await this.normalizationRepository.updateManyPipelinesByIdAndTenant(pipelineId, job.tenantId, {
      processedCount: BigInt(currentProcessedCount + result.outputCount),
      errorCount: pipeline.errorCount + result.errors.length,
      lastProcessedAt: nowDate(),
    })

    return {
      pipelineId,
      pipelineName: pipeline.name,
      status: result.status,
      inputCount: result.inputCount,
      outputCount: result.outputCount,
      droppedCount: result.droppedCount,
      errorCount: result.errors.length,
      durationMs: result.durationMs,
      executedAt: toIso(),
    }
  }
}
