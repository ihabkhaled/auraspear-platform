import { Injectable, Logger } from '@nestjs/common'
import { EntitiesRepository } from './entities.repository'
import {
  buildEntitySearchWhere,
  buildEntityOrderBy,
  collectConnectedIds,
  collectSecondHopData,
  deduplicateRelations,
  buildGraphResponse,
} from './entities.utilities'
import { AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type { CreateEntityDto } from './dto/create-entity.dto'
import type { ListEntitiesQueryDto } from './dto/list-entities-query.dto'
import type { UpdateEntityDto } from './dto/update-entity.dto'
import type { EntityRecord, EntityGraphResponse, PaginatedEntities } from './entities.types'
import type { InputJsonValue } from '@prisma/client/runtime/client'

@Injectable()
export class EntitiesService {
  private readonly logger = new Logger(EntitiesService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly entitiesRepository: EntitiesRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.ENTITIES, 'EntitiesService')
  }

  async list(tenantId: string, query: ListEntitiesQueryDto): Promise<PaginatedEntities> {
    this.logger.log(
      `list called for tenant ${tenantId}: page=${String(query.page)}, limit=${String(query.limit)}`
    )
    const where = buildEntitySearchWhere(tenantId, query)

    const [data, total] = await this.entitiesRepository.findManyAndCount({
      where,
      orderBy: buildEntityOrderBy(query.sortBy, query.sortOrder),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    })

    this.log.success('list', tenantId, { page: query.page, limit: query.limit, total })

    return { data, pagination: buildPaginationMeta(query.page, query.limit, total) }
  }

  async findById(tenantId: string, id: string): Promise<EntityRecord> {
    this.logger.log(`findById called for entity ${id} in tenant ${tenantId}`)
    const entity = await this.entitiesRepository.findFirstByIdAndTenant(id, tenantId)

    if (!entity) {
      this.log.warn('findById', tenantId, 'Entity not found', { targetResourceId: id })
      throw new BusinessException(404, 'Entity not found', 'errors.entities.notFound')
    }

    return entity
  }

  async create(tenantId: string, dto: CreateEntityDto): Promise<EntityRecord> {
    this.logger.log(`create called for tenant ${tenantId}, type=${dto.type}`)
    const existing = await this.entitiesRepository.findByTypeAndValue(tenantId, dto.type, dto.value)

    if (existing) {
      throw new BusinessException(409, 'Entity already exists', 'errors.entities.alreadyExists')
    }

    const entity = await this.entitiesRepository.create({
      tenant: { connect: { id: tenantId } },
      type: dto.type,
      value: dto.value,
      displayName: dto.displayName,
      metadata: (dto.metadata ?? {}) as InputJsonValue,
    })

    this.logger.log(`create completed for entity ${entity.id} in tenant ${tenantId}`)
    this.log.success('create', tenantId, { entityId: entity.id, type: dto.type })

    return entity
  }

  async update(tenantId: string, id: string, dto: UpdateEntityDto): Promise<EntityRecord> {
    this.logger.log(`update called for entity ${id} in tenant ${tenantId}`)
    await this.findById(tenantId, id)

    const updated = await this.entitiesRepository.updateByIdAndTenant(id, tenantId, {
      displayName: dto.displayName,
      metadata: dto.metadata as InputJsonValue | undefined,
    })

    if (!updated) {
      throw new BusinessException(404, 'Entity not found after update', 'errors.entities.notFound')
    }

    this.logger.log(`update completed for entity ${id}`)
    this.log.success('update', tenantId, { entityId: id })

    return updated
  }

  async getGraph(tenantId: string, entityId: string): Promise<EntityGraphResponse> {
    this.logger.log(`getGraph called for entity ${entityId} in tenant ${tenantId}`)
    const rootEntity = await this.findById(tenantId, entityId)

    const directRelations = await this.entitiesRepository.findRelationsForEntity(entityId, tenantId)
    const connectedIds = collectConnectedIds(directRelations, entityId)

    const secondHopResults = await Promise.all(
      [...connectedIds].map(connId =>
        this.entitiesRepository.findRelationsForEntity(connId, tenantId)
      )
    )

    const { secondHopRelations, secondHopIds } = collectSecondHopData(secondHopResults)
    const allEntityIds = new Set([entityId, ...connectedIds, ...secondHopIds])
    const allRelations = [...directRelations, ...secondHopRelations]
    const uniqueRelations = deduplicateRelations(allRelations)

    const entities = await this.entitiesRepository.findConnectedEntities(
      [...allEntityIds],
      tenantId
    )

    const graph = buildGraphResponse(rootEntity, entities, uniqueRelations)
    this.logger.log(
      `getGraph completed for entity ${entityId}: ${String(entities.length)} nodes, ${String(uniqueRelations.size)} relations`
    )
    return graph
  }

  async getTopRisky(tenantId: string, limit = 10): Promise<EntityRecord[]> {
    this.logger.log(`getTopRisky called for tenant ${tenantId}, limit=${String(limit)}`)
    const results = await this.entitiesRepository.findTopRisky(tenantId, limit)
    this.logger.log(
      `getTopRisky completed for tenant ${tenantId}: ${String(results.length)} entities`
    )
    return results
  }
}
