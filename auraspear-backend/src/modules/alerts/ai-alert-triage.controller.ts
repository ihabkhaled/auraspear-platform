import { Body, Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiAlertTriageService } from './ai-alert-triage.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { AiFeatureKey, Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
export class AiAlertTriageController {
  constructor(private readonly aiAlertTriageService: AiAlertTriageService) {}

  @Post(':id/ai/summarize')
  @RequirePermission(Permission.AI_ALERT_TRIAGE)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async summarizeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiAlertTriageService.triageAlert(
      id,
      tenantId,
      AiFeatureKey.ALERT_SUMMARIZE,
      user,
      connector
    )
  }

  @Post(':id/ai/explain-severity')
  @RequirePermission(Permission.AI_ALERT_TRIAGE)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async explainSeverity(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiAlertTriageService.triageAlert(
      id,
      tenantId,
      AiFeatureKey.ALERT_EXPLAIN_SEVERITY,
      user,
      connector
    )
  }

  @Post(':id/ai/false-positive-score')
  @RequirePermission(Permission.AI_ALERT_TRIAGE)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async scoreFalsePositive(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiAlertTriageService.triageAlert(
      id,
      tenantId,
      AiFeatureKey.ALERT_FALSE_POSITIVE_SCORE,
      user,
      connector
    )
  }

  @Post(':id/ai/next-action')
  @RequirePermission(Permission.AI_ALERT_TRIAGE)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async recommendNextAction(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiAlertTriageService.triageAlert(
      id,
      tenantId,
      AiFeatureKey.ALERT_NEXT_ACTION,
      user,
      connector
    )
  }
}
