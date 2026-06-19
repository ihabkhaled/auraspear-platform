import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ConnectorWorkspacesService } from './connector-workspaces.service'
import {
  PaginationQuerySchema,
  type PaginationQuery,
  WorkspaceSearchSchema,
  type WorkspaceSearchDto,
  WorkspaceActionSchema,
  type WorkspaceActionDto,
  ActionNameSchema,
} from './dto/connector-workspace.dto'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  ConnectorWorkspaceOverview,
  WorkspaceRecentActivityResponse,
  WorkspaceEntitiesResponse,
  WorkspaceSearchResponse,
  WorkspaceActionResponse,
} from './types/connector-workspace.types'

@ApiTags('connector-workspaces')
@ApiBearerAuth()
@Controller('connector-workspaces')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class ConnectorWorkspacesController {
  constructor(private readonly workspacesService: ConnectorWorkspacesService) {}

  @Get(':type/overview')
  @RequirePermission(Permission.CONNECTORS_VIEW)
  async getOverview(
    @TenantId() tenantId: string,
    @Param('type') type: string
  ): Promise<ConnectorWorkspaceOverview> {
    return this.workspacesService.getOverview(tenantId, type)
  }

  @Get(':type/recent-activity')
  @RequirePermission(Permission.CONNECTORS_VIEW)
  async getRecentActivity(
    @TenantId() tenantId: string,
    @Param('type') type: string,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery
  ): Promise<WorkspaceRecentActivityResponse> {
    return this.workspacesService.getRecentActivity(tenantId, type, query.page, query.pageSize)
  }

  @Get(':type/entities')
  @RequirePermission(Permission.CONNECTORS_VIEW)
  async getEntities(
    @TenantId() tenantId: string,
    @Param('type') type: string,
    @Query(new ZodValidationPipe(PaginationQuerySchema)) query: PaginationQuery
  ): Promise<WorkspaceEntitiesResponse> {
    return this.workspacesService.getEntities(tenantId, type, query.page, query.pageSize)
  }

  @Post(':type/search')
  @RequirePermission(Permission.CONNECTORS_VIEW)
  async search(
    @TenantId() tenantId: string,
    @Param('type') type: string,
    @Body(new ZodValidationPipe(WorkspaceSearchSchema)) body: WorkspaceSearchDto
  ): Promise<WorkspaceSearchResponse> {
    return this.workspacesService.search(tenantId, type, body)
  }

  @Post(':type/actions/:action')
  @RequirePermission(Permission.CONNECTORS_UPDATE)
  async executeAction(
    @TenantId() tenantId: string,
    @Param('type') type: string,
    @Param('action') action: string,
    @Body(new ZodValidationPipe(WorkspaceActionSchema)) body: WorkspaceActionDto
  ): Promise<WorkspaceActionResponse> {
    // Validate action name format
    ActionNameSchema.parse(action)

    return this.workspacesService.executeAction(tenantId, type, action, body.params ?? {})
  }
}
