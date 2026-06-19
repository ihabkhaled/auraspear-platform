import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { DispatchTaskSchema } from './dto/dispatch-task.dto'
import { ListHistoryQuerySchema } from './dto/list-history-query.dto'
import { OrchestratorService } from './orchestrator.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe'
import type { DispatchTaskDto } from './dto/dispatch-task.dto'
import type {
  OrchestratorDispatchResult,
  OrchestratorHistoryEntry,
  OrchestratorStatsResult,
} from './orchestrator.types'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'
import type { PaginatedResponse } from '../../../common/interfaces/pagination.interface'

@ApiTags('orchestrator')
@ApiBearerAuth()
@Controller('agent-config')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('agents/:agentId/dispatch')
  @RequirePermission(Permission.AI_AGENTS_EXECUTE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async dispatchTask(
    @Param('agentId') agentId: string,
    @Body(new ZodValidationPipe(DispatchTaskSchema)) dto: DispatchTaskDto,
    @CurrentUser() user: JwtPayload
  ): Promise<OrchestratorDispatchResult> {
    return this.orchestratorService.dispatchFromHttp(agentId, dto, user)
  }

  @Get('agents/:agentId/history')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async getAgentHistory(
    @Param('agentId') agentId: string,
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedResponse<OrchestratorHistoryEntry>> {
    const query = ListHistoryQuerySchema.parse(rawQuery)
    return this.orchestratorService.getAgentHistory(agentId, tenantId, query)
  }

  @Get('orchestrator/stats')
  @RequirePermission(Permission.AI_CONFIG_VIEW)
  async getOrchestratorStats(@TenantId() tenantId: string): Promise<OrchestratorStatsResult> {
    return this.orchestratorService.getOrchestratorStats(tenantId)
  }
}
