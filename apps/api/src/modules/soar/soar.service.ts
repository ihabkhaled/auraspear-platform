import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { SoarRepository } from './soar.repository'
import {
  buildPlaybookListWhere,
  buildPlaybookOrderBy,
  buildPlaybookUpdateData,
  buildPlaybookRecord,
  buildExecutionRecord,
  buildSoarStats,
} from './soar.utilities'
import {
  AppLogFeature,
  SoarPlaybookStatus,
  SoarExecutionStatus,
  SortOrder,
} from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type { CreatePlaybookDto } from './dto/create-playbook.dto'
import type { UpdatePlaybookDto } from './dto/update-playbook.dto'
import type {
  SoarPlaybookRecord,
  PaginatedPlaybooks,
  SoarExecutionRecord,
  PaginatedExecutions,
  SoarStats,
} from './soar.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Injectable()
export class SoarService {
  private readonly logger = new Logger(SoarService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: SoarRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.SOAR, 'SoarService')
  }

  /* ---------------------------------------------------------------- */
  /* RESOLVE HELPERS                                                    */
  /* ---------------------------------------------------------------- */

  private async resolveCreatorName(email: string | null): Promise<string | null> {
    if (!email) return null
    const user = await this.repository.findUserByEmail(email)
    return user?.name ?? null
  }

  private async resolveCreatorNamesBatch(emails: (string | null)[]): Promise<Map<string, string>> {
    const uniqueEmails = [...new Set(emails.filter((e): e is string => e !== null))]
    if (uniqueEmails.length === 0) return new Map()
    const users = await this.repository.findUsersByEmails(uniqueEmails)
    const map = new Map<string, string>()
    for (const u of users) {
      map.set(u.email, u.name)
    }
    return map
  }

  /* ---------------------------------------------------------------- */
  /* LIST PLAYBOOKS (paginated, tenant-scoped)                         */
  /* ---------------------------------------------------------------- */

  async listPlaybooks(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    status?: string,
    triggerType?: string,
    query?: string
  ): Promise<PaginatedPlaybooks> {
    this.log.entry('listPlaybooks', tenantId, { page, limit, status, triggerType, query })

    try {
      const where = buildPlaybookListWhere(tenantId, status, triggerType, query)

      const [playbooks, total] = await Promise.all([
        this.repository.findManyPlaybooksWithTenant({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: buildPlaybookOrderBy(sortBy, sortOrder),
        }),
        this.repository.countPlaybooks(where),
      ])

      const creatorsMap = await this.resolveCreatorNamesBatch(playbooks.map(p => p.createdBy))

      const data: SoarPlaybookRecord[] = playbooks.map(p =>
        buildPlaybookRecord(p, p.createdBy ? (creatorsMap.get(p.createdBy) ?? null) : null)
      )

      this.log.success('listPlaybooks', tenantId, {
        page,
        limit,
        total,
        returnedCount: data.length,
      })

      return {
        data,
        pagination: buildPaginationMeta(page, limit, total),
      }
    } catch (error: unknown) {
      this.log.error('listPlaybooks', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET PLAYBOOK BY ID                                                */
  /* ---------------------------------------------------------------- */

  async getPlaybookById(id: string, tenantId: string): Promise<SoarPlaybookRecord> {
    this.log.entry('getPlaybookById', tenantId, { playbookId: id })

    try {
      const playbook = await this.repository.findFirstPlaybookWithTenant({ id, tenantId })

      if (!playbook) {
        this.log.warn('getPlaybookById', tenantId, 'Playbook not found', { playbookId: id })
        throw new BusinessException(404, `Playbook ${id} not found`, 'errors.soar.playbookNotFound')
      }

      const createdByName = await this.resolveCreatorName(playbook.createdBy)

      this.log.success('getPlaybookById', tenantId, { playbookId: id })
      return buildPlaybookRecord(playbook, createdByName)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('getPlaybookById', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE PLAYBOOK                                                   */
  /* ---------------------------------------------------------------- */

  async createPlaybook(dto: CreatePlaybookDto, user: JwtPayload): Promise<SoarPlaybookRecord> {
    this.log.entry('createPlaybook', user.tenantId, {
      name: dto.name,
      triggerType: dto.triggerType,
    })

    try {
      const existing = await this.repository.findFirstPlaybookWithTenant({
        tenantId: user.tenantId,
        name: dto.name,
      })

      if (existing) {
        throw new BusinessException(
          409,
          `Playbook with name "${dto.name}" already exists`,
          'errors.soar.playbookAlreadyExists'
        )
      }

      const playbook = await this.repository.createPlaybookWithTenant({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description ?? null,
        triggerType: dto.triggerType,
        triggerConditions: dto.triggerConditions
          ? (dto.triggerConditions as Prisma.InputJsonValue)
          : Prisma.DbNull,
        steps: dto.steps as Prisma.InputJsonValue,
        status: SoarPlaybookStatus.DRAFT,
        executionCount: 0,
        createdBy: user.email,
      })

      this.log.success('createPlaybook', user.tenantId, {
        name: playbook.name,
        triggerType: playbook.triggerType,
      })
      const createdByName = await this.resolveCreatorName(playbook.createdBy)
      return buildPlaybookRecord(playbook, createdByName)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('createPlaybook', user.tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE PLAYBOOK                                                   */
  /* ---------------------------------------------------------------- */

  async updatePlaybook(
    id: string,
    dto: UpdatePlaybookDto,
    user: JwtPayload
  ): Promise<SoarPlaybookRecord> {
    this.log.entry('updatePlaybook', user.tenantId, {
      playbookId: id,
      updatedFields: Object.keys(dto),
    })

    try {
      await this.getPlaybookById(id, user.tenantId)

      const updated = await this.repository.updateManyPlaybooks({
        where: { id, tenantId: user.tenantId },
        data: buildPlaybookUpdateData(dto),
      })

      if (updated.count === 0) {
        throw new BusinessException(404, `Playbook ${id} not found`, 'errors.soar.playbookNotFound')
      }

      this.log.success('updatePlaybook', user.tenantId, { playbookId: id })
      return this.getPlaybookById(id, user.tenantId)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('updatePlaybook', user.tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE PLAYBOOK                                                   */
  /* ---------------------------------------------------------------- */

  async deletePlaybook(id: string, tenantId: string, actor: string): Promise<{ deleted: boolean }> {
    this.log.entry('deletePlaybook', tenantId, { playbookId: id, actorEmail: actor })

    try {
      const existing = await this.getPlaybookById(id, tenantId)

      await this.repository.deleteManyPlaybooks({ id, tenantId })

      this.log.success('deletePlaybook', tenantId, {
        playbookId: id,
        name: existing.name,
        actorEmail: actor,
      })
      return { deleted: true }
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('deletePlaybook', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* LIST EXECUTIONS                                                   */
  /* ---------------------------------------------------------------- */

  async listExecutions(
    tenantId: string,
    playbookId?: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedExecutions> {
    this.log.entry('listExecutions', tenantId, { playbookId, page, limit })

    try {
      const where: Prisma.SoarExecutionWhereInput = { tenantId }

      if (playbookId) {
        where.playbookId = playbookId
      }

      const [executions, total] = await Promise.all([
        this.repository.findManyExecutionsWithPlaybook({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { startedAt: SortOrder.DESC },
        }),
        this.repository.countExecutions(where),
      ])

      const creatorsMap = await this.resolveCreatorNamesBatch(executions.map(e => e.triggeredBy))

      const data: SoarExecutionRecord[] = executions.map(e =>
        buildExecutionRecord(e, e.triggeredBy ? (creatorsMap.get(e.triggeredBy) ?? null) : null)
      )

      this.log.success('listExecutions', tenantId, {
        playbookId,
        page,
        limit,
        total,
        returnedCount: data.length,
      })

      return {
        data,
        pagination: buildPaginationMeta(page, limit, total),
      }
    } catch (error: unknown) {
      this.log.error('listExecutions', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* EXECUTE PLAYBOOK                                                  */
  /* ---------------------------------------------------------------- */

  async executePlaybook(id: string, user: JwtPayload): Promise<SoarExecutionRecord> {
    this.log.entry('executePlaybook', user.tenantId, { playbookId: id })

    try {
      const playbook = await this.getPlaybookById(id, user.tenantId)

      if (playbook.status !== SoarPlaybookStatus.ACTIVE) {
        throw new BusinessException(
          400,
          'Only active playbooks can be executed',
          'errors.soar.playbookNotActive'
        )
      }

      const execution = await this.repository.executePlaybookTransaction({
        playbookId: id,
        tenantId: user.tenantId,
        triggeredBy: user.email,
      })

      this.log.success('executePlaybook', user.tenantId, {
        playbookId: id,
        playbookName: playbook.name,
      })
      const triggeredByName = await this.resolveCreatorName(execution.triggeredBy)
      return buildExecutionRecord(execution, triggeredByName)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('executePlaybook', user.tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getSoarStats(tenantId: string): Promise<SoarStats> {
    this.log.entry('getSoarStats', tenantId, {})

    try {
      const counts = await this.fetchSoarStatCounts(tenantId)

      this.log.success('getSoarStats', tenantId, {
        totalPlaybooks: counts.totalPlaybooks,
        activePlaybooks: counts.activePlaybooks,
        totalExecutions: counts.totalExecutions,
      })

      return buildSoarStats(
        counts.totalPlaybooks,
        counts.activePlaybooks,
        counts.totalExecutions,
        counts.successfulExecutions,
        counts.failedExecutions,
        counts.avgExecutionTimeMs
      )
    } catch (error: unknown) {
      this.log.error('getSoarStats', tenantId, error)
      throw error
    }
  }

  private async fetchSoarStatCounts(tenantId: string): Promise<{
    totalPlaybooks: number
    activePlaybooks: number
    totalExecutions: number
    successfulExecutions: number
    failedExecutions: number
    avgExecutionTimeMs: number | null
  }> {
    const [
      totalPlaybooks,
      activePlaybooks,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      avgExecutionTimeMs,
    ] = await Promise.all([
      this.repository.countPlaybooks({ tenantId }),
      this.repository.countPlaybooks({ tenantId, status: SoarPlaybookStatus.ACTIVE }),
      this.repository.countExecutions({ tenantId }),
      this.repository.countExecutions({ tenantId, status: SoarExecutionStatus.COMPLETED }),
      this.repository.countExecutions({ tenantId, status: SoarExecutionStatus.FAILED }),
      this.repository.getAvgExecutionTimeMs(tenantId),
    ])

    return {
      totalPlaybooks,
      activePlaybooks,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      avgExecutionTimeMs,
    }
  }
}
