import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type CreateEntityDto, CreateEntitySchema } from './dto/create-entity.dto'
import { ListAnomaliesQuerySchema } from './dto/list-anomalies-query.dto'
import { ListEntitiesQuerySchema } from './dto/list-entities-query.dto'
import { ListModelsQuerySchema } from './dto/list-models-query.dto'
import { type UpdateEntityDto, UpdateEntitySchema } from './dto/update-entity.dto'
import { UebaService } from './ueba.service'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  UebaEntityRecord,
  UebaAnomalyRecord,
  PaginatedEntities,
  PaginatedAnomalies,
  PaginatedModels,
  UebaStats,
} from './ueba.types'

@Controller('ueba')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class UebaController {
  constructor(private readonly uebaService: UebaService) {}

  @Get('entities')
  @RequirePermission(Permission.UEBA_VIEW)
  async listEntities(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedEntities> {
    const { page, limit, sortBy, sortOrder, entityType, riskLevel, query } =
      ListEntitiesQuerySchema.parse(rawQuery)
    return this.uebaService.listEntities(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      entityType,
      riskLevel,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.UEBA_VIEW)
  async getUebaStats(@TenantId() tenantId: string): Promise<UebaStats> {
    return this.uebaService.getUebaStats(tenantId)
  }

  @Get('anomalies')
  @RequirePermission(Permission.UEBA_VIEW)
  async listAnomalies(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedAnomalies> {
    const { page, limit, sortBy, sortOrder, severity, entityId, resolved } =
      ListAnomaliesQuerySchema.parse(rawQuery)
    return this.uebaService.listAnomalies(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      severity,
      entityId,
      resolved
    )
  }

  @Get('models')
  @RequirePermission(Permission.UEBA_VIEW)
  async listModels(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedModels> {
    const { page, limit, sortBy, sortOrder, status, modelType } =
      ListModelsQuerySchema.parse(rawQuery)
    return this.uebaService.listModels(tenantId, page, limit, sortBy, sortOrder, status, modelType)
  }

  @Get('entities/:id')
  @RequirePermission(Permission.UEBA_VIEW)
  async getEntityById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<UebaEntityRecord> {
    return this.uebaService.getEntityById(id, tenantId)
  }

  @Post('entities')
  @RequirePermission(Permission.UEBA_CREATE)
  async createEntity(
    @Body(new ZodValidationPipe(CreateEntitySchema)) dto: CreateEntityDto,
    @TenantId() tenantId: string
  ): Promise<UebaEntityRecord> {
    return this.uebaService.createEntity(tenantId, dto)
  }

  @Patch('entities/:id')
  @RequirePermission(Permission.UEBA_UPDATE)
  async updateEntity(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEntitySchema)) dto: UpdateEntityDto,
    @TenantId() tenantId: string
  ): Promise<UebaEntityRecord> {
    return this.uebaService.updateEntity(id, tenantId, dto)
  }

  @Delete('entities/:id')
  @RequirePermission(Permission.UEBA_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteEntity(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<{ deleted: boolean }> {
    return this.uebaService.deleteEntity(id, tenantId)
  }

  @Patch('anomalies/:id/resolve')
  @RequirePermission(Permission.UEBA_UPDATE)
  async resolveAnomaly(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<UebaAnomalyRecord> {
    return this.uebaService.resolveAnomaly(id, tenantId)
  }
}
