import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CorrelationExecutor } from './correlation.executor'
import { CorrelationRepository } from './correlation.repository'
import {
  buildRuleListWhere,
  buildRuleOrderBy,
  buildRuleUpdateData,
  buildCorrelationStats,
  extractCorrelationRuleInput,
  buildRuleRecord,
  buildRuleRecordList,
  buildCorrelationEvents,
} from './correlation.utilities'
import { AppLogFeature, RuleSource, RuleStatus } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { daysAgo, getYear } from '../../common/utils/date-time.utility'
import type {
  CorrelationResult,
  CorrelationStats,
  PaginatedRules,
  RuleRecord,
} from './correlation.types'
import type { CreateRuleDto } from './dto/create-rule.dto'
import type { UpdateRuleDto } from './dto/update-rule.dto'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Injectable()
export class CorrelationService {
  private readonly logger = new Logger(CorrelationService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: CorrelationRepository,
    private readonly appLogger: AppLoggerService,
    private readonly executor: CorrelationExecutor
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CORRELATION, 'CorrelationService')
  }

  /**
   * Lists correlation rules for a tenant with pagination, filtering, and search.
   */
  async listRules(
    tenantId: string,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: string,
    source?: string,
    severity?: string,
    status?: string,
    query?: string
  ): Promise<PaginatedRules> {
    this.log.entry('listRules', tenantId, { page, limit, source, severity, status, query })

    try {
      const where = buildRuleListWhere(tenantId, source, severity, status, query)
      const data = await this.fetchRulesWithCreators(where, sortBy, sortOrder, page, limit)
      const total = await this.repository.count(where)

      this.log.success('listRules', tenantId, { page, limit, total, returnedCount: data.length })
      return { data, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('listRules', tenantId, error)
      throw error
    }
  }

  private async fetchRulesWithCreators(
    where: ReturnType<typeof buildRuleListWhere>,
    sortBy: string,
    sortOrder: string,
    page: number,
    limit: number
  ): Promise<RuleRecord[]> {
    const rules = await this.repository.findManyWithTenant({
      where,
      orderBy: buildRuleOrderBy(sortBy, sortOrder),
      skip: (page - 1) * limit,
      take: limit,
    })

    const creatorEmails = [...new Set(rules.map(r => r.createdBy))]
    const creators = await this.repository.findUsersByEmails(creatorEmails)
    const creatorMap = new Map(creators.map(c => [c.email, c.name]))
    return buildRuleRecordList(rules, creatorMap)
  }

  /**
   * Gets a single correlation rule by ID, scoped to tenant.
   */
  async getRuleById(id: string, tenantId: string): Promise<RuleRecord> {
    this.log.debug('getRuleById', tenantId, 'starting', { ruleId: id })

    const rule = await this.repository.findFirstWithTenant({ id, tenantId })

    if (!rule) {
      this.log.warn('getRuleById', tenantId, 'rule not found', { ruleId: id })
      throw new BusinessException(404, 'Rule not found', 'errors.correlation.notFound')
    }

    const creator = await this.repository.findUserNameByEmail(rule.createdBy)
    this.log.success('getRuleById', tenantId, { ruleId: id })

    return buildRuleRecord(rule, creator?.name ?? null)
  }

  /**
   * Creates a new correlation rule with a sequential rule number.
   */
  async createRule(dto: CreateRuleDto, user: JwtPayload): Promise<RuleRecord> {
    this.log.entry('createRule', user.tenantId, {
      title: dto.title,
      source: dto.source,
      severity: dto.severity,
    })

    try {
      const prefix = dto.source === RuleSource.SIGMA ? 'SIG' : 'COR'
      const ruleNumber = await this.generateRuleNumber(user.tenantId, prefix)

      const rule = await this.repository.createWithTenant({
        tenantId: user.tenantId,
        ruleNumber,
        title: dto.title,
        description: dto.description,
        source: dto.source,
        severity: dto.severity,
        status: RuleStatus.ACTIVE,
        yamlContent: dto.yamlContent,
        conditions: dto.conditions ? (dto.conditions as Prisma.InputJsonValue) : Prisma.DbNull,
        mitreTactics: dto.mitreTactics ?? [],
        mitreTechniques: dto.mitreTechniques ?? [],
        createdBy: user.email,
      })

      const creator = await this.repository.findUserNameByEmail(user.email)
      this.logger.log(
        `User ${user.email} created correlation rule ${ruleNumber} for tenant ${user.tenantId}`
      )
      this.log.success('createRule', user.tenantId, {
        ruleNumber,
        source: dto.source,
        severity: dto.severity,
      })

      return buildRuleRecord(rule, creator?.name ?? null)
    } catch (error: unknown) {
      this.log.error('createRule', user.tenantId, error, { title: dto.title })
      throw error
    }
  }

  /**
   * Updates an existing correlation rule, verifying tenant ownership.
   */
  async updateRule(id: string, dto: UpdateRuleDto, user: JwtPayload): Promise<RuleRecord> {
    this.log.entry('updateRule', user.tenantId, { updatedFields: Object.keys(dto), ruleId: id })

    try {
      await this.ensureRuleExists(id, user.tenantId, 'updateRule')

      const rule = await this.repository.updateWithTenant({
        where: { id, tenantId: user.tenantId },
        data: buildRuleUpdateData(dto),
      })

      if (!rule) {
        throw new BusinessException(
          404,
          'Rule not found after update',
          'errors.correlation.notFound'
        )
      }

      const creator = await this.repository.findUserNameByEmail(rule.createdBy)
      this.logger.log(`User ${user.email} updated correlation rule ${id}`)
      this.log.success('updateRule', user.tenantId, { ruleId: id, updatedFields: Object.keys(dto) })

      return buildRuleRecord(rule, creator?.name ?? null)
    } catch (error: unknown) {
      if (error instanceof BusinessException) throw error
      this.log.error('updateRule', user.tenantId, error, { ruleId: id })
      throw error
    }
  }

  /**
   * Toggles a correlation rule between active and disabled status.
   */
  async toggleRule(id: string, enabled: boolean, user: JwtPayload): Promise<RuleRecord> {
    this.log.entry('toggleRule', user.tenantId, { enabled, ruleId: id })

    try {
      await this.ensureRuleExists(id, user.tenantId, 'toggleRule')

      const newStatus = enabled ? RuleStatus.ACTIVE : RuleStatus.DISABLED
      const rule = await this.repository.updateWithTenant({
        where: { id, tenantId: user.tenantId },
        data: { status: newStatus },
      })

      if (!rule) {
        throw new BusinessException(
          404,
          'Rule not found after toggle',
          'errors.correlation.notFound'
        )
      }

      const creator = await this.repository.findUserNameByEmail(rule.createdBy)
      this.logger.log(`User ${user.email} toggled correlation rule ${id} to ${newStatus}`)
      this.log.success('toggleRule', user.tenantId, { ruleId: id, enabled, newStatus })

      return buildRuleRecord(rule, creator?.name ?? null)
    } catch (error: unknown) {
      if (error instanceof BusinessException) throw error
      this.log.error('toggleRule', user.tenantId, error, { ruleId: id })
      throw error
    }
  }

  /**
   * Deletes a correlation rule, verifying tenant ownership.
   */
  async deleteRule(id: string, tenantId: string, email: string): Promise<{ deleted: boolean }> {
    this.log.entry('deleteRule', tenantId, { ruleId: id, actorEmail: email })

    try {
      const existing = await this.repository.findFirstSelect(
        { id, tenantId },
        { id: true, ruleNumber: true }
      )

      if (!existing) {
        this.log.warn('deleteRule', tenantId, 'rule not found', { ruleId: id })
        throw new BusinessException(404, 'Rule not found', 'errors.correlation.notFound')
      }

      await this.repository.deleteByIdAndTenantId(id, tenantId)

      const { ruleNumber } = existing as { ruleNumber: string }
      this.logger.log(`User ${email} deleted correlation rule ${ruleNumber} (${id})`)
      this.log.success('deleteRule', tenantId, { ruleId: id, ruleNumber })

      return { deleted: true }
    } catch (error: unknown) {
      if (error instanceof BusinessException) throw error
      this.log.error('deleteRule', tenantId, error, { ruleId: id })
      throw error
    }
  }

  /**
   * Returns correlation statistics for a tenant.
   */
  async getCorrelationStats(tenantId: string): Promise<CorrelationStats> {
    this.log.entry('getCorrelationStats', tenantId)

    try {
      const twentyFourHoursAgo = daysAgo(1)

      const [correlationRules, sigmaRules, fired24hResult, linkedResult] = await Promise.all([
        this.repository.count({ tenantId, source: { not: 'sigma' } }),
        this.repository.count({ tenantId, source: 'sigma' }),
        this.repository.aggregate({
          where: { tenantId, lastFiredAt: { gte: twentyFourHoursAgo } },
          _sum: { hitCount: true },
        }),
        this.repository.aggregate({
          where: { tenantId },
          _sum: { linkedIncidents: true },
        }),
      ])

      this.log.success('getCorrelationStats', tenantId, { correlationRules, sigmaRules })
      return buildCorrelationStats(correlationRules, sigmaRules, fired24hResult, linkedResult)
    } catch (error: unknown) {
      this.log.error('getCorrelationStats', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* TEST (dry-run)                                                      */
  /* ---------------------------------------------------------------- */

  async testRule(
    id: string,
    tenantId: string,
    events: Record<string, unknown>[],
    actorEmail: string
  ): Promise<CorrelationResult> {
    this.log.entry('testRule', tenantId, { ruleId: id, eventCount: events.length, actorEmail })

    try {
      const rule = await this.getRuleById(id, tenantId)
      const correlationEvents = buildCorrelationEvents(events)
      const ruleInput = extractCorrelationRuleInput(rule)
      const result = await this.executor.evaluateRule(ruleInput, correlationEvents)

      this.log.success('testRule', tenantId, {
        ruleId: id,
        actorEmail,
        inputCount: events.length,
        status: result.status,
        eventsCorrelated: result.eventsCorrelated,
        durationMs: result.durationMs,
      })

      return result
    } catch (error: unknown) {
      this.log.error('testRule', tenantId, error, { ruleId: id, eventCount: events.length })
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE HELPERS                                                     */
  /* ---------------------------------------------------------------- */

  private async ensureRuleExists(id: string, tenantId: string, action: string): Promise<void> {
    const existing = await this.repository.findFirstSelect({ id, tenantId }, { id: true })

    if (!existing) {
      this.log.warn(action, tenantId, 'rule not found', { ruleId: id })
      throw new BusinessException(404, 'Rule not found', 'errors.correlation.notFound')
    }
  }

  private async generateRuleNumber(tenantId: string, prefix: string): Promise<string> {
    const year = getYear()
    const searchPrefix = `${prefix}-${year}-`
    const lastRule = await this.repository.findLastRuleByPrefix(tenantId, searchPrefix)

    let nextNumber = 1
    if (lastRule?.ruleNumber) {
      const parts = lastRule.ruleNumber.split('-')
      const lastSegment = parts[parts.length - 1]
      if (lastSegment) {
        const parsed = Number.parseInt(lastSegment, 10)
        if (!Number.isNaN(parsed)) {
          nextNumber = parsed + 1
        }
      }
    }

    return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`
  }
}
