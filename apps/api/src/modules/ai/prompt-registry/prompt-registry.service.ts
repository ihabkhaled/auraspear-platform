import { Injectable, Logger } from '@nestjs/common'
import { DEFAULT_PROMPTS, PROMPT_REGISTRY_SERVICE_CLASS_NAME } from './prompt-registry.constants'
import { PromptRegistryRepository } from './prompt-registry.repository'
import { AiFeatureKey, AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../../common/enums'
import { BusinessException } from '../../../common/exceptions/business.exception'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { toIso } from '../../../common/utils/date-time.utility'
import type { CreatePromptDto } from './dto/create-prompt.dto'
import type { UpdatePromptDto } from './dto/update-prompt.dto'
import type { PromptTemplateResponse } from './prompt-registry.types'
import type { AiPromptTemplate } from '@prisma/client'

@Injectable()
export class PromptRegistryService {
  private readonly logger = new Logger(PromptRegistryService.name)

  constructor(
    private readonly repository: PromptRegistryRepository,
    private readonly appLogger: AppLoggerService
  ) {}

  async list(tenantId: string): Promise<PromptTemplateResponse[]> {
    const templates = await this.repository.findAllByTenant(tenantId)
    return templates.map(t => this.toResponse(t))
  }

  async getById(id: string, tenantId: string): Promise<PromptTemplateResponse> {
    const template = await this.repository.findById(id, tenantId)
    if (!template) {
      throw new BusinessException(404, 'Prompt template not found', 'errors.aiPrompts.notFound')
    }
    return this.toResponse(template)
  }

  /**
   * Returns the active prompt content for a given task type.
   * Falls back to the built-in default if no tenant-specific prompt exists.
   */
  async getActivePrompt(tenantId: string, taskType: AiFeatureKey): Promise<string> {
    const template = await this.repository.findActiveByTaskType(tenantId, taskType)
    if (template) {
      return template.content
    }

    const defaultPromptsMap = new Map(Object.entries(DEFAULT_PROMPTS))
    const defaultPrompt = defaultPromptsMap.get(taskType)
    if (defaultPrompt) {
      return defaultPrompt
    }

    return `You are a SOC AI assistant. Process the following request.\n\nContext:\n{{context}}`
  }

  async create(
    tenantId: string,
    dto: CreatePromptDto,
    actorEmail: string
  ): Promise<PromptTemplateResponse> {
    const maxVersion = await this.repository.getMaxVersion(tenantId, dto.taskType)
    const nextVersion = maxVersion + 1

    const template = await this.repository.create({
      tenantId,
      taskType: dto.taskType,
      version: nextVersion,
      name: dto.name,
      content: dto.content,
      createdBy: actorEmail,
      isActive: true,
    })

    this.logPromptCreated(template.id, dto, nextVersion, tenantId, actorEmail)

    return this.toResponse(template)
  }

  private logPromptCreated(
    templateId: string,
    dto: CreatePromptDto,
    version: number,
    tenantId: string,
    actorEmail: string
  ): void {
    this.appLogger.info(`Prompt template created: ${dto.name} v${String(version)}`, {
      feature: AppLogFeature.AI_PROMPTS,
      action: 'create',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: PROMPT_REGISTRY_SERVICE_CLASS_NAME,
      functionName: 'create',
      tenantId,
      actorEmail,
      targetResource: 'AiPromptTemplate',
      targetResourceId: templateId,
      metadata: { taskType: dto.taskType, version },
    })
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdatePromptDto,
    actorEmail: string
  ): Promise<PromptTemplateResponse> {
    const existing = await this.repository.findById(id, tenantId)
    if (!existing) {
      throw new BusinessException(404, 'Prompt template not found', 'errors.aiPrompts.notFound')
    }

    const template = await this.repository.update(id, tenantId, {
      name: dto.name,
      content: dto.content,
    })

    this.appLogger.info(`Prompt template updated: ${template.name}`, {
      feature: AppLogFeature.AI_PROMPTS,
      action: 'update',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: PROMPT_REGISTRY_SERVICE_CLASS_NAME,
      functionName: 'update',
      tenantId,
      actorEmail,
      targetResource: 'AiPromptTemplate',
      targetResourceId: id,
    })

    return this.toResponse(template)
  }

  async activate(
    id: string,
    tenantId: string,
    actorEmail: string
  ): Promise<PromptTemplateResponse> {
    const existing = await this.repository.findById(id, tenantId)
    if (!existing) {
      throw new BusinessException(404, 'Prompt template not found', 'errors.aiPrompts.notFound')
    }

    // Deactivate all other versions of the same taskType
    await this.repository.deactivateAllByTaskType(tenantId, existing.taskType)

    // Activate the requested one
    const template = await this.repository.activate(id, tenantId)

    this.appLogger.info(
      `Prompt template activated: ${template.name} v${String(template.version)}`,
      {
        feature: AppLogFeature.AI_PROMPTS,
        action: 'activate',
        outcome: AppLogOutcome.SUCCESS,
        sourceType: AppLogSourceType.SERVICE,
        className: PROMPT_REGISTRY_SERVICE_CLASS_NAME,
        functionName: 'activate',
        tenantId,
        actorEmail,
        targetResource: 'AiPromptTemplate',
        targetResourceId: id,
        metadata: { taskType: existing.taskType, version: template.version },
      }
    )

    return this.toResponse(template)
  }

  async delete(id: string, tenantId: string, actorEmail: string): Promise<void> {
    const existing = await this.repository.findById(id, tenantId)
    if (!existing) {
      throw new BusinessException(404, 'Prompt template not found', 'errors.aiPrompts.notFound')
    }

    await this.repository.delete(id, tenantId)

    this.appLogger.info(`Prompt template deleted: ${existing.name}`, {
      feature: AppLogFeature.AI_PROMPTS,
      action: 'delete',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: PROMPT_REGISTRY_SERVICE_CLASS_NAME,
      functionName: 'delete',
      tenantId,
      actorEmail,
      targetResource: 'AiPromptTemplate',
      targetResourceId: id,
    })
  }

  private toResponse(template: AiPromptTemplate): PromptTemplateResponse {
    return {
      id: template.id,
      tenantId: template.tenantId,
      taskType: template.taskType,
      version: template.version,
      name: template.name,
      content: template.content,
      isActive: template.isActive,
      createdBy: template.createdBy,
      reviewedBy: template.reviewedBy,
      reviewedAt: template.reviewedAt ? toIso(template.reviewedAt) : null,
      createdAt: toIso(template.createdAt),
      updatedAt: toIso(template.updatedAt),
    }
  }
}
