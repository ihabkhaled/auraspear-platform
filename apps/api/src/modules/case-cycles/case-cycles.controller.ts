import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { CaseCyclesService } from './case-cycles.service'
import { type CloseCaseCycleDto, CloseCaseCycleSchema } from './dto/close-case-cycle.dto'
import { type CreateCaseCycleDto, CreateCaseCycleSchema } from './dto/create-case-cycle.dto'
import { ListCaseCyclesQuerySchema } from './dto/list-case-cycles-query.dto'
import { type UpdateCaseCycleDto, UpdateCaseCycleSchema } from './dto/update-case-cycle.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { CaseCycleDetail, CaseCycleRecord, PaginatedCaseCycles } from './case-cycles.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('case-cycles')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class CaseCyclesController {
  constructor(private readonly caseCyclesService: CaseCyclesService) {}

  @Get()
  @RequirePermission(Permission.CASES_VIEW)
  async listCycles(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedCaseCycles> {
    const { page, limit, sortBy, sortOrder, status } = ListCaseCyclesQuerySchema.parse(rawQuery)
    return this.caseCyclesService.listCycles(tenantId, page, limit, sortBy, sortOrder, status)
  }

  @Get('active')
  @RequirePermission(Permission.CASES_VIEW)
  async getActiveCycle(@TenantId() tenantId: string): Promise<{ data: CaseCycleRecord | null }> {
    const cycle = await this.caseCyclesService.getActiveCycle(tenantId)
    return { data: cycle }
  }

  @Get('orphaned-stats')
  @RequirePermission(Permission.CASES_VIEW)
  async getOrphanedStats(
    @TenantId() tenantId: string
  ): Promise<{ data: { caseCount: number; openCount: number; closedCount: number } }> {
    const stats = await this.caseCyclesService.getOrphanedStats(tenantId)
    return { data: stats }
  }

  @Get(':id')
  @RequirePermission(Permission.CASES_VIEW)
  async getCycleById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<{ data: CaseCycleDetail }> {
    const cycle = await this.caseCyclesService.getCycleById(id, tenantId)
    return { data: cycle }
  }

  @Post()
  @RequirePermission(Permission.CASES_CREATE)
  async createCycle(
    @Body(new ZodValidationPipe(CreateCaseCycleSchema)) dto: CreateCaseCycleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseCycleRecord }> {
    const cycle = await this.caseCyclesService.createCycle(dto, user)
    return { data: cycle }
  }

  @Patch(':id')
  @RequirePermission(Permission.CASES_UPDATE)
  async updateCycle(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCaseCycleSchema)) dto: UpdateCaseCycleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseCycleRecord }> {
    const cycle = await this.caseCyclesService.updateCycle(id, dto, user)
    return { data: cycle }
  }

  @Patch(':id/close')
  @RequirePermission(Permission.CASES_CHANGE_STATUS)
  async closeCycle(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CloseCaseCycleSchema)) dto: CloseCaseCycleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseCycleRecord }> {
    const cycle = await this.caseCyclesService.closeCycle(id, dto, user)
    return { data: cycle }
  }

  @Patch(':id/activate')
  @RequirePermission(Permission.CASES_CHANGE_STATUS)
  async activateCycle(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ data: CaseCycleRecord }> {
    const cycle = await this.caseCyclesService.activateCycle(id, user)
    return { data: cycle }
  }

  @Delete(':id')
  @RequirePermission(Permission.CASES_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteCycle(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.caseCyclesService.deleteCycle(id, user)
  }
}
