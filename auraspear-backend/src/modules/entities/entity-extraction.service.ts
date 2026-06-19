import { Injectable, Logger } from '@nestjs/common'
import { EntitiesRepository } from './entities.repository'
import { buildEntityListFromAlert, mapMispIocTypeToEntityType } from './entities.utilities'
import { AppLogFeature, CaseArtifactType, EntityRelationType, EntityType } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowDate } from '../../common/utils/date-time.utility'
import type {
  AlertExtractionInput,
  ArtifactExtractionInput,
  ExtractedEntity,
  MispIocExtractionInput,
} from './entities.types'

@Injectable()
export class EntityExtractionService {
  private readonly logger = new Logger(EntityExtractionService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly entitiesRepository: EntitiesRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.ENTITIES, 'EntityExtractionService')
  }

  async extractFromAlert(alert: AlertExtractionInput): Promise<void> {
    this.log.entry('extract-from-alert', alert.tenantId, {
      alertId: alert.id,
      source: alert.source,
    })

    try {
      const entities = buildEntityListFromAlert(alert)
      const failedCount = await this.upsertEntitiesBatch(alert.tenantId, entities)
      await this.createAlertRelationships(alert.tenantId, entities, alert.source)

      this.log.success('extract-from-alert', alert.tenantId, {
        alertId: alert.id,
        entityCount: entities.length,
        failedCount,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Entity extraction failed for alert ${alert.id}: ${errorMessage}`)
      this.log.error('extract-from-alert', alert.tenantId, error, {
        alertId: alert.id,
      })
    }
  }

  private async upsertEntitiesBatch(
    tenantId: string,
    entities: ExtractedEntity[]
  ): Promise<number> {
    const results = await Promise.allSettled(
      entities.map(entity => this.upsertEntity(tenantId, entity))
    )

    let failedCount = 0
    for (const result of results) {
      if (result.status === 'rejected') {
        failedCount += 1
        this.logger.warn(
          `Entity upsert failed during extraction: ${result.reason instanceof Error ? result.reason.message : 'Unknown error'}`
        )
      }
    }
    return failedCount
  }

  async extractFromArtifact(params: ArtifactExtractionInput): Promise<void> {
    this.log.entry('extract-from-artifact', params.tenantId, {
      artifactType: params.type,
    })

    try {
      const entityType = this.resolveArtifactEntityType(params.type)
      if (!entityType) {
        this.log.skipped('extract-from-artifact', params.tenantId, 'unmapped type', {
          artifactType: params.type,
        })
        return
      }

      await this.upsertEntity(params.tenantId, { type: entityType, value: params.value })
      this.log.success('extract-from-artifact', params.tenantId, {
        artifactType: params.type,
        entityType,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(
        `Entity extraction failed for artifact ${params.type}:${params.value}: ${errorMessage}`
      )
      this.log.error('extract-from-artifact', params.tenantId, error, {
        artifactType: params.type,
      })
    }
  }

  async extractFromMispIoc(params: MispIocExtractionInput): Promise<void> {
    this.log.entry('extract-from-misp-ioc', params.tenantId, {
      iocType: params.iocType,
    })

    try {
      const entityType = mapMispIocTypeToEntityType(params.iocType)
      if (!entityType) {
        this.log.skipped('extract-from-misp-ioc', params.tenantId, 'unmapped type', {
          iocType: params.iocType,
        })
        return
      }

      await this.upsertEntity(params.tenantId, { type: entityType, value: params.iocValue })
      this.log.success('extract-from-misp-ioc', params.tenantId, {
        iocType: params.iocType,
        entityType,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(
        `Entity extraction failed for MISP IOC ${params.iocType}:${params.iocValue}: ${errorMessage}`
      )
      this.log.error('extract-from-misp-ioc', params.tenantId, error, {
        iocType: params.iocType,
      })
    }
  }

  private resolveArtifactEntityType(artifactType: string): EntityType | null {
    switch (artifactType) {
      case CaseArtifactType.IP:
        return EntityType.IP
      case CaseArtifactType.DOMAIN:
        return EntityType.DOMAIN
      case CaseArtifactType.URL:
        return EntityType.URL
      case CaseArtifactType.HASH:
        return EntityType.HASH
      default:
        return null
    }
  }

  private async upsertEntity(tenantId: string, entity: ExtractedEntity): Promise<void> {
    try {
      await this.entitiesRepository.upsertByTypeAndValue(tenantId, entity.type, entity.value, {
        displayName: entity.displayName,
        lastSeen: nowDate(),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Failed to upsert entity ${entity.type}:${entity.value} — ${errorMessage}`)
    }
  }

  private async createAlertRelationships(
    tenantId: string,
    entities: ExtractedEntity[],
    source: string
  ): Promise<void> {
    const ips = entities.filter(e => e.type === EntityType.IP)
    const sourceIp = ips.at(0)
    const destinationIp = ips.at(1)

    if (!sourceIp || !destinationIp || sourceIp.value === destinationIp.value) return

    try {
      const [fromEntity, toEntity] = await Promise.all([
        this.entitiesRepository.findByTypeAndValue(tenantId, sourceIp.type, sourceIp.value),
        this.entitiesRepository.findByTypeAndValue(
          tenantId,
          destinationIp.type,
          destinationIp.value
        ),
      ])

      if (fromEntity && toEntity) {
        await this.entitiesRepository.createRelation({
          tenant: { connect: { id: tenantId } },
          fromEntity: { connect: { id: fromEntity.id } },
          toEntity: { connect: { id: toEntity.id } },
          relationType: EntityRelationType.COMMUNICATES_WITH,
          source,
        })
      }
    } catch {
      // Duplicate relation is acceptable — silently ignore
    }
  }
}
