import { Body, Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiCaseCopilotService } from './ai-case-copilot.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { AiFeatureKey, Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('cases')
@ApiBearerAuth()
@Controller('cases')
export class AiCaseCopilotController {
  constructor(private readonly aiCaseCopilotService: AiCaseCopilotService) {}

  @Post(':id/ai/summarize')
  @RequirePermission(Permission.AI_CASE_COPILOT)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async summarizeCase(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiCaseCopilotService.analyzeCase(
      id,
      tenantId,
      AiFeatureKey.CASE_SUMMARIZE,
      user,
      connector
    )
  }

  @Post(':id/ai/executive-summary')
  @RequirePermission(Permission.AI_CASE_COPILOT)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async executiveSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiCaseCopilotService.analyzeCase(
      id,
      tenantId,
      AiFeatureKey.CASE_EXECUTIVE_SUMMARY,
      user,
      connector
    )
  }

  @Post(':id/ai/timeline')
  @RequirePermission(Permission.AI_CASE_COPILOT)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async synthesizeTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiCaseCopilotService.analyzeCase(
      id,
      tenantId,
      AiFeatureKey.CASE_TIMELINE,
      user,
      connector
    )
  }

  @Post(':id/ai/next-tasks')
  @RequirePermission(Permission.AI_CASE_COPILOT)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async suggestNextTasks(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiCaseCopilotService.analyzeCase(
      id,
      tenantId,
      AiFeatureKey.CASE_NEXT_TASKS,
      user,
      connector
    )
  }
}
