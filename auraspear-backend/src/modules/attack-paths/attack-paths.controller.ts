import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AttackPathsService } from './attack-paths.service'
import { type CreateAttackPathDto, CreateAttackPathSchema } from './dto/create-attack-path.dto'
import { ListAttackPathsQuerySchema } from './dto/list-attack-paths-query.dto'
import { type UpdateAttackPathDto, UpdateAttackPathSchema } from './dto/update-attack-path.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { AttackPathRecord, AttackPathStats, PaginatedAttackPaths } from './attack-paths.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('attack-paths')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AttackPathsController {
  constructor(private readonly attackPathsService: AttackPathsService) {}

  @Get()
  @RequirePermission(Permission.ATTACK_PATHS_VIEW)
  async listPaths(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedAttackPaths> {
    const { page, limit, sortBy, sortOrder, severity, status, query } =
      ListAttackPathsQuerySchema.parse(rawQuery)
    return this.attackPathsService.listPaths(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      severity,
      status,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.ATTACK_PATHS_VIEW)
  async getAttackPathStats(@TenantId() tenantId: string): Promise<AttackPathStats> {
    return this.attackPathsService.getAttackPathStats(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.ATTACK_PATHS_VIEW)
  async getPathById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<AttackPathRecord> {
    return this.attackPathsService.getPathById(id, tenantId)
  }

  @Post()
  @RequirePermission(Permission.ATTACK_PATHS_CREATE)
  async createPath(
    @Body(new ZodValidationPipe(CreateAttackPathSchema)) dto: CreateAttackPathDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AttackPathRecord> {
    return this.attackPathsService.createPath(dto, user)
  }

  @Patch(':id')
  @RequirePermission(Permission.ATTACK_PATHS_UPDATE)
  async updatePath(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAttackPathSchema)) dto: UpdateAttackPathDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AttackPathRecord> {
    return this.attackPathsService.updatePath(id, dto, user)
  }

  @Delete(':id')
  @RequirePermission(Permission.ATTACK_PATHS_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deletePath(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.attackPathsService.deletePath(id, tenantId, user.email)
  }
}
