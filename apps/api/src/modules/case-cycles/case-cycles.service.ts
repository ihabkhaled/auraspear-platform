import { Injectable, Logger } from '@nestjs/common'
import { CaseCyclesRepository } from './case-cycles.repository'
import {
  applyAutoDeactivation,
  buildCycleOrderBy,
  buildCycleUpdateData,
  buildCycleWhereClause,
  countOpenAndClosed,
  datesOverlap,
  isFutureStart,
  isPastEnd,
  mapCycleToRecord,
} from './case-cycles.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType, CaseCycleStatus } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowDate } from '../../common/utils/date-time.utility'
import type { CaseCycleDetail, CaseCycleRecord, PaginatedCaseCycles } from './case-cycles.types'
import type { CloseCaseCycleDto } from './dto/close-case-cycle.dto'
import type { CreateCaseCycleDto } from './dto/create-case-cycle.dto'
import type { UpdateCaseCycleDto } from './dto/update-case-cycle.dto'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { Case, CaseCycle, Prisma } from '@prisma/client'

@Injectable()
export class CaseCyclesService {
  private readonly logger = new Logger(CaseCyclesService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly caseCyclesRepository: CaseCyclesRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CASE_CYCLES, 'CaseCyclesService')
  }

  /* ---------------------------------------------------------------- */
  /* LIST                                                              */
  /* ---------------------------------------------------------------- */

  async listCycles(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    status?: string
  ): Promise<PaginatedCaseCycles> {
    const where = buildCycleWhereClause(tenantId, status)
    const [cycles, total] = await this.caseCyclesRepository.findManyWithCasesAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: buildCycleOrderBy(sortBy, sortOrder),
    })

    const data = cycles.map(mapCycleToRecord)
    this.log.success('listCycles', tenantId, {
      page,
      limit,
      total,
      status: status ?? null,
    })
    return { data, pagination: buildPaginationMeta(page, limit, total) }
  }

  /* ---------------------------------------------------------------- */
  /* ORPHANED STATS                                                    */
  /* ---------------------------------------------------------------- */

  async getOrphanedStats(
    tenantId: string
  ): Promise<{ caseCount: number; openCount: number; closedCount: number }> {
    const [total, openCases, closedCases] =
      await this.caseCyclesRepository.countOrphanedCases(tenantId)
    return { caseCount: total, openCount: openCases, closedCount: closedCases }
  }

  /* ---------------------------------------------------------------- */
  /* GET ACTIVE CYCLE                                                  */
  /* ---------------------------------------------------------------- */

  async getActiveCycle(tenantId: string): Promise<CaseCycleRecord | null> {
    const cycle = await this.caseCyclesRepository.findFirstActive(tenantId)
    if (!cycle) {
      this.log.success('getActiveCycle', tenantId)
      return null
    }
    this.log.success('getActiveCycle', tenantId, { targetResourceId: cycle.id })
    return mapCycleToRecord(cycle)
  }

  /* ---------------------------------------------------------------- */
  /* GET BY ID                                                         */
  /* ---------------------------------------------------------------- */

  async getCycleById(id: string, tenantId: string): Promise<CaseCycleDetail> {
    const cycle = await this.findCycleDetailOrThrow(id, tenantId, 'getCycleById')
    const ownerMap = await this.resolveOwnerMap(cycle.cases)
    const casesWithOwners = this.enrichCasesWithOwners(cycle.cases, ownerMap)
    const { openCount, closedCount } = countOpenAndClosed(cycle.cases)
    const { cases: _cases, _count, ...rest } = cycle

    this.log.success('getCycleById', tenantId, {
      targetResourceId: id,
      caseCount: _count.cases,
      openCount,
      closedCount,
    })
    return { ...rest, cases: casesWithOwners, caseCount: _count.cases, openCount, closedCount }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async createCycle(dto: CreateCaseCycleDto, user: JwtPayload): Promise<CaseCycleRecord> {
    this.validateDateOrder(dto.startDate, dto.endDate ?? null)
    await this.checkDateOverlap(user.tenantId, dto.startDate, dto.endDate ?? null)

    const cycle = await this.caseCyclesRepository.create({
      tenantId: user.tenantId,
      name: dto.name,
      description: dto.description ?? null,
      status: CaseCycleStatus.CLOSED,
      startDate: dto.startDate,
      endDate: dto.endDate ?? null,
      createdBy: user.email,
    })

    this.log.success('createCycle', user.tenantId, {
      targetResourceId: cycle.id,
      cycleName: cycle.name,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return { ...cycle, caseCount: 0, openCount: 0, closedCount: 0 }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async updateCycle(
    id: string,
    dto: UpdateCaseCycleDto,
    user: JwtPayload
  ): Promise<CaseCycleRecord> {
    const existing = await this.findCycleWithCountsOrThrow(id, user.tenantId)
    const startDate = dto.startDate ?? existing.startDate
    const endDate = dto.endDate ?? existing.endDate
    this.validateDateOrder(startDate, endDate)

    const datesChanged = dto.startDate !== undefined || dto.endDate !== undefined
    if (datesChanged) {
      await this.checkDateOverlap(user.tenantId, startDate, endDate, id)
    }

    const updateData = buildCycleUpdateData(dto)
    applyAutoDeactivation(updateData, existing.status, startDate, endDate, datesChanged, user.email)
    await this.caseCyclesRepository.update(id, user.tenantId, updateData)

    const refreshed = await this.findCycleWithCountsOrThrow(id, user.tenantId)
    this.log.success('updateCycle', user.tenantId, {
      targetResourceId: id,
      updatedFields: Object.keys(dto),
      autoDeactivated: updateData['status'] === CaseCycleStatus.CLOSED,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return mapCycleToRecord(refreshed)
  }

  /* ---------------------------------------------------------------- */
  /* ACTIVATE                                                          */
  /* ---------------------------------------------------------------- */

  async activateCycle(id: string, user: JwtPayload): Promise<CaseCycleRecord> {
    const existing = await this.findCycleWithCountsOrThrow(id, user.tenantId)
    this.guardAlreadyActive(existing.status, id)
    this.guardActivationDateRange(existing.startDate, existing.endDate)

    const result = await this.caseCyclesRepository.activateCycleTransaction(
      id,
      user.tenantId,
      user.email
    )

    if (!result) {
      throw new BusinessException(
        404,
        `Case cycle ${id} not found after activation`,
        'errors.caseCycles.notFound'
      )
    }

    const { openCount, closedCount } = countOpenAndClosed(existing.cases)

    this.log.success('activateCycle', user.tenantId, {
      targetResourceId: id,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return { ...result, caseCount: existing._count.cases, openCount, closedCount }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async deleteCycle(id: string, user: JwtPayload): Promise<{ deleted: boolean }> {
    const existing = await this.findCycleWithCaseCountOrThrow(id, user.tenantId)
    this.guardDeleteActive(existing.status)

    await (existing._count.cases > 0
      ? this.caseCyclesRepository.deleteCycleWithCasesTransaction(id, user.tenantId)
      : this.caseCyclesRepository.deleteCycle(id, user.tenantId))

    this.log.success('deleteCycle', user.tenantId, {
      targetResourceId: id,
      cycleName: existing.name,
      casesUnlinked: existing._count.cases,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* CLOSE                                                             */
  /* ---------------------------------------------------------------- */

  async closeCycle(id: string, dto: CloseCaseCycleDto, user: JwtPayload): Promise<CaseCycleRecord> {
    const existing = await this.findCycleWithCountsOrThrow(id, user.tenantId)
    this.guardAlreadyClosed(existing.status, id, user)

    const now = nowDate()
    await this.caseCyclesRepository.update(id, user.tenantId, {
      status: CaseCycleStatus.CLOSED,
      closedBy: user.email,
      closedAt: now,
      endDate: dto.endDate ?? now,
    })

    const refreshed = await this.findCycleWithCountsOrThrow(id, user.tenantId)
    this.log.success('closeCycle', user.tenantId, {
      targetResourceId: id,
      cycleName: existing.name,
      caseCount: refreshed._count.cases,
      actorEmail: user.email,
      actorUserId: user.sub,
    })
    return mapCycleToRecord(refreshed)
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Finders (or-throw)                                       */
  /* ---------------------------------------------------------------- */

  private async findCycleWithCountsOrThrow(
    id: string,
    tenantId: string
  ): Promise<CaseCycle & { _count: { cases: number }; cases: { status: string }[] }> {
    const cycle = await this.caseCyclesRepository.findFirstByIdAndTenantWithCounts(id, tenantId)
    if (!cycle) {
      throw new BusinessException(404, `Case cycle ${id} not found`, 'errors.caseCycles.notFound')
    }
    return cycle
  }

  private async findCycleWithCaseCountOrThrow(
    id: string,
    tenantId: string
  ): Promise<CaseCycle & { _count: { cases: number } }> {
    const cycle = await this.caseCyclesRepository.findFirstByIdAndTenantWithCaseCount(id, tenantId)
    if (!cycle) {
      throw new BusinessException(404, `Case cycle ${id} not found`, 'errors.caseCycles.notFound')
    }
    return cycle
  }

  private async findCycleDetailOrThrow(
    id: string,
    tenantId: string,
    action: string
  ): Promise<
    Prisma.CaseCycleGetPayload<{
      include: {
        _count: { select: { cases: true } }
        cases: { orderBy: { createdAt: 'desc' }; include: { tenant: { select: { name: true } } } }
      }
    }>
  > {
    const cycle = await this.caseCyclesRepository.findFirstByIdAndTenantWithCases(id, tenantId)
    if (!cycle) {
      this.log.warn(action, tenantId, 'CaseCycle not found', { targetResourceId: id })
      throw new BusinessException(404, `Case cycle ${id} not found`, 'errors.caseCycles.notFound')
    }
    return cycle
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Validation Guards                                        */
  /* ---------------------------------------------------------------- */

  private validateDateOrder(startDate: Date, endDate: Date | null): void {
    if (endDate && startDate >= endDate) {
      throw new BusinessException(
        400,
        'Start date must be before end date',
        'errors.caseCycles.startAfterEnd'
      )
    }
  }

  private guardAlreadyActive(status: string, _id: string): void {
    if (status === CaseCycleStatus.ACTIVE) {
      throw new BusinessException(
        400,
        'This cycle is already active',
        'errors.caseCycles.alreadyActive'
      )
    }
  }

  private guardActivationDateRange(startDate: Date, endDate: Date | null): void {
    if (isFutureStart(startDate)) {
      throw new BusinessException(
        400,
        'Cannot activate: cycle start date is in the future',
        'errors.caseCycles.activationOutsideRange'
      )
    }
    if (isPastEnd(endDate)) {
      throw new BusinessException(
        400,
        'Cannot activate: cycle end date has passed',
        'errors.caseCycles.activationOutsideRange'
      )
    }
  }

  private guardDeleteActive(status: string): void {
    if (status === CaseCycleStatus.ACTIVE) {
      throw new BusinessException(
        400,
        'Cannot delete an active cycle. Close it first.',
        'errors.caseCycles.deleteActiveNotAllowed'
      )
    }
  }

  private guardAlreadyClosed(status: string, id: string, user: JwtPayload): void {
    if (status !== CaseCycleStatus.CLOSED) return
    this.logDenied('closeCycle', user.tenantId, id, user)
    throw new BusinessException(
      400,
      'This cycle is already closed',
      'errors.caseCycles.alreadyClosed'
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Overlap Check                                            */
  /* ---------------------------------------------------------------- */

  private async checkDateOverlap(
    tenantId: string,
    startDate: Date,
    endDate: Date | null,
    excludeId?: string
  ): Promise<void> {
    const where: Prisma.CaseCycleWhereInput = { tenantId }
    if (excludeId) {
      where.id = { not: excludeId }
    }

    const cycles = await this.caseCyclesRepository.findManyForOverlapCheck(where)
    for (const cycle of cycles) {
      if (datesOverlap(startDate, endDate, cycle.startDate, cycle.endDate)) {
        this.logDenied('checkDateOverlap', tenantId, cycle.id)
        throw new BusinessException(
          409,
          `Date range overlaps with existing cycle "${cycle.name}"`,
          'errors.caseCycles.dateOverlap'
        )
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Owner Resolution                                         */
  /* ---------------------------------------------------------------- */

  private async resolveOwnerMap(
    cases: Array<{ ownerUserId: string | null }>
  ): Promise<Map<string, { name: string | null; email: string }>> {
    const ids = [
      ...new Set(cases.map(c => c.ownerUserId).filter((id): id is string => id !== null)),
    ]
    if (ids.length === 0) return new Map()
    const owners = await this.caseCyclesRepository.findUsersByIds(ids)
    return new Map(owners.map(o => [o.id, { name: o.name, email: o.email }]))
  }

  private enrichCasesWithOwners(
    cases: Array<Case & { tenant: { name: string } }>,
    ownerMap: Map<string, { name: string | null; email: string }>
  ): Array<Case & { ownerName: string | null; ownerEmail: string | null }> {
    return cases.map(c => {
      const owner = c.ownerUserId ? ownerMap.get(c.ownerUserId) : undefined
      const { tenant: _tenant, ...caseData } = c
      return { ...caseData, ownerName: owner?.name ?? null, ownerEmail: owner?.email ?? null }
    })
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logDenied(
    action: string,
    tenantId: string,
    resourceId?: string,
    user?: JwtPayload
  ): void {
    this.appLogger.warn(`CaseCycle ${action} denied`, {
      feature: AppLogFeature.CASE_CYCLES,
      action,
      outcome: AppLogOutcome.DENIED,
      tenantId,
      actorEmail: user?.email,
      actorUserId: user?.sub,
      targetResource: 'CaseCycle',
      targetResourceId: resourceId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'CaseCyclesService',
      functionName: action,
    })
  }
}
