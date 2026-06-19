import { Inject, Injectable, forwardRef } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CronExpressionParser } from 'cron-parser'
import { ScheduleRepository } from './schedule.repository'
import { AgentActionType, AppLogFeature } from '../../../../common/enums'
import { BusinessException } from '../../../../common/exceptions/business.exception'
import { AppLoggerService } from '../../../../common/services/app-logger.service'
import { ServiceLogger } from '../../../../common/services/service-logger'
import { toIso } from '../../../../common/utils/date-time.utility'
import { OrchestratorService } from '../orchestrator.service'
import type { UpdateScheduleDto } from './dto/update-schedule.dto'
import type {
  FindAllForTenantOptions,
  ScheduleDetail,
  ScheduleListItem,
  ScheduleRecord,
} from './schedule.types'

@Injectable()
export class ScheduleService {
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: ScheduleRepository,
    @Inject(forwardRef(() => OrchestratorService))
    private readonly orchestratorService: OrchestratorService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.AI, 'ScheduleService')
  }

  /* ---------------------------------------------------------------- */
  /* LIST SCHEDULES                                                    */
  /* ---------------------------------------------------------------- */

  async listSchedules(
    tenantId: string,
    options?: FindAllForTenantOptions
  ): Promise<ScheduleListItem[]> {
    const schedules = await this.repository.findAllForTenant(tenantId, options)
    return schedules.map(s => this.toListItem(s))
  }

  /* ---------------------------------------------------------------- */
  /* GET SCHEDULE                                                      */
  /* ---------------------------------------------------------------- */

  async getSchedule(tenantId: string, id: string): Promise<ScheduleDetail> {
    const schedule = await this.findAndVerifyAccess(tenantId, id)
    return this.toDetail(schedule)
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE SCHEDULE                                                   */
  /* ---------------------------------------------------------------- */

  async updateSchedule(
    tenantId: string,
    id: string,
    dto: UpdateScheduleDto,
    actor: string
  ): Promise<ScheduleDetail> {
    const schedule = await this.findAndVerifyAccess(tenantId, id)

    if (dto.cronExpression) {
      this.validateCronExpression(dto.cronExpression)
    }

    const updateData = this.buildUpdateData(dto, schedule, actor)
    const updated = await this.repository.updateSchedule(id, tenantId, updateData)
    if (!updated) {
      throw new BusinessException(404, 'Schedule not found', 'errors.schedule.notFound')
    }

    this.log.success('updateSchedule', tenantId, { scheduleId: id, actor })

    return this.toDetail(updated)
  }

  /* ---------------------------------------------------------------- */
  /* TOGGLE ENABLED                                                    */
  /* ---------------------------------------------------------------- */

  async toggleEnabled(
    tenantId: string,
    id: string,
    enabled: boolean,
    actor: string
  ): Promise<ScheduleDetail> {
    const schedule = await this.findAndVerifyAccess(tenantId, id)

    const nextRunAt =
      enabled && !schedule.isPaused
        ? this.computeNextRun(schedule.cronExpression, schedule.timezone)
        : null

    const updated = await this.repository.updateSchedule(id, tenantId, {
      isEnabled: enabled,
      nextRunAt,
      disabledReason: enabled ? null : undefined,
      updatedBy: actor,
    })
    if (!updated) {
      throw new BusinessException(404, 'Schedule not found', 'errors.schedule.notFound')
    }

    this.log.success('toggleEnabled', tenantId, {
      scheduleId: id,
      enabled,
      actor,
    })

    return this.toDetail(updated)
  }

  /* ---------------------------------------------------------------- */
  /* TOGGLE PAUSED                                                     */
  /* ---------------------------------------------------------------- */

  async togglePaused(
    tenantId: string,
    id: string,
    paused: boolean,
    actor: string
  ): Promise<ScheduleDetail> {
    const schedule = await this.findAndVerifyAccess(tenantId, id)

    const nextRunAt =
      !paused && schedule.isEnabled
        ? this.computeNextRun(schedule.cronExpression, schedule.timezone)
        : null

    const updated = await this.repository.updateSchedule(id, tenantId, {
      isPaused: paused,
      nextRunAt,
      updatedBy: actor,
    })
    if (!updated) {
      throw new BusinessException(404, 'Schedule not found', 'errors.schedule.notFound')
    }

    this.log.success('togglePaused', tenantId, {
      scheduleId: id,
      paused,
      actor,
    })

    return this.toDetail(updated)
  }

  /* ---------------------------------------------------------------- */
  /* RUN NOW                                                           */
  /* ---------------------------------------------------------------- */

  async runNow(tenantId: string, id: string, actor: string): Promise<{ jobId: string }> {
    const schedule = await this.findAndVerifyAccess(tenantId, id)

    const effectiveTenantId = schedule.tenantId ?? tenantId

    const result = await this.orchestratorService.dispatchAgentTask({
      tenantId: effectiveTenantId,
      agentId: schedule.agentId,
      actionType: AgentActionType.REVIEW,
      payload: {
        source: 'schedule:run-now',
        scheduleId: schedule.id,
        module: schedule.module,
      },
      triggeredBy: actor,
    })

    this.log.success('runNow', tenantId, {
      scheduleId: id,
      jobId: result.jobId,
      actor,
    })

    return { jobId: result.jobId }
  }

  /* ---------------------------------------------------------------- */
  /* RESET TO DEFAULT                                                  */
  /* ---------------------------------------------------------------- */

  async resetToDefault(tenantId: string, id: string, actor: string): Promise<ScheduleDetail> {
    const schedule = await this.findAndVerifyAccess(tenantId, id)

    if (!schedule.isSystemDefault) {
      throw new BusinessException(
        400,
        'Only system-default schedules can be reset',
        'errors.schedule.notSystemDefault'
      )
    }

    const updated = await this.repository.updateSchedule(id, tenantId, {
      isEnabled: false,
      isPaused: false,
      executionMode: 'suggest_only',
      riskMode: 'low',
      approvalMode: 'not_required',
      maxConcurrency: 1,
      providerPreference: null,
      modelPreference: null,
      scopeJson: Prisma.JsonNull,
      failureStreak: 0,
      successStreak: 0,
      lastStatus: null,
      lastDurationMs: null,
      disabledReason: null,
      nextRunAt: null,
      updatedBy: actor,
    })
    if (!updated) {
      throw new BusinessException(404, 'Schedule not found', 'errors.schedule.notFound')
    }

    this.log.success('resetToDefault', tenantId, {
      scheduleId: id,
      actor,
    })

    return this.toDetail(updated)
  }

  /* ---------------------------------------------------------------- */
  /* COMPUTE NEXT RUN (public for scheduler use)                       */
  /* ---------------------------------------------------------------- */

  computeNextRun(cronExpression: string, timezone: string): Date {
    return this.repository.computeNextRun(cronExpression, timezone)
  }

  /* ---------------------------------------------------------------- */
  /* MARK RUN STARTED / COMPLETED (for scheduler heartbeat)            */
  /* ---------------------------------------------------------------- */

  async markRunStarted(
    id: string,
    tenantId: string | null,
    cronExpression: string,
    timezone: string
  ): Promise<void> {
    const nextRunAt = this.computeNextRun(cronExpression, timezone)
    await this.repository.markRunStarted(id, tenantId, nextRunAt)
  }

  async markRunCompleted(
    id: string,
    tenantId: string | null,
    status: string,
    durationMs: number
  ): Promise<void> {
    const result = await this.repository.markRunCompleted(id, tenantId, status, durationMs)
    if (!result) {
      throw new BusinessException(404, 'Schedule not found', 'errors.schedule.notFound')
    }
  }

  async setDisabledReason(id: string, tenantId: string | null, reason: string): Promise<void> {
    const schedule = await this.repository.findById(id)
    if (!schedule) {
      return
    }
    const effectiveTenantId = tenantId ?? schedule.tenantId
    if (effectiveTenantId) {
      await this.repository.updateSchedule(id, effectiveTenantId, { disabledReason: reason })
    }
  }

  async bulkToggle(
    tenantId: string,
    enabled: boolean,
    actor: string
  ): Promise<{ updated: number }> {
    const result = await this.repository.bulkToggle(tenantId, enabled)
    this.log.success('bulkToggle', tenantId, { enabled, actor, updated: result.count })
    return { updated: result.count }
  }

  /* ---------------------------------------------------------------- */
  /* FIND DUE SCHEDULES (for heartbeat)                                */
  /* ---------------------------------------------------------------- */

  async findDueSchedules(): Promise<ScheduleRecord[]> {
    return this.repository.findDueSchedules()
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Helpers                                                   */
  /* ---------------------------------------------------------------- */

  /**
   * Computes the next run time if the schedule is active, otherwise keeps the existing value.
   */
  private computeNextRunForUpdate(
    schedule: ScheduleRecord,
    cronExpression: string,
    timezone: string
  ): Date | null {
    if (schedule.isEnabled && !schedule.isPaused) {
      return this.computeNextRun(cronExpression, timezone)
    }
    return schedule.nextRunAt
  }

  /**
   * Builds the Prisma update payload from the DTO, applying only defined fields.
   */
  private buildUpdateData(
    dto: UpdateScheduleDto,
    schedule: ScheduleRecord,
    actor: string
  ): Prisma.AiAgentScheduleUpdateInput {
    const timezone = dto.timezone ?? schedule.timezone
    const cronExpression = dto.cronExpression ?? schedule.cronExpression
    const nextRunAt = this.computeNextRunForUpdate(schedule, cronExpression, timezone)

    const data: Prisma.AiAgentScheduleUpdateInput = {
      nextRunAt,
      updatedBy: actor,
    }

    this.applyScalarFields(data, dto)
    this.applyScopeJson(data, dto)

    return data
  }

  /**
   * Copies defined scalar fields from the DTO into the update payload.
   */
  private applyScalarFields(data: Prisma.AiAgentScheduleUpdateInput, dto: UpdateScheduleDto): void {
    if (dto.cronExpression !== undefined) {
      data.cronExpression = dto.cronExpression
    }
    if (dto.timezone !== undefined) {
      data.timezone = dto.timezone
    }
    if (dto.executionMode !== undefined) {
      data.executionMode = dto.executionMode
    }
    if (dto.riskMode !== undefined) {
      data.riskMode = dto.riskMode
    }
    if (dto.approvalMode !== undefined) {
      data.approvalMode = dto.approvalMode
    }
    if (dto.maxConcurrency !== undefined) {
      data.maxConcurrency = dto.maxConcurrency
    }
    if (dto.providerPreference !== undefined) {
      data.providerPreference = dto.providerPreference
    }
    if (dto.modelPreference !== undefined) {
      data.modelPreference = dto.modelPreference
    }
  }

  /**
   * Applies the scopeJson field, converting null to Prisma.JsonNull.
   */
  private applyScopeJson(data: Prisma.AiAgentScheduleUpdateInput, dto: UpdateScheduleDto): void {
    if (dto.scopeJson !== undefined) {
      data.scopeJson =
        dto.scopeJson === null ? Prisma.JsonNull : (dto.scopeJson as Prisma.InputJsonValue)
    }
  }

  private async findAndVerifyAccess(tenantId: string, id: string): Promise<ScheduleRecord> {
    const schedule = await this.repository.findById(id, tenantId)
    if (!schedule) {
      throw new BusinessException(404, 'Schedule not found', 'errors.schedule.notFound')
    }

    return schedule
  }

  private validateCronExpression(expression: string): void {
    try {
      CronExpressionParser.parse(expression)
    } catch {
      throw new BusinessException(
        400,
        `Invalid cron expression: ${expression}`,
        'errors.schedule.invalidCron'
      )
    }
  }

  private toListItem(schedule: ScheduleRecord): ScheduleListItem {
    return {
      id: schedule.id,
      tenantId: schedule.tenantId,
      agentId: schedule.agentId,
      seedKey: schedule.seedKey,
      module: schedule.module,
      cronExpression: schedule.cronExpression,
      timezone: schedule.timezone,
      isEnabled: schedule.isEnabled,
      isPaused: schedule.isPaused,
      executionMode: schedule.executionMode,
      riskMode: schedule.riskMode,
      approvalMode: schedule.approvalMode,
      maxConcurrency: schedule.maxConcurrency,
      providerPreference: schedule.providerPreference,
      modelPreference: schedule.modelPreference,
      isSystemDefault: schedule.isSystemDefault,
      lastRunAt: schedule.lastRunAt ? toIso(schedule.lastRunAt) : null,
      nextRunAt: schedule.nextRunAt ? toIso(schedule.nextRunAt) : null,
      lastStatus: schedule.lastStatus,
      lastDurationMs: schedule.lastDurationMs,
      failureStreak: schedule.failureStreak,
      successStreak: schedule.successStreak,
      createdAt: toIso(schedule.createdAt),
      updatedAt: toIso(schedule.updatedAt),
    }
  }

  private toDetail(schedule: ScheduleRecord): ScheduleDetail {
    return {
      ...this.toListItem(schedule),
      allowOverlap: schedule.allowOverlap,
      dedupeWindowSeconds: schedule.dedupeWindowSeconds,
      scopeJson: schedule.scopeJson,
      disabledReason: schedule.disabledReason,
      createdBy: schedule.createdBy,
      updatedBy: schedule.updatedBy,
    }
  }
}
