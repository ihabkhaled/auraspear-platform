import { Body, Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiAttackPathService } from './ai-attack-path.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('attack-paths')
@ApiBearerAuth()
@Controller('attack-paths')
export class AiAttackPathController {
  constructor(private readonly aiAttackPathService: AiAttackPathService) {}

  @Post(':id/ai/summarize')
  @RequirePermission(Permission.ATTACK_PATHS_VIEW)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async summarize(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiAttackPathService.summarize(id, tenantId, user, connector)
  }
}
