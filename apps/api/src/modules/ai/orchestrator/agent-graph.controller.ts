import { Controller, Get, UseGuards } from '@nestjs/common'
import { AgentGraphService } from './agent-graph.service'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { AgentGraphNode, ScheduleHealthSummary } from './agent-graph.service'

@Controller('ai-agents')
@UseGuards(AuthGuard, TenantGuard)
export class AgentGraphController {
  constructor(private readonly agentGraphService: AgentGraphService) {}

  @Get('graph')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async getAgentGraph(@TenantId() tenantId: string): Promise<AgentGraphNode[]> {
    return this.agentGraphService.getAgentGraph(tenantId)
  }

  @Get('schedule-health')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async getScheduleHealth(@TenantId() tenantId: string): Promise<ScheduleHealthSummary> {
    return this.agentGraphService.getScheduleHealth(tenantId)
  }
}
