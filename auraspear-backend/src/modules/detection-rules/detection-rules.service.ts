import { Injectable } from '@nestjs/common'
import { DetectionRulesExecutor } from './detection-rules.executor'
import { DetectionRulesRepository } from './detection-rules.repository'
import {
  buildDetectionRuleRecord,
  buildRuleListWhere,
  buildRuleOrderBy,
  buildRuleUpdateData,
  buildDetectionRuleStats,
} from './detection-rules.utilities'
import { AppLogFeature, DetectionRuleStatus } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type {
  DetectionExecutionResult,
  DetectionRuleRecord,
  DetectionRuleStats,
  PaginatedDetectionRules,
} from './detection-rules.types'
import type { CreateDetectionRuleDto } from './dto/create-detection-rule.dto'
import type { UpdateDetectionRuleDto } from './dto/update-detection-rule.dto'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { Prisma } from '@prisma/client'

@Injectable()
export class DetectionRulesService {
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: DetectionRulesRepository,
    private readonly appLogger: AppLoggerService,
    private readonly executor: DetectionRulesExecutor
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.DETECTION_RULES,
      'DetectionRulesService'
    )
  }

  /* ---------------------------------------------------------------- */
  /* LIST (paginated, tenant-scoped)                                   */
  /* ---------------------------------------------------------------- */

  async listRules(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    ruleType?: string,
    severity?: string,
    status?: string,
    query?: string
  ): Promise<PaginatedDetectionRules> {
    this.log.entry('listRules', tenantId, { page, limit, ruleType, severity, status, query })

    try {
      const where = buildRuleListWhere(tenantId, ruleType, severity, status, query)
      const orderBy = buildRuleOrderBy(sortBy, sortOrder)

      const [rules, total] = await Promise.all([
        this.repository.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy }),
        this.repository.count(where),
      ])

      const data: DetectionRuleRecord[] = rules.map(buildDetectionRuleRecord)
      this.log.success('listRules', tenantId, { page, limit, total, returnedCount: data.length })

      return { data, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('listRules', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET BY ID                                                         */
  /* ---------------------------------------------------------------- */

  async getRuleById(id: string, tenantId: string): Promise<DetectionRuleRecord> {
    this.log.debug('getRuleById', tenantId, 'starting', { ruleId: id })

    const rule = await this.repository.findFirst({
      where: { id, tenantId },
    })

    if (!rule) {
      this.log.warn('getRuleById', tenantId, 'not found', { ruleId: id })
      throw new BusinessException(
        404,
        `Detection rule ${id} not found`,
        'errors.detectionRules.notFound'
      )
    }

    this.log.success('getRuleById', tenantId, { ruleId: id, ruleNumber: rule.ruleNumber })

    return buildDetectionRuleRecord(rule)
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async createRule(dto: CreateDetectionRuleDto, user: JwtPayload): Promise<DetectionRuleRecord> {
    this.log.entry('createRule', user.tenantId, {
      name: dto.name,
      ruleType: dto.ruleType,
      severity: dto.severity,
    })

    try {
      const result = await this.repository.createInTransaction({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description ?? null,
        ruleType: dto.ruleType,
        severity: dto.severity,
        status: DetectionRuleStatus.TESTING,
        conditions: dto.conditions as Prisma.InputJsonValue,
        actions: dto.actions as Prisma.InputJsonValue,
        createdBy: user.email,
      })

      this.log.success('createRule', user.tenantId, {
        ruleNumber: result.ruleNumber,
        severity: result.severity,
      })
      return buildDetectionRuleRecord(result)
    } catch (error: unknown) {
      this.log.error('createRule', user.tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async updateRule(
    id: string,
    dto: UpdateDetectionRuleDto,
    user: JwtPayload
  ): Promise<DetectionRuleRecord> {
    this.log.entry('updateRule', user.tenantId, { updatedFields: Object.keys(dto) })

    try {
      await this.getRuleById(id, user.tenantId)
      await this.applyRuleUpdate(id, user.tenantId, buildRuleUpdateData(dto))

      this.log.success('updateRule', user.tenantId, { ruleId: id })
      return this.getRuleById(id, user.tenantId)
    } catch (error: unknown) {
      this.log.error('updateRule', user.tenantId, error, { ruleId: id })
      throw error
    }
  }

  private async applyRuleUpdate(
    id: string,
    tenantId: string,
    updateData: Prisma.DetectionRuleUpdateManyMutationInput
  ): Promise<void> {
    const updated = await this.repository.updateMany({
      where: { id, tenantId },
      data: updateData,
    })

    if (updated.count === 0) {
      throw new BusinessException(
        404,
        `Detection rule ${id} not found`,
        'errors.detectionRules.notFound'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* TOGGLE                                                            */
  /* ---------------------------------------------------------------- */

  async toggleRule(id: string, enabled: boolean, user: JwtPayload): Promise<DetectionRuleRecord> {
    this.log.entry('toggleRule', user.tenantId, { enabled })

    try {
      await this.getRuleById(id, user.tenantId)

      const newStatus = enabled ? DetectionRuleStatus.ACTIVE : DetectionRuleStatus.DISABLED
      await this.applyRuleStatusUpdate(id, user.tenantId, newStatus)

      this.log.success('toggleRule', user.tenantId, { enabled, newStatus })
      return this.getRuleById(id, user.tenantId)
    } catch (error: unknown) {
      this.log.error('toggleRule', user.tenantId, error)
      throw error
    }
  }

  private async applyRuleStatusUpdate(
    id: string,
    tenantId: string,
    status: DetectionRuleStatus
  ): Promise<void> {
    await this.applyRuleUpdate(id, tenantId, { status })
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async deleteRule(id: string, tenantId: string, actor: string): Promise<{ deleted: boolean }> {
    this.log.entry('deleteRule', tenantId, { ruleId: id, actorEmail: actor })

    try {
      const existing = await this.getRuleById(id, tenantId)

      await this.repository.deleteMany({ id, tenantId })

      this.log.success('deleteRule', tenantId, { ruleId: id, ruleNumber: existing.ruleNumber })

      return { deleted: true }
    } catch (error: unknown) {
      this.log.error('deleteRule', tenantId, error, { ruleId: id })
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* SIMULATE (dry-run)                                                */
  /* ---------------------------------------------------------------- */

  async simulateRule(
    id: string,
    tenantId: string,
    events: Record<string, unknown>[],
    actorEmail: string
  ): Promise<DetectionExecutionResult> {
    this.log.entry('simulateRule', tenantId, { ruleId: id, eventCount: events.length, actorEmail })

    try {
      const rule = await this.getRuleById(id, tenantId)

      const result = await this.executor.evaluateRule(
        { id: rule.id, name: rule.name, severity: rule.severity, conditions: rule.conditions },
        events
      )

      this.log.success('simulateRule', tenantId, {
        ruleId: id,
        inputCount: events.length,
        matchCount: result.matchCount,
        status: result.status,
        durationMs: result.durationMs,
      })
      return result
    } catch (error: unknown) {
      this.log.error('simulateRule', tenantId, error, { ruleId: id, eventCount: events.length })
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getDetectionRuleStats(tenantId: string): Promise<DetectionRuleStats> {
    this.log.entry('getDetectionRuleStats', tenantId)

    try {
      const [total, active, testing, disabled, aggregates] = await Promise.all([
        this.repository.count({ tenantId }),
        this.repository.countByStatus(tenantId, DetectionRuleStatus.ACTIVE),
        this.repository.countByStatus(tenantId, DetectionRuleStatus.TESTING),
        this.repository.countByStatus(tenantId, DetectionRuleStatus.DISABLED),
        this.repository.aggregateHitCount(tenantId),
      ])

      const stats = buildDetectionRuleStats(total, active, testing, disabled, aggregates)

      this.log.success('getDetectionRuleStats', tenantId, { total, active, testing, disabled })

      return stats
    } catch (error: unknown) {
      this.log.error('getDetectionRuleStats', tenantId, error)
      throw error
    }
  }
}
