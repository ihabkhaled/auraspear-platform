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
import { CorrelationService } from './correlation.service'
import { type CreateRuleDto, CreateRuleSchema } from './dto/create-rule.dto'
import { ListRulesQuerySchema } from './dto/list-rules-query.dto'
import { type TestRuleDto, TestRuleSchema } from './dto/test-rule.dto'
import { type ToggleRuleDto, ToggleRuleSchema } from './dto/toggle-rule.dto'
import { type UpdateRuleDto, UpdateRuleSchema } from './dto/update-rule.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  CorrelationResult,
  CorrelationStats,
  PaginatedRules,
  RuleRecord,
} from './correlation.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('correlation')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class CorrelationController {
  constructor(private readonly correlationService: CorrelationService) {}

  @Get()
  @RequirePermission(Permission.CORRELATION_VIEW)
  async listRules(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedRules> {
    const { page, limit, sortBy, sortOrder, source, severity, status, query } =
      ListRulesQuerySchema.parse(rawQuery)
    return this.correlationService.listRules(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      source,
      severity,
      status,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.CORRELATION_VIEW)
  async getCorrelationStats(@TenantId() tenantId: string): Promise<CorrelationStats> {
    return this.correlationService.getCorrelationStats(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.CORRELATION_VIEW)
  async getRuleById(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ): Promise<RuleRecord> {
    return this.correlationService.getRuleById(id, tenantId)
  }

  @Post()
  @RequirePermission(Permission.CORRELATION_CREATE)
  async createRule(
    @Body(new ZodValidationPipe(CreateRuleSchema)) dto: CreateRuleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<RuleRecord> {
    return this.correlationService.createRule(dto, user)
  }

  @Patch(':id')
  @RequirePermission(Permission.CORRELATION_UPDATE)
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateRuleSchema)) dto: UpdateRuleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<RuleRecord> {
    return this.correlationService.updateRule(id, dto, user)
  }

  @Patch(':id/toggle')
  @RequirePermission(Permission.CORRELATION_TOGGLE)
  async toggleRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ToggleRuleSchema)) dto: ToggleRuleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<RuleRecord> {
    return this.correlationService.toggleRule(id, dto.enabled, user)
  }

  @Delete(':id')
  @RequirePermission(Permission.CORRELATION_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteRule(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.correlationService.deleteRule(id, tenantId, user.email)
  }

  @Post(':id/test')
  @RequirePermission(Permission.CORRELATION_UPDATE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async testRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(TestRuleSchema)) dto: TestRuleDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CorrelationResult> {
    return this.correlationService.testRule(id, tenantId, dto.events, user.email)
  }
}
