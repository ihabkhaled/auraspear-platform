import { Controller, Post, Param, ParseUUIDPipe, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiDetectionCopilotService } from './ai-detection-copilot.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { AiFeatureKey, Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('detection-rules')
@ApiBearerAuth()
@Controller('detection-rules')
export class AiDetectionCopilotController {
  constructor(private readonly aiDetectionCopilotService: AiDetectionCopilotService) {}

  @Post('ai/draft')
  @RequirePermission(Permission.AI_DETECTION_COPILOT)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async draftRule(
    @Body() body: { description: string; connector?: string },
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiDetectionCopilotService.draftRule(
      tenantId,
      body.description,
      user,
      body.connector
    )
  }

  @Post(':id/ai/tuning')
  @RequirePermission(Permission.AI_DETECTION_COPILOT)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async tuningRule(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiDetectionCopilotService.analyzeRule(
      id,
      tenantId,
      AiFeatureKey.DETECTION_TUNING,
      user,
      connector
    )
  }
}
