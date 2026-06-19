import { Injectable, Logger } from '@nestjs/common'
import { nowDate, toIso } from '../../../common/utils/date-time.utility'
import { CorrelationExecutor } from '../../correlation/correlation.executor'
import { CorrelationRepository } from '../../correlation/correlation.repository'
import type { CorrelationEvent } from '../../correlation/correlation.types'
import type { Job } from '@prisma/client'

interface CorrelationConditions {
  eventTypes?: string[]
  threshold?: number
  timeWindowMinutes?: number
  groupBy?: string
}

@Injectable()
export class CorrelationHandler {
  private readonly logger = new Logger(CorrelationHandler.name)

  constructor(
    private readonly correlationRepository: CorrelationRepository,
    private readonly correlationExecutor: CorrelationExecutor
  ) {}

  async handle(job: Job): Promise<Record<string, unknown>> {
    const payload = job.payload as Record<string, unknown> | null
    const ruleId = payload?.['ruleId'] as string | undefined

    if (!ruleId) {
      throw new Error('ruleId is required in job payload')
    }

    const rule = await this.correlationRepository.findFirstWithTenant({
      id: ruleId,
      tenantId: job.tenantId,
    })

    if (!rule) {
      throw new Error(`Correlation rule ${ruleId} not found for tenant ${job.tenantId}`)
    }

    if (rule.status !== 'active') {
      this.logger.warn(
        `Correlation rule ${ruleId} is not active (status=${rule.status}), skipping execution`
      )
      return {
        ruleId,
        ruleTitle: rule.title,
        skipped: true,
        reason: `Rule status is ${rule.status}`,
      }
    }

    this.logger.log(`Evaluating correlation rule "${rule.title}" for tenant ${job.tenantId}`)

    // Parse conditions from the rule's JSON conditions field
    const conditions = (rule.conditions ?? {}) as CorrelationConditions

    // Evaluate rule with empty events (foundation for real event ingestion)
    const events: CorrelationEvent[] = []
    const result = await this.correlationExecutor.evaluateRule(
      {
        id: rule.id,
        name: rule.title,
        eventTypes: conditions.eventTypes ?? [],
        threshold: conditions.threshold ?? 1,
        timeWindowMinutes: conditions.timeWindowMinutes ?? 5,
        groupBy: conditions.groupBy,
      },
      events
    )

    // Update rule metrics if triggered
    if (result.status === 'triggered') {
      await this.correlationRepository.update({
        where: { id: ruleId, tenantId: job.tenantId },
        data: {
          hitCount: rule.hitCount + 1,
          lastFiredAt: nowDate(),
        },
      })
    }

    return {
      ruleId,
      ruleTitle: rule.title,
      status: result.status,
      eventsCorrelated: result.eventsCorrelated,
      triggeredAt: result.triggeredAt ?? null,
      description: result.description ?? null,
      durationMs: result.durationMs,
      executedAt: toIso(),
    }
  }
}
