import { Body, Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiUebaService } from './ai-ueba.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('ueba')
@ApiBearerAuth()
@Controller('ueba')
export class AiUebaController {
  constructor(private readonly aiUebaService: AiUebaService) {}

  @Post('anomalies/:id/ai/explain')
  @RequirePermission(Permission.UEBA_VIEW)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async explainAnomaly(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiUebaService.explainAnomaly(id, tenantId, user, connector)
  }
}
