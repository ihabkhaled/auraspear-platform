import { Injectable, Logger } from '@nestjs/common'
import { KnowledgeRepository } from './knowledge.repository'
import { AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import type { CreateRunbookDto } from './dto/create-runbook.dto'
import type { UpdateRunbookDto } from './dto/update-runbook.dto'
import type { RunbookResponse, RunbookSearchParameters } from './knowledge.types'
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.KNOWLEDGE, 'KnowledgeService')
  }

  async list(
    tenantId: string,
    params: RunbookSearchParameters
  ): Promise<PaginatedResponse<RunbookResponse>> {
    this.logger.log(
      `list called for tenant ${tenantId}: page=${String(params.page)}, limit=${String(params.limit)}`
    )
    const [data, total] = await Promise.all([
      this.knowledgeRepository.findAllByTenant(tenantId, params),
      this.knowledgeRepository.countByTenant(tenantId, params.category),
    ])
    this.logger.log(`list completed for tenant ${tenantId}: ${String(total)} runbooks found`)
    return { data, pagination: buildPaginationMeta(params.page, params.limit, total) }
  }

  async getById(tenantId: string, id: string): Promise<RunbookResponse> {
    this.logger.log(`getById called for runbook ${id} in tenant ${tenantId}`)
    const runbook = await this.knowledgeRepository.findById(id, tenantId)
    if (!runbook) {
      this.logWarn('getById', tenantId, id)
      throw new BusinessException(404, `Runbook ${id} not found`, 'errors.knowledge.notFound')
    }
    return runbook
  }

  async create(tenantId: string, dto: CreateRunbookDto, email: string): Promise<RunbookResponse> {
    this.logger.log(`create called for tenant ${tenantId} by ${email}`)
    const runbook = await this.knowledgeRepository.create({
      tenantId,
      title: dto.title,
      content: dto.content,
      category: dto.category ?? 'general',
      tags: dto.tags ?? [],
      createdBy: email,
    })

    this.logger.log(`create completed for runbook ${runbook.id} in tenant ${tenantId}`)
    this.logAction('create', tenantId, email, runbook.id, { title: dto.title })
    return runbook
  }

  async update(
    tenantId: string,
    id: string,
    dto: UpdateRunbookDto,
    email: string
  ): Promise<RunbookResponse> {
    this.logger.log(`update called for runbook ${id} in tenant ${tenantId} by ${email}`)
    const existing = await this.knowledgeRepository.findById(id, tenantId)
    if (!existing) {
      this.logWarn('update', tenantId, id)
      throw new BusinessException(404, `Runbook ${id} not found`, 'errors.knowledge.notFound')
    }

    const updated = await this.knowledgeRepository.update(id, tenantId, {
      title: dto.title,
      content: dto.content,
      category: dto.category,
      tags: dto.tags,
      updatedBy: email,
    })

    this.logger.log(`update completed for runbook ${id}`)
    this.logAction('update', tenantId, email, id, { title: dto.title ?? existing.title })
    return updated
  }

  async delete(tenantId: string, id: string, email: string): Promise<{ deleted: boolean }> {
    this.logger.log(`delete called for runbook ${id} in tenant ${tenantId} by ${email}`)
    const existing = await this.knowledgeRepository.findById(id, tenantId)
    if (!existing) {
      this.logWarn('delete', tenantId, id)
      throw new BusinessException(404, `Runbook ${id} not found`, 'errors.knowledge.notFound')
    }

    await this.knowledgeRepository.delete(id, tenantId)
    this.logger.log(`delete completed for runbook ${id}`)
    this.logAction('delete', tenantId, email, id, { title: existing.title })
    return { deleted: true }
  }

  async search(tenantId: string, query: string): Promise<RunbookResponse[]> {
    this.logger.log(`search called for tenant ${tenantId}`)
    const results = await this.knowledgeRepository.search(tenantId, query, 50)
    this.logger.log(`search completed for tenant ${tenantId}: ${String(results.length)} results`)
    return results
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logAction(
    action: string,
    tenantId: string,
    email: string,
    resourceId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.log.success(action, tenantId, {
      ...metadata,
      actorEmail: email,
      targetResourceId: resourceId,
    })
  }

  private logWarn(action: string, tenantId: string, resourceId?: string): void {
    this.log.warn(action, tenantId, 'Runbook not found', { targetResourceId: resourceId })
  }
}
