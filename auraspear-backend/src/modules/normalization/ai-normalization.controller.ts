import { Body, Controller, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AiNormalizationService } from './ai-normalization.service'
import { type AiVerifyPipelineDto, AiVerifyPipelineSchema } from './dto/ai-normalization.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Controller('normalization')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AiNormalizationController {
  constructor(private readonly aiNormService: AiNormalizationService) {}

  @Post('pipelines/:pipelineId/ai/verify')
  @RequirePermission(Permission.AI_DETECTION_COPILOT)
  async verifyPipeline(
    @TenantId() tenantId: string,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body(new ZodValidationPipe(AiVerifyPipelineSchema)) dto: AiVerifyPipelineDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiNormService.verifyPipeline(
      tenantId,
      user.sub,
      user.email,
      pipelineId,
      dto.sampleEvents,
      dto.connector
    )
  }
}
