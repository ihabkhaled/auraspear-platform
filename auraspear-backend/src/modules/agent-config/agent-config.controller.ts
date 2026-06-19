import { Controller, Get, Patch, Post, Delete, Param, Query, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AgentConfigService } from './agent-config.service'
import { CreateOsintSourceSchema, type CreateOsintSourceDto } from './dto/create-osint-source.dto'
import { ResolveApprovalSchema, type ResolveApprovalDto } from './dto/resolve-approval.dto'
import { UpdateAgentConfigSchema, type UpdateAgentConfigDto } from './dto/update-agent-config.dto'
import { UpdateOsintSourceSchema, type UpdateOsintSourceDto } from './dto/update-osint-source.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission, TokenResetPeriod } from '../../common/enums'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  AgentConfigWithDefaults,
  AiApprovalRequestRecord,
  OsintSourceRedacted,
  OsintTestResult,
} from './agent-config.types'

@ApiTags('agent-config')
@ApiBearerAuth()
@Controller('agent-config')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AgentConfigController {
  constructor(private readonly agentConfigService: AgentConfigService) {}

  // ─── Agent Configs ──────────────────────────────────────────

  @Get('agents')
  @RequirePermission(Permission.AI_CONFIG_VIEW)
  async listAgents(@TenantId() tenantId: string): Promise<AgentConfigWithDefaults[]> {
    return this.agentConfigService.getAgentConfigs(tenantId)
  }

  @Get('agents/:agentId')
  @RequirePermission(Permission.AI_CONFIG_VIEW)
  async getAgent(
    @TenantId() tenantId: string,
    @Param('agentId') agentId: string
  ): Promise<AgentConfigWithDefaults> {
    return this.agentConfigService.getAgentConfig(tenantId, agentId)
  }

  @Patch('agents/:agentId')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateAgent(
    @TenantId() tenantId: string,
    @Param('agentId') agentId: string,
    @Body(new ZodValidationPipe(UpdateAgentConfigSchema)) dto: UpdateAgentConfigDto,
    @CurrentUser('email') actor: string
  ): Promise<AgentConfigWithDefaults> {
    return this.agentConfigService.updateAgentConfig(tenantId, agentId, dto, actor)
  }

  @Post('agents/:agentId/toggle')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async toggleAgent(
    @TenantId() tenantId: string,
    @Param('agentId') agentId: string,
    @Body('enabled') enabled: boolean,
    @CurrentUser('email') actor: string
  ): Promise<AgentConfigWithDefaults> {
    return this.agentConfigService.toggleAgent(tenantId, agentId, enabled, actor)
  }

  @Post('agents/:agentId/reset-usage/:period')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetUsage(
    @TenantId() tenantId: string,
    @Param('agentId') agentId: string,
    @Param('period') period: TokenResetPeriod,
    @CurrentUser('email') actor: string
  ): Promise<AgentConfigWithDefaults> {
    return this.agentConfigService.resetUsage(tenantId, agentId, period, actor)
  }

  @Post('agents/bulk-toggle')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkToggleAgents(
    @TenantId() tenantId: string,
    @Body('enabled') enabled: boolean,
    @CurrentUser('email') actor: string
  ): Promise<{ updated: number }> {
    return this.agentConfigService.bulkToggleAgents(tenantId, enabled, actor)
  }

  // ─── OSINT Sources ─────────────────────────────────────────

  @Get('osint-sources')
  @RequirePermission(Permission.AI_CONFIG_VIEW)
  async listOsintSources(@TenantId() tenantId: string): Promise<OsintSourceRedacted[]> {
    return this.agentConfigService.listOsintSources(tenantId)
  }

  @Post('osint-sources/seed')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async seedOsintSources(@TenantId() tenantId: string): Promise<void> {
    await this.agentConfigService.seedBuiltinSources(tenantId)
  }

  @Post('osint-sources')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createOsintSource(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(CreateOsintSourceSchema)) dto: CreateOsintSourceDto,
    @CurrentUser('email') actor: string
  ): Promise<OsintSourceRedacted> {
    return this.agentConfigService.createOsintSource(tenantId, dto, actor)
  }

  @Patch('osint-sources/:id')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateOsintSource(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOsintSourceSchema)) dto: UpdateOsintSourceDto,
    @CurrentUser('email') actor: string
  ): Promise<OsintSourceRedacted> {
    return this.agentConfigService.updateOsintSource(id, tenantId, dto, actor)
  }

  @Delete('osint-sources/:id')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteOsintSource(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('email') actor: string
  ): Promise<void> {
    return this.agentConfigService.deleteOsintSource(id, tenantId, actor)
  }

  @Post('osint-sources/:id/test')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async testOsintSource(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('email') actor: string
  ): Promise<OsintTestResult> {
    return this.agentConfigService.testOsintSource(id, tenantId, actor)
  }

  @Post('osint-sources/bulk-toggle')
  @RequirePermission(Permission.AI_CONFIG_MANAGE_OSINT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkToggleOsintSources(
    @TenantId() tenantId: string,
    @Body('enabled') enabled: boolean
  ): Promise<{ updated: number }> {
    return this.agentConfigService.bulkToggleOsintSources(tenantId, enabled)
  }

  // ─── Approvals ─────────────────────────────────────────────

  @Get('approvals')
  @RequirePermission(Permission.AI_APPROVALS_MANAGE)
  async listApprovals(
    @TenantId() tenantId: string,
    @Query('status') status?: string
  ): Promise<AiApprovalRequestRecord[]> {
    return this.agentConfigService.listApprovals(tenantId, status)
  }

  @Post('approvals/:id/resolve')
  @RequirePermission(Permission.AI_APPROVALS_MANAGE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async resolveApproval(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ResolveApprovalSchema)) dto: ResolveApprovalDto,
    @CurrentUser('email') actor: string
  ): Promise<AiApprovalRequestRecord> {
    return this.agentConfigService.resolveApproval(id, tenantId, dto, actor)
  }
}
