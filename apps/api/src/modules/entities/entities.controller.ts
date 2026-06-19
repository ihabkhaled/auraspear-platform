import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { CreateEntitySchema, type CreateEntityDto } from './dto/create-entity.dto'
import { ListEntitiesQuerySchema } from './dto/list-entities-query.dto'
import { UpdateEntitySchema, type UpdateEntityDto } from './dto/update-entity.dto'
import { EntitiesService } from './entities.service'
import { RiskScoringService } from './risk-scoring.service'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  EntityRecord,
  EntityGraphResponse,
  PaginatedEntities,
  RiskBreakdownResponse,
} from './entities.types'

@ApiTags('entities')
@ApiBearerAuth()
@Controller('entities')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class EntitiesController {
  constructor(
    private readonly entitiesService: EntitiesService,
    private readonly riskScoringService: RiskScoringService
  ) {}

  @Get()
  @RequirePermission(Permission.ENTITIES_VIEW)
  async list(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedEntities> {
    const query = ListEntitiesQuerySchema.parse(rawQuery)
    return this.entitiesService.list(tenantId, query)
  }

  @Get('top-risky')
  @RequirePermission(Permission.ENTITIES_VIEW)
  async getTopRisky(@TenantId() tenantId: string): Promise<EntityRecord[]> {
    return this.entitiesService.getTopRisky(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.ENTITIES_VIEW)
  async getById(@TenantId() tenantId: string, @Param('id') id: string): Promise<EntityRecord> {
    return this.entitiesService.findById(tenantId, id)
  }

  @Get(':id/graph')
  @RequirePermission(Permission.ENTITIES_VIEW)
  async getGraph(
    @TenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<EntityGraphResponse> {
    return this.entitiesService.getGraph(tenantId, id)
  }

  @Get(':id/risk-breakdown')
  @RequirePermission(Permission.ENTITIES_VIEW)
  async getRiskBreakdown(
    @TenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<RiskBreakdownResponse> {
    return this.riskScoringService.getEntityRiskBreakdown(id, tenantId)
  }

  @Post()
  @RequirePermission(Permission.ENTITIES_CREATE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(CreateEntitySchema)) dto: CreateEntityDto
  ): Promise<EntityRecord> {
    return this.entitiesService.create(tenantId, dto)
  }

  @Patch(':id')
  @RequirePermission(Permission.ENTITIES_UPDATE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateEntitySchema)) dto: UpdateEntityDto
  ): Promise<EntityRecord> {
    return this.entitiesService.update(tenantId, id, dto)
  }

  @Post('recalculate-risk')
  @RequirePermission(Permission.ENTITIES_UPDATE)
  @Throttle({ default: { limit: 2, ttl: 60000 } })
  async recalculateRisk(@TenantId() tenantId: string): Promise<{ updatedCount: number }> {
    const updatedCount = await this.riskScoringService.recalculateForTenant(tenantId)
    return { updatedCount }
  }
}
