import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AiWritebackRepository } from './ai-writeback.repository'
import { AiWritebackService } from './ai-writeback.service'
import { ListFindingsQuerySchema } from './dto/list-findings-query.dto'
import { UpdateFindingStatusSchema } from './dto/update-finding-status.dto'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { PaginatedResponse } from '../../../common/interfaces/pagination.interface'
import type { AiExecutionFinding } from '@prisma/client'

@Controller('ai/findings')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AiWritebackController {
  constructor(
    private readonly repository: AiWritebackRepository,
    private readonly service: AiWritebackService
  ) {}

  /**
   * GET /ai/findings
   * List AI execution findings with full-text search, filters, tenant-scoped, paginated.
   */
  @Get()
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async listFindings(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedResponse<AiExecutionFinding>> {
    const query = ListFindingsQuerySchema.parse(rawQuery)
    return this.repository.listFindings(tenantId, query)
  }

  /**
   * GET /ai/findings/stats
   * IMPORTANT: Static routes must be defined BEFORE :id parameter routes.
   */
  @Get('stats')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async getFindingsStats(@TenantId() tenantId: string) {
    return this.service.getFindingsStats(tenantId)
  }

  /**
   * GET /ai/findings/export
   * Export all findings as array (no pagination) for CSV/JSON download.
   * IMPORTANT: Must be defined BEFORE :id route.
   */
  @Get('export')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async exportFindings(
    @TenantId() tenantId: string,
    @Query('status') status?: string,
    @Query('agentId') agentId?: string,
    @Query('sourceModule') sourceModule?: string
  ): Promise<AiExecutionFinding[]> {
    return this.repository.exportFindings(tenantId, { status, agentId, sourceModule })
  }

  /**
   * GET /ai/findings/by-entity/:entityType/:entityId
   * Get all findings for a specific source entity (alert, case, incident).
   * IMPORTANT: Must be defined BEFORE :id route.
   */
  @Get('by-entity/:entityType/:entityId')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async findingsByEntity(
    @TenantId() tenantId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string
  ): Promise<AiExecutionFinding[]> {
    return this.repository.findingsByEntity(tenantId, entityType, entityId)
  }

  /**
   * POST /ai/findings/bulk-status
   * Update status for multiple findings at once.
   * IMPORTANT: Must be defined BEFORE :id route.
   */
  @Post('bulk-status')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async bulkUpdateStatus(
    @TenantId() tenantId: string,
    @Body() body: { ids: string[]; status: string }
  ): Promise<{ updated: number }> {
    return this.service.bulkUpdateStatus(tenantId, body.ids, body.status)
  }

  /**
   * GET /ai/findings/:id
   * Get a single AI execution finding by ID, tenant-scoped.
   * IMPORTANT: This must come AFTER all static path routes (stats, export, by-entity, bulk-status).
   */
  @Get(':id')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async getFinding(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string
  ): Promise<AiExecutionFinding> {
    return this.service.getFindingById(tenantId, id)
  }

  /**
   * PATCH /ai/findings/:id/status
   * Update the status of a finding with transition validation.
   */
  @Patch(':id/status')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async updateFindingStatus(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Record<string, unknown>
  ): Promise<AiExecutionFinding> {
    const { status } = UpdateFindingStatusSchema.parse(body)
    return this.service.updateFindingStatus(tenantId, id, status)
  }
}
