import { Controller, Post, Param, ParseUUIDPipe, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiIntelService } from './ai-intel.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('intel')
@ApiBearerAuth()
@Controller('intel')
export class AiIntelController {
  constructor(private readonly aiIntelService: AiIntelService) {}

  @Post(':id/ai/enrich')
  @RequirePermission(Permission.INTEL_VIEW)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async enrichIoc(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiIntelService.enrichIoc(id, tenantId, user, connector)
  }

  @Post('ai/advisory')
  @RequirePermission(Permission.INTEL_VIEW)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async draftAdvisory(
    @Body() body: { iocIds: string[]; connector?: string },
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiIntelService.draftAdvisory(tenantId, user, body.iocIds, body.connector)
  }
}
