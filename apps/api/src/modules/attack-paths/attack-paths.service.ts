import { Injectable, Logger } from '@nestjs/common'
import { AttackPathsRepository } from './attack-paths.repository'
import {
  buildAttackPathListWhere,
  buildAttackPathOrderBy,
  buildAttackPathUpdateData,
} from './attack-paths.utilities'
import { AppLogFeature, AttackPathStatus } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type { AttackPathRecord, AttackPathStats, PaginatedAttackPaths } from './attack-paths.types'
import type { CreateAttackPathDto } from './dto/create-attack-path.dto'
import type { UpdateAttackPathDto } from './dto/update-attack-path.dto'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { Prisma } from '@prisma/client'

@Injectable()
export class AttackPathsService {
  private readonly logger = new Logger(AttackPathsService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: AttackPathsRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.ATTACK_PATHS, 'AttackPathsService')
  }

  /* ---------------------------------------------------------------- */
  /* LIST (paginated, tenant-scoped)                                   */
  /* ---------------------------------------------------------------- */

  async listPaths(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    severity?: string,
    status?: string,
    query?: string
  ): Promise<PaginatedAttackPaths> {
    this.log.entry('listPaths', tenantId, { page, limit, severity, status, query })

    try {
      const where = buildAttackPathListWhere(tenantId, severity, status, query)

      const [paths, total] = await Promise.all([
        this.repository.findManyWithTenant({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: buildAttackPathOrderBy(sortBy, sortOrder),
        }),
        this.repository.count(where),
      ])

      const data = paths.map(p => ({
        ...p,
        tenantName: p.tenant.name,
      }))

      this.log.success('listPaths', tenantId, { page, limit, total, returnedCount: data.length })

      return {
        data,
        pagination: buildPaginationMeta(page, limit, total),
      }
    } catch (error: unknown) {
      this.log.error('listPaths', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET BY ID                                                         */
  /* ---------------------------------------------------------------- */

  async getPathById(id: string, tenantId: string): Promise<AttackPathRecord> {
    this.log.entry('getPathById', tenantId, { attackPathId: id })

    try {
      const path = await this.repository.findFirstWithTenant({ id, tenantId })

      if (!path) {
        this.log.warn('getPathById', tenantId, 'Attack path not found', { attackPathId: id })
        throw new BusinessException(
          404,
          `Attack path ${id} not found`,
          'errors.attackPaths.notFound'
        )
      }

      this.log.success('getPathById', tenantId, { attackPathId: id })

      return {
        ...path,
        tenantName: path.tenant.name,
      }
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('getPathById', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async createPath(dto: CreateAttackPathDto, user: JwtPayload): Promise<AttackPathRecord> {
    this.log.entry('createPath', user.tenantId, { title: dto.title, severity: dto.severity })

    try {
      const result = await this.repository.createWithNumber({
        tenantId: user.tenantId,
        data: {
          title: dto.title,
          description: dto.description ?? null,
          severity: dto.severity,
          status: AttackPathStatus.ACTIVE,
          stages: dto.stages as Prisma.InputJsonValue,
          affectedAssets: dto.affectedAssets,
          killChainCoverage: dto.killChainCoverage,
          mitreTactics: dto.mitreTactics ?? [],
          mitreTechniques: dto.mitreTechniques ?? [],
        },
      })

      this.log.success('createPath', user.tenantId, {
        pathNumber: result.pathNumber,
        severity: result.severity,
      })
      return { ...result, tenantName: result.tenant.name }
    } catch (error: unknown) {
      this.log.error('createPath', user.tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async updatePath(
    id: string,
    dto: UpdateAttackPathDto,
    user: JwtPayload
  ): Promise<AttackPathRecord> {
    this.log.entry('updatePath', user.tenantId, {
      attackPathId: id,
      updatedFields: Object.keys(dto),
    })

    try {
      await this.getPathById(id, user.tenantId)

      const updated = await this.repository.updateMany({
        where: { id, tenantId: user.tenantId },
        data: buildAttackPathUpdateData(dto),
      })

      if (updated.count === 0) {
        throw new BusinessException(
          404,
          `Attack path ${id} not found`,
          'errors.attackPaths.notFound'
        )
      }

      this.log.success('updatePath', user.tenantId, { attackPathId: id })
      return this.getPathById(id, user.tenantId)
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('updatePath', user.tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async deletePath(id: string, tenantId: string, actor: string): Promise<{ deleted: boolean }> {
    this.log.entry('deletePath', tenantId, { attackPathId: id, actorEmail: actor })

    try {
      const existing = await this.getPathById(id, tenantId)

      await this.repository.deleteMany({ id, tenantId })

      this.log.success('deletePath', tenantId, {
        attackPathId: id,
        pathNumber: existing.pathNumber,
        actorEmail: actor,
      })
      return { deleted: true }
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('deletePath', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getAttackPathStats(tenantId: string): Promise<AttackPathStats> {
    this.log.entry('getAttackPathStats', tenantId, {})

    try {
      const [activePaths, assetsResult, coverageResult] = await Promise.all([
        this.repository.count({ tenantId, status: AttackPathStatus.ACTIVE }),
        this.repository.aggregateSum(
          { tenantId, status: AttackPathStatus.ACTIVE },
          { affectedAssets: true }
        ),
        this.repository.aggregateAvg({ tenantId }, { killChainCoverage: true }),
      ])

      this.log.success('getAttackPathStats', tenantId, { activePaths })

      return {
        activePaths,
        assetsAtRisk: assetsResult._sum?.affectedAssets ?? 0,
        avgKillChainCoverage: Math.round((coverageResult._avg?.killChainCoverage ?? 0) * 100) / 100,
      }
    } catch (error: unknown) {
      this.log.error('getAttackPathStats', tenantId, error)
      throw error
    }
  }
}
