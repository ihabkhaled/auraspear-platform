import { Injectable, Logger } from '@nestjs/common'
import {
  DEFAULT_FEATURE_CONFIG,
  FEATURE_CATALOG_SERVICE_CLASS_NAME,
} from './feature-catalog.constants'
import { FeatureCatalogRepository } from './feature-catalog.repository'
import { AiFeatureKey, AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../../common/enums'
import { BusinessException } from '../../../common/exceptions/business.exception'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { toIso } from '../../../common/utils/date-time.utility'
import type { UpdateFeatureConfigDto } from './dto/update-feature-config.dto'
import type { AiFeatureConfigResponse, ResolvedFeatureConfig } from './feature-catalog.types'
import type { AiFeatureConfig } from '@prisma/client'

@Injectable()
export class FeatureCatalogService {
  private readonly logger = new Logger(FeatureCatalogService.name)

  constructor(
    private readonly repository: FeatureCatalogRepository,
    private readonly appLogger: AppLoggerService
  ) {}

  /**
   * Validates and returns a typed AiFeatureKey from a raw string.
   * Throws BusinessException if the key is not a valid AiFeatureKey.
   */
  validateFeatureKey(featureKey: string): AiFeatureKey {
    const values = Object.values(AiFeatureKey) as string[]
    if (!values.includes(featureKey)) {
      throw new BusinessException(
        400,
        `Invalid feature key: ${featureKey}`,
        'errors.aiFeatures.invalidFeatureKey'
      )
    }
    return featureKey as AiFeatureKey
  }

  /**
   * Returns all feature configs for the tenant, filling in defaults for features
   * that don't have a tenant-specific configuration.
   */
  async list(tenantId: string): Promise<AiFeatureConfigResponse[]> {
    const existingConfigs = await this.repository.findAllByTenant(tenantId)
    const existingKeys = new Set(existingConfigs.map(c => c.featureKey))

    const responses: AiFeatureConfigResponse[] = existingConfigs.map(c => this.toResponse(c))

    // Fill in defaults for features not yet configured
    for (const featureKey of Object.values(AiFeatureKey)) {
      if (!existingKeys.has(featureKey)) {
        responses.push(this.buildDefaultResponse(tenantId, featureKey))
      }
    }

    return responses.sort((a, b) => a.featureKey.localeCompare(b.featureKey))
  }

  /**
   * Returns the resolved config for a specific feature, falling back to defaults.
   */
  async getConfig(tenantId: string, featureKey: AiFeatureKey): Promise<ResolvedFeatureConfig> {
    const config = await this.repository.findByTenantAndFeature(tenantId, featureKey)
    if (config) {
      return {
        enabled: config.enabled,
        preferredProvider: config.preferredProvider,
        maxTokens: config.maxTokens,
        approvalLevel: config.approvalLevel,
        monthlyTokenBudget: config.monthlyTokenBudget,
      }
    }
    return { ...DEFAULT_FEATURE_CONFIG }
  }

  /**
   * Returns whether a feature is enabled for the tenant.
   */
  async isEnabled(tenantId: string, featureKey: AiFeatureKey): Promise<boolean> {
    const config = await this.getConfig(tenantId, featureKey)
    return config.enabled
  }

  /**
   * Upserts the feature configuration for a tenant.
   */
  async update(
    tenantId: string,
    featureKey: AiFeatureKey,
    dto: UpdateFeatureConfigDto,
    actorEmail: string
  ): Promise<AiFeatureConfigResponse> {
    const config = await this.repository.upsert(tenantId, featureKey, {
      enabled: dto.enabled,
      preferredProvider: dto.preferredProvider,
      maxTokens: dto.maxTokens,
      approvalLevel: dto.approvalLevel,
      monthlyTokenBudget: dto.monthlyTokenBudget,
    })

    this.appLogger.info(`AI feature config updated: ${featureKey}`, {
      feature: AppLogFeature.AI_FEATURES,
      action: 'update',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: FEATURE_CATALOG_SERVICE_CLASS_NAME,
      functionName: 'update',
      tenantId,
      actorEmail,
      targetResource: 'AiFeatureConfig',
      targetResourceId: config.id,
      metadata: { featureKey, changes: dto },
    })

    return this.toResponse(config)
  }

  /**
   * Returns the built-in default config for any feature key.
   */
  getDefaultConfig(_featureKey: AiFeatureKey): ResolvedFeatureConfig {
    return { ...DEFAULT_FEATURE_CONFIG }
  }

  private toResponse(config: AiFeatureConfig): AiFeatureConfigResponse {
    return {
      id: config.id,
      tenantId: config.tenantId,
      featureKey: config.featureKey,
      enabled: config.enabled,
      preferredProvider: config.preferredProvider,
      maxTokens: config.maxTokens,
      approvalLevel: config.approvalLevel,
      monthlyTokenBudget: config.monthlyTokenBudget,
      createdAt: toIso(config.createdAt),
      updatedAt: toIso(config.updatedAt),
    }
  }

  private buildDefaultResponse(tenantId: string, featureKey: string): AiFeatureConfigResponse {
    const now = toIso()
    return {
      id: '',
      tenantId,
      featureKey,
      enabled: DEFAULT_FEATURE_CONFIG.enabled,
      preferredProvider: DEFAULT_FEATURE_CONFIG.preferredProvider,
      maxTokens: DEFAULT_FEATURE_CONFIG.maxTokens,
      approvalLevel: DEFAULT_FEATURE_CONFIG.approvalLevel,
      monthlyTokenBudget: DEFAULT_FEATURE_CONFIG.monthlyTokenBudget,
      createdAt: now,
      updatedAt: now,
    }
  }

  async bulkToggle(tenantId: string, enabled: boolean): Promise<{ updated: number }> {
    const allKeys = Object.values(AiFeatureKey)
    const result = await this.repository.bulkToggle(tenantId, enabled, allKeys)
    return { updated: result.count }
  }
}
