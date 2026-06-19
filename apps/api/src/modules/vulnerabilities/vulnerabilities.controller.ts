import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
  CreateVulnerabilitySchema,
  type CreateVulnerabilityDto,
} from './dto/create-vulnerability.dto'
import { ListVulnerabilitiesQuerySchema } from './dto/list-vulnerabilities-query.dto'
import {
  UpdateVulnerabilitySchema,
  type UpdateVulnerabilityDto,
} from './dto/update-vulnerability.dto'
import { VulnerabilitiesService } from './vulnerabilities.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  PaginatedVulnerabilities,
  VulnerabilityRecord,
  VulnerabilityStats,
} from './vulnerabilities.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('vulnerabilities')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class VulnerabilitiesController {
  constructor(private readonly vulnerabilitiesService: VulnerabilitiesService) {}

  @Get()
  @RequirePermission(Permission.VULNERABILITIES_VIEW)
  async listVulnerabilities(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedVulnerabilities> {
    const { page, limit, sortBy, sortOrder, severity, patchStatus, exploitAvailable, query } =
      ListVulnerabilitiesQuerySchema.parse(rawQuery)
    return this.vulnerabilitiesService.listVulnerabilities(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      severity,
      patchStatus,
      exploitAvailable,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.VULNERABILITIES_VIEW)
  async getVulnerabilityStats(@TenantId() tenantId: string): Promise<VulnerabilityStats> {
    return this.vulnerabilitiesService.getVulnerabilityStats(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.VULNERABILITIES_VIEW)
  async getVulnerabilityById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<VulnerabilityRecord> {
    return this.vulnerabilitiesService.getVulnerabilityById(id, tenantId)
  }

  @Post()
  @RequirePermission(Permission.VULNERABILITIES_CREATE)
  async createVulnerability(
    @Body(new ZodValidationPipe(CreateVulnerabilitySchema)) dto: CreateVulnerabilityDto,
    @CurrentUser() user: JwtPayload
  ): Promise<VulnerabilityRecord> {
    return this.vulnerabilitiesService.createVulnerability(dto, user)
  }

  @Patch(':id')
  @RequirePermission(Permission.VULNERABILITIES_UPDATE)
  async updateVulnerability(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateVulnerabilitySchema)) dto: UpdateVulnerabilityDto,
    @CurrentUser() user: JwtPayload
  ): Promise<VulnerabilityRecord> {
    return this.vulnerabilitiesService.updateVulnerability(id, dto, user)
  }

  @Delete(':id')
  @RequirePermission(Permission.VULNERABILITIES_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteVulnerability(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.vulnerabilitiesService.deleteVulnerability(id, tenantId, user.email)
  }
}
