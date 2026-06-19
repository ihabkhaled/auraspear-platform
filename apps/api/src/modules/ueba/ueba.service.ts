import { Injectable, Logger } from '@nestjs/common'
import { UebaRepository } from './ueba.repository'
import {
  buildEntityListWhere,
  buildEntityOrderBy,
  buildAnomalyListWhere,
  buildAnomalyOrderBy,
  buildModelListWhere,
  buildModelOrderBy,
  mapEntityWithCount,
  mapAnomalyWithEntity,
} from './ueba.utilities'
import { AppLogFeature, MlModelStatus, UebaRiskLevel } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { daysAgo } from '../../common/utils/date-time.utility'
import type { CreateEntityDto } from './dto/create-entity.dto'
import type { UpdateEntityDto } from './dto/update-entity.dto'
import type {
  UebaEntityRecord,
  PaginatedEntities,
  UebaAnomalyRecord,
  PaginatedAnomalies,
  PaginatedModels,
  UebaStats,
} from './ueba.types'

@Injectable()
export class UebaService {
  private readonly logger = new Logger(UebaService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: UebaRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.UEBA, 'UebaService')
  }

  /* ---------------------------------------------------------------- */
  /* LIST ENTITIES (paginated, tenant-scoped)                          */
  /* ---------------------------------------------------------------- */

  async listEntities(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    entityType?: string,
    riskLevel?: string,
    query?: string
  ): Promise<PaginatedEntities> {
    this.log.entry('listEntities', tenantId, { page, limit, entityType, riskLevel, query })

    try {
      const where = buildEntityListWhere(tenantId, entityType, riskLevel, query)

      const [entities, total] = await Promise.all([
        this.repository.findManyEntitiesWithCount({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: buildEntityOrderBy(sortBy, sortOrder),
        }),
        this.repository.countEntities(where),
      ])

      const data = entities.map(mapEntityWithCount) as UebaEntityRecord[]

      this.log.success('listEntities', tenantId, { page, limit, total, returnedCount: data.length })
      return { data, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('listEntities', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET ENTITY BY ID                                                  */
  /* ---------------------------------------------------------------- */

  async getEntityById(id: string, tenantId: string): Promise<UebaEntityRecord> {
    this.log.entry('getEntityById', tenantId, { entityId: id })

    try {
      const entity = await this.repository.findFirstEntityWithCount({
        where: { id, tenantId },
      })

      if (!entity) {
        this.log.warn('getEntityById', tenantId, 'UEBA entity not found', { entityId: id })
        throw new BusinessException(
          404,
          `UEBA entity ${id} not found`,
          'errors.ueba.entityNotFound'
        )
      }

      this.log.success('getEntityById', tenantId, { entityId: id })
      return mapEntityWithCount(entity) as UebaEntityRecord
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('getEntityById', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* CREATE ENTITY                                                     */
  /* ---------------------------------------------------------------- */

  async createEntity(tenantId: string, dto: CreateEntityDto): Promise<UebaEntityRecord> {
    this.log.entry('createEntity', tenantId, {
      entityName: dto.entityName,
      entityType: dto.entityType,
    })

    try {
      const existing = await this.repository.findFirstEntityWithCount({
        where: { tenantId, entityName: dto.entityName, entityType: dto.entityType },
      })

      if (existing) {
        throw new BusinessException(
          409,
          `Entity "${dto.entityName}" of type "${dto.entityType}" already exists`,
          'errors.ueba.entityAlreadyExists'
        )
      }

      const entity = await this.repository.createEntity({
        tenant: { connect: { id: tenantId } },
        entityName: dto.entityName,
        entityType: dto.entityType,
        riskScore: dto.riskScore,
        riskLevel: dto.riskLevel,
        topAnomaly: dto.topAnomaly,
      })

      this.log.success('createEntity', tenantId, {
        entityId: entity.id,
        entityName: dto.entityName,
      })
      return mapEntityWithCount(entity) as UebaEntityRecord
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('createEntity', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE ENTITY                                                     */
  /* ---------------------------------------------------------------- */

  async updateEntity(
    id: string,
    tenantId: string,
    dto: UpdateEntityDto
  ): Promise<UebaEntityRecord> {
    this.log.entry('updateEntity', tenantId, { entityId: id, updatedFields: Object.keys(dto) })

    try {
      await this.assertEntityExists(id, tenantId)

      const updated = await this.repository.updateEntity({
        where: { id, tenantId },
        data: dto,
      })

      if (!updated) {
        throw new BusinessException(
          404,
          `UEBA entity ${id} not found after update`,
          'errors.ueba.entityNotFound'
        )
      }

      this.log.success('updateEntity', tenantId, { entityId: id })
      return mapEntityWithCount(updated) as UebaEntityRecord
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('updateEntity', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE ENTITY                                                     */
  /* ---------------------------------------------------------------- */

  async deleteEntity(id: string, tenantId: string): Promise<{ deleted: boolean }> {
    this.log.entry('deleteEntity', tenantId, { entityId: id })

    try {
      const existing = await this.repository.findFirstEntityWithCount({
        where: { id, tenantId },
      })

      if (!existing) {
        throw new BusinessException(
          404,
          `UEBA entity ${id} not found`,
          'errors.ueba.entityNotFound'
        )
      }

      await this.repository.deleteEntity({ id, tenantId })

      this.log.success('deleteEntity', tenantId, { entityId: id })
      return { deleted: true }
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('deleteEntity', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* RESOLVE ANOMALY                                                   */
  /* ---------------------------------------------------------------- */

  async resolveAnomaly(id: string, tenantId: string): Promise<UebaAnomalyRecord> {
    this.log.entry('resolveAnomaly', tenantId, { anomalyId: id })

    try {
      await this.assertAnomalyExists(id, tenantId)

      const updated = await this.repository.updateAnomaly({
        where: { id, tenantId },
        data: { resolved: true },
      })

      if (!updated) {
        throw new BusinessException(
          404,
          `UEBA anomaly ${id} not found after update`,
          'errors.ueba.anomalyNotFound'
        )
      }

      this.log.success('resolveAnomaly', tenantId, { anomalyId: id })
      return mapAnomalyWithEntity(updated) as UebaAnomalyRecord
    } catch (error: unknown) {
      if (!(error instanceof BusinessException)) {
        this.log.error('resolveAnomaly', tenantId, error)
      }
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* LIST ANOMALIES (paginated, tenant-scoped)                         */
  /* ---------------------------------------------------------------- */

  async listAnomalies(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    severity?: string,
    entityId?: string,
    resolved?: boolean
  ): Promise<PaginatedAnomalies> {
    this.log.entry('listAnomalies', tenantId, { page, limit, severity, entityId, resolved })

    try {
      const where = buildAnomalyListWhere(tenantId, severity, entityId, resolved)

      const [anomalies, total] = await Promise.all([
        this.repository.findManyAnomaliesWithEntity({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: buildAnomalyOrderBy(sortBy, sortOrder),
        }),
        this.repository.countAnomalies(where),
      ])

      const data = anomalies.map(mapAnomalyWithEntity) as UebaAnomalyRecord[]

      this.log.success('listAnomalies', tenantId, {
        page,
        limit,
        total,
        returnedCount: data.length,
      })
      return { data, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('listAnomalies', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* LIST ML MODELS (paginated, tenant-scoped)                         */
  /* ---------------------------------------------------------------- */

  async listModels(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    status?: string,
    modelType?: string
  ): Promise<PaginatedModels> {
    this.log.entry('listModels', tenantId, { page, limit, status, modelType })

    try {
      const where = buildModelListWhere(tenantId, status, modelType)

      const [models, total] = await Promise.all([
        this.repository.findManyModels({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: buildModelOrderBy(sortBy, sortOrder),
        }),
        this.repository.countModels(where),
      ])

      this.log.success('listModels', tenantId, { page, limit, total, returnedCount: models.length })

      return {
        data: models,
        pagination: buildPaginationMeta(page, limit, total),
      }
    } catch (error: unknown) {
      this.log.error('listModels', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getUebaStats(tenantId: string): Promise<UebaStats> {
    this.log.entry('getUebaStats', tenantId, {})

    try {
      const twentyFourHoursAgo = daysAgo(1)

      const [totalEntities, criticalRiskEntities, highRiskEntities, anomalies24h, activeModels] =
        await Promise.all([
          this.repository.countEntities({ tenantId }),
          this.repository.countEntities({ tenantId, riskLevel: UebaRiskLevel.CRITICAL }),
          this.repository.countEntities({ tenantId, riskLevel: UebaRiskLevel.HIGH }),
          this.repository.countAnomalies({ tenantId, detectedAt: { gte: twentyFourHoursAgo } }),
          this.repository.countModels({ tenantId, status: MlModelStatus.ACTIVE }),
        ])

      this.log.success('getUebaStats', tenantId, {
        totalEntities,
        criticalRiskEntities,
        anomalies24h,
      })

      return {
        totalEntities,
        criticalRiskEntities,
        highRiskEntities,
        anomalies24h,
        activeModels,
      }
    } catch (error: unknown) {
      this.log.error('getUebaStats', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE HELPERS                                                    */
  /* ---------------------------------------------------------------- */

  private async assertEntityExists(id: string, tenantId: string): Promise<void> {
    const existing = await this.repository.findFirstEntityWithCount({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new BusinessException(404, `UEBA entity ${id} not found`, 'errors.ueba.entityNotFound')
    }
  }

  private async assertAnomalyExists(id: string, tenantId: string): Promise<void> {
    const existing = await this.repository.findFirstAnomaly({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new BusinessException(
        404,
        `UEBA anomaly ${id} not found`,
        'errors.ueba.anomalyNotFound'
      )
    }
  }
}
