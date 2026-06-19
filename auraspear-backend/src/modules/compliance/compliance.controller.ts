import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ComplianceService } from './compliance.service'
import { type CreateControlDto, CreateControlSchema } from './dto/create-control.dto'
import { type CreateFrameworkDto, CreateFrameworkSchema } from './dto/create-framework.dto'
import { ListFrameworksQuerySchema } from './dto/list-frameworks-query.dto'
import { type UpdateControlDto, UpdateControlSchema } from './dto/update-control.dto'
import { type UpdateFrameworkDto, UpdateFrameworkSchema } from './dto/update-framework.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  ComplianceFrameworkRecord,
  PaginatedFrameworks,
  ComplianceControlRecord,
  ComplianceStats,
} from './compliance.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('compliance')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('frameworks')
  @RequirePermission(Permission.COMPLIANCE_VIEW)
  async listFrameworks(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedFrameworks> {
    const { page, limit, sortBy, sortOrder, standard, query } =
      ListFrameworksQuerySchema.parse(rawQuery)
    return this.complianceService.listFrameworks(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      standard,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.COMPLIANCE_VIEW)
  async getComplianceStats(@TenantId() tenantId: string): Promise<ComplianceStats> {
    return this.complianceService.getComplianceStats(tenantId)
  }

  @Get('frameworks/:id')
  @RequirePermission(Permission.COMPLIANCE_VIEW)
  async getFrameworkById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<ComplianceFrameworkRecord> {
    return this.complianceService.getFrameworkById(id, tenantId)
  }

  @Post('frameworks')
  @RequirePermission(Permission.COMPLIANCE_CREATE)
  async createFramework(
    @Body(new ZodValidationPipe(CreateFrameworkSchema)) dto: CreateFrameworkDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ComplianceFrameworkRecord> {
    return this.complianceService.createFramework(dto, user)
  }

  @Patch('frameworks/:id')
  @RequirePermission(Permission.COMPLIANCE_UPDATE)
  async updateFramework(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateFrameworkSchema)) dto: UpdateFrameworkDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ComplianceFrameworkRecord> {
    return this.complianceService.updateFramework(id, dto, user)
  }

  @Delete('frameworks/:id')
  @RequirePermission(Permission.COMPLIANCE_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteFramework(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.complianceService.deleteFramework(id, tenantId, user.email)
  }

  @Get('frameworks/:id/controls')
  @RequirePermission(Permission.COMPLIANCE_VIEW)
  async listControls(
    @Param('id') frameworkId: string,
    @TenantId() tenantId: string
  ): Promise<ComplianceControlRecord[]> {
    return this.complianceService.listControls(frameworkId, tenantId)
  }

  @Post('frameworks/:id/controls')
  @RequirePermission(Permission.COMPLIANCE_CREATE)
  async createControl(
    @Param('id') frameworkId: string,
    @Body(new ZodValidationPipe(CreateControlSchema)) dto: CreateControlDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ComplianceControlRecord> {
    return this.complianceService.createControl(frameworkId, dto, user)
  }

  @Patch('frameworks/:id/controls/:controlId')
  @RequirePermission(Permission.COMPLIANCE_UPDATE)
  async updateControl(
    @Param('id') frameworkId: string,
    @Param('controlId') controlId: string,
    @Body(new ZodValidationPipe(UpdateControlSchema)) dto: UpdateControlDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ComplianceControlRecord> {
    return this.complianceService.updateControl(frameworkId, controlId, dto, user)
  }
}
