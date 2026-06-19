import { Body, Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiCloudSecurityService } from './ai-cloud-security.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('cloud-security')
@ApiBearerAuth()
@Controller('cloud-security')
export class AiCloudSecurityController {
  constructor(private readonly aiCloudSecurityService: AiCloudSecurityService) {}

  @Post('findings/:id/ai/triage')
  @RequirePermission(Permission.CLOUD_SECURITY_VIEW)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async triageFinding(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiCloudSecurityService.triageFinding(id, tenantId, user, connector)
  }
}
