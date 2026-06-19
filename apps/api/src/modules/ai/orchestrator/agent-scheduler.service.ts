import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { OrchestratorService } from './orchestrator.service'
import { ScheduleService } from './schedule/schedule.service'
import { AgentActionType, AppLogFeature } from '../../../common/enums'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { ServiceLogger } from '../../../common/services/service-logger'
import { elapsedMs, nowMs } from '../../../common/utils/date-time.utility'
import type { ScheduleRecord } from './schedule/schedule.types'

/**
 * Infrastructure heartbeat that polls due schedules from the database
 * and dispatches them through the orchestrator.
 *
 * All business schedules are stored in the `ai_agent_schedules` table.
 * This service is the ONLY place that uses @Cron — a single 30-second tick.
 */
@Injectable()
export class AgentSchedulerService {
  private readonly log: ServiceLogger

  constructor(
    private readonly orchestratorService: OrchestratorService,
    private readonly scheduleService: ScheduleService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.AI, 'AgentSchedulerService')
  }

  /**
   * Infrastructure heartbeat — every 30 seconds.
   * Queries all due schedules from the DB and dispatches them.
   */
  @Cron('*/30 * * * * *')
  async processDueSchedules(): Promise<number> {
    const dueSchedules = await this.scheduleService.findDueSchedules()

    if (dueSchedules.length === 0) {
      return 0
    }

    const results = await Promise.allSettled(
      dueSchedules.map(schedule => this.dispatchSchedule(schedule))
    )

    const dispatched = this.countSuccessful(results)

    for (let index = 0; index < results.length; index += 1) {
      const result = results.at(index)
      const schedule = dueSchedules.at(index)
      if (result?.status === 'rejected' && schedule) {
        const errorMessage =
          result.reason instanceof Error ? result.reason.message : 'Unknown error'
        this.log.warn(
          'processDueSchedules',
          schedule.tenantId ?? 'system',
          `Failed to dispatch schedule ${schedule.id} (${schedule.seedKey}): ${errorMessage}`,
          { scheduleId: schedule.id, seedKey: schedule.seedKey, error: errorMessage }
        )
      }
    }

    if (dispatched > 0) {
      this.log.success('processDueSchedules', 'system', {
        totalDue: dueSchedules.length,
        dispatched,
      })
    }

    return dispatched
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Dispatch a single schedule                               */
  /* ---------------------------------------------------------------- */

  private async dispatchSchedule(schedule: ScheduleRecord): Promise<void> {
    const startTime = nowMs()

    // Mark run started and compute next run time
    await this.scheduleService.markRunStarted(
      schedule.id,
      schedule.tenantId,
      schedule.cronExpression,
      schedule.timezone
    )

    try {
      const effectiveTenantId = schedule.tenantId ?? 'system'

      await this.orchestratorService.dispatchAgentTask({
        tenantId: effectiveTenantId,
        agentId: schedule.agentId,
        actionType: AgentActionType.REVIEW,
        payload: {
          source: 'scheduler:heartbeat',
          scheduleId: schedule.id,
          module: schedule.module,
          executionMode: schedule.executionMode,
          riskMode: schedule.riskMode,
        },
        triggeredBy: 'system:scheduler',
      })

      const durationMs = elapsedMs(startTime)
      await this.scheduleService.markRunCompleted(
        schedule.id,
        schedule.tenantId,
        'dispatched',
        durationMs
      )
    } catch (error) {
      const durationMs = elapsedMs(startTime)
      const reason = error instanceof Error ? error.message : 'Unknown dispatch error'
      await this.scheduleService.markRunCompleted(
        schedule.id,
        schedule.tenantId,
        'failed',
        durationMs
      )
      await this.scheduleService.setDisabledReason(schedule.id, schedule.tenantId, reason)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Helpers                                                   */
  /* ---------------------------------------------------------------- */

  private countSuccessful(results: PromiseSettledResult<unknown>[]): number {
    return results.filter(r => r.status === 'fulfilled').length
  }
}
