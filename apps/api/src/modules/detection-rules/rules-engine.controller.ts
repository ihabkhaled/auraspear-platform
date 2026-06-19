import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { DetectionRulesService } from './detection-rules.service'
import {
  type CreateDetectionRuleDto,
  CreateDetectionRuleSchema,
} from './dto/create-detection-rule.dto'
import { ListDetectionRulesQuerySchema } from './dto/list-detection-rules-query.dto'
import {
  type ToggleDetectionRuleDto,
  ToggleDetectionRuleSchema,
} from './dto/toggle-detection-rule.dto'
import {
  type UpdateDetectionRuleDto,
  UpdateDetectionRuleSchema,
} from './dto/update-detection-rule.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  DetectionRuleRecord,
  DetectionRuleStats,
  PaginatedDetectionRules,
} from './detection-rules.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

/**
 * Alias controller that registers /rules-engine routes,
 * delegating to the same DetectionRulesService.
 */
@Controller('rules-engine')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class RulesEngineController {
  constructor(private readonly detectionRulesService: DetectionRulesService) {}

  @Get()
  @RequirePermission(Permission.DETECTION_RULES_VIEW)
  async listRules(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedDetectionRules> {
    const { page, limit, sortBy, sortOrder, ruleType, severity, status, query } =
      ListDetectionRulesQuerySchema.parse(rawQuery)
    return this.detectionRulesService.listRules(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      ruleType,
      severity,
      status,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.DETECTION_RULES_VIEW)
  async getDetectionRuleStats(@TenantId() tenantId: string): Promise<DetectionRuleStats> {
    return this.detectionRulesService.getDetectionRuleStats(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.DETECTION_RULES_VIEW)
  async getRuleById(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ): Promise<DetectionRuleRecord> {
    return this.detectionRulesService.getRuleById(id, tenantId)
  }

  @Post()
  @RequirePermission(Permission.DETECTION_RULES_CREATE)
  async createRule(
    @Body(new ZodValidationPipe(CreateDetectionRuleSchema)) dto: CreateDetectionRuleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<DetectionRuleRecord> {
    return this.detectionRulesService.createRule(dto, user)
  }

  @Patch(':id')
  @RequirePermission(Permission.DETECTION_RULES_UPDATE)
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateDetectionRuleSchema)) dto: UpdateDetectionRuleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<DetectionRuleRecord> {
    return this.detectionRulesService.updateRule(id, dto, user)
  }

  @Patch(':id/toggle')
  @RequirePermission(Permission.DETECTION_RULES_TOGGLE)
  async toggleRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ToggleDetectionRuleSchema)) dto: ToggleDetectionRuleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<DetectionRuleRecord> {
    return this.detectionRulesService.toggleRule(id, dto.enabled, user)
  }

  @Delete(':id')
  @RequirePermission(Permission.DETECTION_RULES_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteRule(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.detectionRulesService.deleteRule(id, tenantId, user.email)
  }
}
