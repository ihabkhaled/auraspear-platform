import { Injectable } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { JobType } from './enums/job.enums'
import { SCHEDULE_INTERVAL_MS } from './jobs.constants'
import { JobService } from './jobs.service'
import { countScheduleResults, getCurrentScheduleWindow } from './jobs.utilities'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class JobSchedulerService {
  private readonly log: ServiceLogger
  private readonly enabled: boolean

  constructor(
    private readonly jobService: JobService,
    private readonly prisma: PrismaService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.JOBS, 'JobSchedulerService')
    // Only enable automatic scheduling when ENABLE_JOB_SCHEDULER=true
    // Without real event ingestion, auto-scheduling creates noise
    this.enabled = process.env['ENABLE_JOB_SCHEDULER'] === 'true'
  }

  /**
   * Every 5 minutes, enqueue detection and correlation rule execution jobs
   * for all active rules across all tenants.
   * Only runs when ENABLE_JOB_SCHEDULER=true.
   */
  @Interval(SCHEDULE_INTERVAL_MS)
  async scheduleRuleExecution(): Promise<void> {
    if (!this.enabled) {
      this.log.skipped('scheduleRuleExecution', '', 'Scheduler disabled')
      return
    }

    this.log.entry('scheduleRuleExecution', '', { intervalMs: SCHEDULE_INTERVAL_MS })

    try {
      const detectionCount = await this.scheduleDetectionRules()
      const correlationCount = await this.scheduleCorrelationRules()

      if (detectionCount > 0 || correlationCount > 0) {
        this.log.success('scheduleRuleExecution', '', {
          detectionRulesEnqueued: detectionCount,
          correlationRulesEnqueued: correlationCount,
          intervalMs: SCHEDULE_INTERVAL_MS,
        })
      }
    } catch (error) {
      this.log.error('scheduleRuleExecution', '', error)
    }
  }

  private async scheduleDetectionRules(): Promise<number> {
    this.log.debug('scheduleDetectionRules', '', 'Starting detection rule scheduling')

    // TODO: Extract to DetectionRulesRepository.findActiveRules() — direct Prisma
    // access in services violates the repository pattern.
    const activeRules = await this.prisma.detectionRule.findMany({
      where: { status: 'active' },
      select: { id: true, tenantId: true, name: true },
    })

    const currentWindow = getCurrentScheduleWindow()
    const results = await Promise.allSettled(
      activeRules.map(rule =>
        this.jobService.enqueue({
          tenantId: rule.tenantId,
          type: JobType.DETECTION_RULE_EXECUTION,
          payload: { ruleId: rule.id },
          maxAttempts: 1,
          idempotencyKey: `detection:${rule.id}:${currentWindow}`,
        })
      )
    )

    const { enqueued, rejectedIndices } = countScheduleResults(results)
    this.logRejectedRules(rejectedIndices, activeRules, 'scheduleDetectionRules', 'DetectionRule')
    return enqueued
  }

  private async scheduleCorrelationRules(): Promise<number> {
    this.log.debug('scheduleCorrelationRules', '', 'Starting correlation rule scheduling')

    // TODO: Extract to CorrelationRulesRepository.findActiveRules() — direct Prisma
    // access in services violates the repository pattern.
    const activeRules = await this.prisma.correlationRule.findMany({
      where: { status: 'active' },
      select: { id: true, tenantId: true, title: true },
    })

    const currentWindow = getCurrentScheduleWindow()
    const results = await Promise.allSettled(
      activeRules.map(rule =>
        this.jobService.enqueue({
          tenantId: rule.tenantId,
          type: JobType.CORRELATION_RULE_EXECUTION,
          payload: { ruleId: rule.id },
          maxAttempts: 1,
          idempotencyKey: `correlation:${rule.id}:${currentWindow}`,
        })
      )
    )

    const { enqueued, rejectedIndices } = countScheduleResults(results)
    this.logRejectedRules(
      rejectedIndices,
      activeRules,
      'scheduleCorrelationRules',
      'CorrelationRule'
    )
    return enqueued
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logRejectedRules(
    rejectedIndices: number[],
    rules: Array<{ id: string; tenantId: string; name?: string; title?: string }>,
    functionName: string,
    resourceName: string
  ): void {
    for (const index of rejectedIndices) {
      const rule = rules.at(index)
      if (rule) {
        this.log.warn(functionName, rule.tenantId, `Failed to enqueue ${resourceName} ${rule.id}`, {
          resourceName,
          resourceId: rule.id,
          ruleName: rule.name ?? rule.title,
        })
      }
    }
  }
}
