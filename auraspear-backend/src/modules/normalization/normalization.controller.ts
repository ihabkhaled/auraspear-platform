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
import { type CreatePipelineDto, CreatePipelineSchema } from './dto/create-pipeline.dto'
import { type DryRunPipelineDto, DryRunPipelineSchema } from './dto/dry-run-pipeline.dto'
import { ListPipelinesQuerySchema } from './dto/list-pipelines-query.dto'
import { type UpdatePipelineDto, UpdatePipelineSchema } from './dto/update-pipeline.dto'
import { NormalizationService } from './normalization.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  NormalizationOutput,
  NormalizationPipelineRecord,
  NormalizationStats,
  PaginatedPipelines,
} from './normalization.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('normalization')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class NormalizationController {
  constructor(private readonly normalizationService: NormalizationService) {}

  @Get()
  @RequirePermission(Permission.NORMALIZATION_VIEW)
  async listPipelinesRoot(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedPipelines> {
    return this.listPipelines(tenantId, rawQuery)
  }

  @Get('pipelines')
  @RequirePermission(Permission.NORMALIZATION_VIEW)
  async listPipelines(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedPipelines> {
    const { page, limit, sortBy, sortOrder, sourceType, status, query } =
      ListPipelinesQuerySchema.parse(rawQuery)
    return this.normalizationService.listPipelines(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      sourceType,
      status,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.NORMALIZATION_VIEW)
  async getNormalizationStatsRoot(@TenantId() tenantId: string): Promise<NormalizationStats> {
    return this.normalizationService.getNormalizationStats(tenantId)
  }

  @Get('pipelines/stats')
  @RequirePermission(Permission.NORMALIZATION_VIEW)
  async getNormalizationStats(@TenantId() tenantId: string): Promise<NormalizationStats> {
    return this.normalizationService.getNormalizationStats(tenantId)
  }

  @Get('pipelines/:id')
  @RequirePermission(Permission.NORMALIZATION_VIEW)
  async getPipelineById(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ): Promise<NormalizationPipelineRecord> {
    return this.normalizationService.getPipelineById(id, tenantId)
  }

  @Post('pipelines')
  @RequirePermission(Permission.NORMALIZATION_CREATE)
  async createPipeline(
    @Body(new ZodValidationPipe(CreatePipelineSchema)) dto: CreatePipelineDto,
    @CurrentUser() user: JwtPayload
  ): Promise<NormalizationPipelineRecord> {
    return this.normalizationService.createPipeline(dto, user)
  }

  @Patch('pipelines/:id')
  @RequirePermission(Permission.NORMALIZATION_UPDATE)
  async updatePipeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdatePipelineSchema)) dto: UpdatePipelineDto,
    @CurrentUser() user: JwtPayload
  ): Promise<NormalizationPipelineRecord> {
    return this.normalizationService.updatePipeline(id, dto, user)
  }

  @Delete('pipelines/:id')
  @RequirePermission(Permission.NORMALIZATION_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deletePipeline(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.normalizationService.deletePipeline(id, tenantId, user.email)
  }

  @Post('pipelines/:id/dry-run')
  @RequirePermission(Permission.NORMALIZATION_UPDATE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async dryRunPipeline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(DryRunPipelineSchema)) dto: DryRunPipelineDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<NormalizationOutput> {
    return this.normalizationService.dryRunPipeline(id, tenantId, dto.events, user.email)
  }
}
