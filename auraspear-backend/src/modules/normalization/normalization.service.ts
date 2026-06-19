import { Injectable } from '@nestjs/common'
import { NormalizationExecutor } from './normalization.executor'
import { NormalizationRepository } from './normalization.repository'
import {
  buildPipelineListWhere,
  buildPipelineOrderBy,
  buildPipelineUpdateData,
  buildPipelineRecord,
  buildNormalizationStats,
  extractPipelineSteps,
} from './normalization.utilities'
import { AppLogFeature, NormalizationPipelineStatus, SortOrder } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type { CreatePipelineDto } from './dto/create-pipeline.dto'
import type { UpdatePipelineDto } from './dto/update-pipeline.dto'
import type {
  NormalizationOutput,
  NormalizationPipelineRecord,
  NormalizationStats,
  PaginatedPipelines,
} from './normalization.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { Prisma } from '@prisma/client'

@Injectable()
export class NormalizationService {
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: NormalizationRepository,
    private readonly appLogger: AppLoggerService,
    private readonly executor: NormalizationExecutor
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.NORMALIZATION,
      'NormalizationService'
    )
  }

  /* ---------------------------------------------------------------- */
  /* LIST (paginated, tenant-scoped)                                   */
  /* ---------------------------------------------------------------- */

  async listPipelines(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    sourceType?: string,
    status?: string,
    query?: string
  ): Promise<PaginatedPipelines> {
    this.log.entry('listPipelines', tenantId, { page, limit, sourceType, status, query })

    try {
      const where = buildPipelineListWhere(tenantId, sourceType, status, query)
      const orderBy = buildPipelineOrderBy(sortBy, sortOrder)

      const [pipelines, total] = await Promise.all([
        this.repository.findManyPipelines({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
        }),
        this.repository.countPipelines(where),
      ])

      const data: NormalizationPipelineRecord[] = pipelines.map(buildPipelineRecord)
      this.log.success('listPipelines', tenantId, {
        page,
        limit,
        total,
        returnedCount: data.length,
      })

      return { data, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('listPipelines', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET BY ID                                                         */
  /* ---------------------------------------------------------------- */

  async getPipelineById(id: string, tenantId: string): Promise<NormalizationPipelineRecord> {
    this.log.debug('getPipelineById', tenantId, 'starting', { pipelineId: id })

    const pipeline = await this.repository.findFirstPipelineByIdAndTenant(id, tenantId)

    if (!pipeline) {
      this.log.warn('getPipelineById', tenantId, 'not found', { pipelineId: id })
      throw new BusinessException(
        404,
        `Normalization pipeline ${id} not found`,
        'errors.normalization.notFound'
      )
    }

    this.log.success('getPipelineById', tenantId, { pipelineId: id, name: pipeline.name })

    return buildPipelineRecord(pipeline)
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async createPipeline(
    dto: CreatePipelineDto,
    user: JwtPayload
  ): Promise<NormalizationPipelineRecord> {
    this.log.entry('createPipeline', user.tenantId, {
      name: dto.name,
      sourceType: dto.sourceType,
    })

    try {
      await this.ensureNoDuplicatePipelineName(user.tenantId, dto.name)

      const pipeline = await this.repository.createPipeline({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description ?? null,
        sourceType: dto.sourceType,
        status: NormalizationPipelineStatus.INACTIVE,
        parserConfig: dto.parserConfig as Prisma.InputJsonValue,
        fieldMappings: dto.fieldMappings as Prisma.InputJsonValue,
      })

      this.log.success('createPipeline', user.tenantId, {
        name: pipeline.name,
        sourceType: pipeline.sourceType,
      })
      return buildPipelineRecord(pipeline)
    } catch (error: unknown) {
      this.log.error('createPipeline', user.tenantId, error)
      throw error
    }
  }

  private async ensureNoDuplicatePipelineName(tenantId: string, name: string): Promise<void> {
    const duplicates = await this.repository.findManyPipelines({
      where: { tenantId, name },
      skip: 0,
      take: 1,
      orderBy: { createdAt: SortOrder.DESC },
    })

    if (duplicates.length > 0) {
      throw new BusinessException(
        409,
        `Pipeline with name "${name}" already exists`,
        'errors.normalization.pipelineAlreadyExists'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async updatePipeline(
    id: string,
    dto: UpdatePipelineDto,
    user: JwtPayload
  ): Promise<NormalizationPipelineRecord> {
    this.log.entry('updatePipeline', user.tenantId, {
      updatedFields: Object.keys(dto),
      pipelineId: id,
    })

    try {
      await this.getPipelineById(id, user.tenantId)
      await this.applyPipelineUpdate(id, user.tenantId, buildPipelineUpdateData(dto))

      this.log.success('updatePipeline', user.tenantId, { pipelineId: id })
      return this.getPipelineById(id, user.tenantId)
    } catch (error: unknown) {
      this.log.error('updatePipeline', user.tenantId, error, { pipelineId: id })
      throw error
    }
  }

  private async applyPipelineUpdate(
    id: string,
    tenantId: string,
    updateData: Record<string, unknown>
  ): Promise<void> {
    const updated = await this.repository.updateManyPipelinesByIdAndTenant(id, tenantId, updateData)

    if (updated.count === 0) {
      throw new BusinessException(
        404,
        `Normalization pipeline ${id} not found`,
        'errors.normalization.notFound'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async deletePipeline(id: string, tenantId: string, actor: string): Promise<{ deleted: boolean }> {
    this.log.entry('deletePipeline', tenantId, { pipelineId: id, actorEmail: actor })

    try {
      const existing = await this.getPipelineById(id, tenantId)

      await this.repository.deleteManyPipelinesByIdAndTenant(id, tenantId)

      this.log.success('deletePipeline', tenantId, { pipelineId: id, name: existing.name })

      return { deleted: true }
    } catch (error: unknown) {
      this.log.error('deletePipeline', tenantId, error, { pipelineId: id })
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* STATS                                                             */
  /* ---------------------------------------------------------------- */

  async getNormalizationStats(tenantId: string): Promise<NormalizationStats> {
    this.log.entry('getNormalizationStats', tenantId)

    try {
      const [total, active, inactive, errorPipelines, aggregates] = await Promise.all([
        this.repository.countPipelines({ tenantId }),
        this.repository.countPipelinesByStatus(tenantId, NormalizationPipelineStatus.ACTIVE),
        this.repository.countPipelinesByStatus(tenantId, NormalizationPipelineStatus.INACTIVE),
        this.repository.countPipelinesByStatus(tenantId, NormalizationPipelineStatus.ERROR),
        this.repository.aggregatePipelinesSums(tenantId),
      ])

      const stats = buildNormalizationStats(total, active, inactive, errorPipelines, aggregates)

      this.log.success('getNormalizationStats', tenantId, {
        total,
        active,
        inactive,
        errorPipelines,
      })

      return stats
    } catch (error: unknown) {
      this.log.error('getNormalizationStats', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* DRY RUN                                                           */
  /* ---------------------------------------------------------------- */

  async dryRunPipeline(
    id: string,
    tenantId: string,
    events: Record<string, unknown>[],
    actorEmail: string
  ): Promise<NormalizationOutput> {
    this.log.entry('dryRunPipeline', tenantId, {
      pipelineId: id,
      eventCount: events.length,
      actorEmail,
    })

    try {
      const pipeline = await this.getPipelineById(id, tenantId)
      const steps = extractPipelineSteps(pipeline.parserConfig, pipeline.fieldMappings)

      const output = await this.executor.executePipeline(
        { id: pipeline.id, name: pipeline.name, steps },
        events
      )

      this.log.success('dryRunPipeline', tenantId, {
        pipelineId: id,
        inputCount: events.length,
        outputCount: output.result.outputCount,
        droppedCount: output.result.droppedCount,
        durationMs: output.result.durationMs,
      })
      return output
    } catch (error: unknown) {
      this.log.error('dryRunPipeline', tenantId, error, {
        pipelineId: id,
        eventCount: events.length,
      })
      throw error
    }
  }
}
