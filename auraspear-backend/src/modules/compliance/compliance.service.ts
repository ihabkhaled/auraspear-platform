import { Injectable, Logger } from '@nestjs/common'
import { ComplianceRepository } from './compliance.repository'
import {
  buildFrameworkListWhere,
  buildFrameworkOrderBy,
  buildFrameworkUpdateData,
  buildControlUpdateData,
  buildFrameworkRecord,
  buildControlRecord,
  buildComplianceStats,
  buildControlStatsBatchMap,
} from './compliance.utilities'
import { AppLogFeature, SortOrder } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowDate } from '../../common/utils/date-time.utility'
import type {
  ComplianceFrameworkRecord,
  PaginatedFrameworks,
  ComplianceControlRecord,
  ComplianceStats,
} from './compliance.types'
import type { CreateControlDto } from './dto/create-control.dto'
import type { CreateFrameworkDto } from './dto/create-framework.dto'
import type { UpdateControlDto } from './dto/update-control.dto'
import type { UpdateFrameworkDto } from './dto/update-framework.dto'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: ComplianceRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.COMPLIANCE, 'ComplianceService')
  }

  /* ---------------------------------------------------------------- */
  /* RESOLVE HELPERS                                                    */
  /* ---------------------------------------------------------------- */

  private async resolveNamesBatch(emails: (string | null)[]): Promise<Map<string, string>> {
    const uniqueEmails = [...new Set(emails.filter((e): e is string => e !== null))]
    if (uniqueEmails.length === 0) return new Map()
    const users = await this.repository.findUsersByEmails(uniqueEmails)
    const map = new Map<string, string>()
    for (const u of users) {
      map.set(u.email, u.name)
    }
    return map
  }

  private async resolveName(email: string | null): Promise<string | null> {
    if (!email) return null
    const user = await this.repository.findUserByEmail(email)
    return user?.name ?? null
  }

  /* ---------------------------------------------------------------- */
  /* CONTROL STATS BATCH (private)                                     */
  /* ---------------------------------------------------------------- */

  private async getControlStatsBatch(
    frameworkIds: string[]
  ): Promise<Map<string, { total: number; passed: number; failed: number }>> {
    if (frameworkIds.length === 0) return new Map()

    const controls = await this.repository.groupByControls({
      by: ['frameworkId', 'status'],
      where: { frameworkId: { in: frameworkIds } },
      _count: { id: true },
    })

    return buildControlStatsBatchMap(controls)
  }

  /* ---------------------------------------------------------------- */
  /* LIST FRAMEWORKS (paginated, tenant-scoped)                        */
  /* ---------------------------------------------------------------- */

  async listFrameworks(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    standard?: string,
    query?: string
  ): Promise<PaginatedFrameworks> {
    this.log.entry('listFrameworks', tenantId, { page, limit, standard, query })

    try {
      const where = buildFrameworkListWhere(tenantId, standard, query)

      const [frameworks, total] = await Promise.all([
        this.repository.findManyFrameworksWithTenant({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: buildFrameworkOrderBy(sortBy, sortOrder),
        }),
        this.repository.countFrameworks(where),
      ])

      // Get control stats for each framework
      const frameworkIds = frameworks.map(f => f.id)
      const controlStats = await this.getControlStatsBatch(frameworkIds)

      const data: ComplianceFrameworkRecord[] = frameworks.map(f =>
        buildFrameworkRecord(f, controlStats.get(f.id))
      )

      this.log.success('listFrameworks', tenantId, {
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
      this.log.error('listFrameworks', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET FRAMEWORK BY ID                                               */
  /* ---------------------------------------------------------------- */

  async getFrameworkById(id: string, tenantId: string): Promise<ComplianceFrameworkRecord> {
    this.log.entry('getFrameworkById', tenantId, { frameworkId: id })

    try {
      const framework = await this.repository.findFirstFrameworkWithTenant({ id, tenantId })

      if (!framework) {
        this.log.warn('getFrameworkById', tenantId, 'Framework not found', { frameworkId: id })
        throw new BusinessException(
          404,
          `Framework ${id} not found`,
          'errors.compliance.frameworkNotFound'
        )
      }

      const stats = await this.getControlStatsBatch([framework.id])

      this.log.success('getFrameworkById', tenantId, { frameworkId: id })
      return buildFrameworkRecord(framework, stats.get(framework.id))
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('getFrameworkById', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE FRAMEWORK                                                  */
  /* ---------------------------------------------------------------- */

  async createFramework(
    dto: CreateFrameworkDto,
    user: JwtPayload
  ): Promise<ComplianceFrameworkRecord> {
    this.log.entry('createFramework', user.tenantId, {
      name: dto.name,
      standard: dto.standard,
      version: dto.version,
    })

    try {
      const existing = await this.repository.findFirstFramework({
        tenantId: user.tenantId,
        standard: dto.standard,
        version: dto.version,
      })

      if (existing) {
        throw new BusinessException(
          409,
          `Framework with standard ${dto.standard} version ${dto.version} already exists`,
          'errors.compliance.frameworkAlreadyExists'
        )
      }

      const framework = await this.repository.createFramework({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description ?? null,
        standard: dto.standard,
        version: dto.version,
      })

      this.log.success('createFramework', user.tenantId, {
        name: framework.name,
        standard: framework.standard,
      })
      return buildFrameworkRecord(framework)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('createFramework', user.tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE FRAMEWORK                                                  */
  /* ---------------------------------------------------------------- */

  async updateFramework(
    id: string,
    dto: UpdateFrameworkDto,
    user: JwtPayload
  ): Promise<ComplianceFrameworkRecord> {
    this.log.entry('updateFramework', user.tenantId, {
      frameworkId: id,
      updatedFields: Object.keys(dto),
    })

    try {
      await this.getFrameworkById(id, user.tenantId)

      const updated = await this.repository.updateManyFrameworks({
        where: { id, tenantId: user.tenantId },
        data: buildFrameworkUpdateData(dto),
      })

      if (updated.count === 0) {
        throw new BusinessException(
          404,
          `Framework ${id} not found`,
          'errors.compliance.frameworkNotFound'
        )
      }

      this.log.success('updateFramework', user.tenantId, { frameworkId: id })
      return this.getFrameworkById(id, user.tenantId)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('updateFramework', user.tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE FRAMEWORK                                                  */
  /* ---------------------------------------------------------------- */

  async deleteFramework(
    id: string,
    tenantId: string,
    actor: string
  ): Promise<{ deleted: boolean }> {
    this.log.entry('deleteFramework', tenantId, { frameworkId: id, actorEmail: actor })

    try {
      const existing = await this.getFrameworkById(id, tenantId)

      await this.repository.deleteFrameworkWithControls(id, tenantId)

      this.log.success('deleteFramework', tenantId, {
        frameworkId: id,
        name: existing.name,
        actorEmail: actor,
      })
      return { deleted: true }
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('deleteFramework', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* LIST CONTROLS                                                     */
  /* ---------------------------------------------------------------- */

  async listControls(frameworkId: string, tenantId: string): Promise<ComplianceControlRecord[]> {
    this.log.entry('listControls', tenantId, { frameworkId })

    try {
      // Verify framework exists and belongs to tenant
      await this.getFrameworkById(frameworkId, tenantId)

      const controls = await this.repository.findManyControls({
        where: { frameworkId },
        orderBy: { controlNumber: SortOrder.ASC },
      })

      const assessorMap = await this.resolveNamesBatch(controls.map(c => c.assessedBy))

      const data = controls.map(c =>
        buildControlRecord(c, c.assessedBy ? (assessorMap.get(c.assessedBy) ?? null) : null)
      )

      this.log.success('listControls', tenantId, { frameworkId, returnedCount: data.length })
      return data
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('listControls', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE CONTROL                                                    */
  /* ---------------------------------------------------------------- */

  async createControl(
    frameworkId: string,
    dto: CreateControlDto,
    user: JwtPayload
  ): Promise<ComplianceControlRecord> {
    this.log.entry('createControl', user.tenantId, {
      frameworkId,
      controlNumber: dto.controlNumber,
    })

    try {
      // Verify framework exists and belongs to tenant
      await this.getFrameworkById(frameworkId, user.tenantId)

      const control = await this.repository.createControl({
        frameworkId,
        controlNumber: dto.controlNumber,
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status,
        evidence: dto.evidence ?? null,
        assessedAt: nowDate(),
        assessedBy: user.email,
      })

      this.log.success('createControl', user.tenantId, {
        frameworkId,
        controlNumber: control.controlNumber,
      })
      const assessedByName = await this.resolveName(control.assessedBy)
      return buildControlRecord(control, assessedByName)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('createControl', user.tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE CONTROL                                                    */
  /* ---------------------------------------------------------------- */

  async updateControl(
    frameworkId: string,
    controlId: string,
    dto: UpdateControlDto,
    user: JwtPayload
  ): Promise<ComplianceControlRecord> {
    this.log.entry('updateControl', user.tenantId, {
      frameworkId,
      controlId,
      updatedFields: Object.keys(dto),
    })

    try {
      await this.getFrameworkById(frameworkId, user.tenantId)
      await this.findControlOrThrow(controlId, frameworkId)

      await this.repository.updateManyControls({
        where: { id: controlId, frameworkId },
        data: buildControlUpdateData(dto, user.email),
      })

      this.log.success('updateControl', user.tenantId, { frameworkId, controlId })
      return this.fetchUpdatedControl(controlId, user.tenantId)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('updateControl', user.tenantId, error)
      }
      throw error
    }
  }

  private async findControlOrThrow(controlId: string, frameworkId: string): Promise<void> {
    const existing = await this.repository.findFirstControl({
      where: { id: controlId, frameworkId },
    })
    if (!existing) {
      throw new BusinessException(
        404,
        `Control ${controlId} not found`,
        'errors.compliance.controlNotFound'
      )
    }
  }

  private async fetchUpdatedControl(
    controlId: string,
    tenantId: string
  ): Promise<ComplianceControlRecord> {
    const updated = await this.repository.findControlByIdAndTenant(controlId, tenantId)
    if (!updated) {
      throw new BusinessException(
        404,
        `Control ${controlId} not found after update`,
        'errors.compliance.controlNotFound'
      )
    }
    const assessedByName = await this.resolveName(updated.assessedBy)
    return buildControlRecord(updated, assessedByName)
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getComplianceStats(tenantId: string): Promise<ComplianceStats> {
    this.log.entry('getComplianceStats', tenantId, {})

    try {
      const [totalFrameworks, controlCounts] = await Promise.all([
        this.repository.countFrameworks({ tenantId }),
        this.repository.groupByControlStatus({ framework: { tenantId } }),
      ])

      this.log.success('getComplianceStats', tenantId, { totalFrameworks })
      return buildComplianceStats(totalFrameworks, controlCounts)
    } catch (error: unknown) {
      this.log.error('getComplianceStats', tenantId, error)
      throw error
    }
  }
}
