import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { UpdateFeatureConfigSchema } from './dto/update-feature-config.dto'
import { FeatureCatalogService } from './feature-catalog.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import { toIso } from '../../../common/utils/date-time.utility'
import type { UpdateFeatureConfigDto } from './dto/update-feature-config.dto'
import type { AiFeatureConfigResponse } from './feature-catalog.types'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

@Controller('ai-features')
@UseGuards(AuthGuard, TenantGuard)
export class FeatureCatalogController {
  constructor(private readonly featureCatalogService: FeatureCatalogService) {}

  /** GET /ai-features — List all AI feature configurations */
  @Get()
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async list(@CurrentUser() user: JwtPayload): Promise<AiFeatureConfigResponse[]> {
    return this.featureCatalogService.list(user.tenantId)
  }

  /** GET /ai-features/:featureKey — Get config for a specific feature */
  @Get(':featureKey')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async getByFeatureKey(
    @Param('featureKey') featureKey: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AiFeatureConfigResponse> {
    const validKey = this.featureCatalogService.validateFeatureKey(featureKey)
    const config = await this.featureCatalogService.getConfig(user.tenantId, validKey)
    const now = toIso()

    return {
      id: '',
      tenantId: user.tenantId,
      featureKey,
      enabled: config.enabled,
      preferredProvider: config.preferredProvider,
      maxTokens: config.maxTokens,
      approvalLevel: config.approvalLevel,
      monthlyTokenBudget: config.monthlyTokenBudget,
      createdAt: now,
      updatedAt: now,
    }
  }

  /** PATCH /ai-features/:featureKey — Update config for a specific feature */
  @Patch(':featureKey')
  @RequirePermission(Permission.AI_AGENTS_UPDATE)
  async update(
    @Param('featureKey') featureKey: string,
    @Body(new ZodValidationPipe(UpdateFeatureConfigSchema)) dto: UpdateFeatureConfigDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AiFeatureConfigResponse> {
    const validKey = this.featureCatalogService.validateFeatureKey(featureKey)
    return this.featureCatalogService.update(user.tenantId, validKey, dto, user.email)
  }

  /** POST /ai-features/bulk-toggle — Enable/disable all features at once */
  @Post('bulk-toggle')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkToggle(
    @TenantId() tenantId: string,
    @Body('enabled') enabled: boolean
  ): Promise<{ updated: number }> {
    return this.featureCatalogService.bulkToggle(tenantId, enabled)
  }
}
