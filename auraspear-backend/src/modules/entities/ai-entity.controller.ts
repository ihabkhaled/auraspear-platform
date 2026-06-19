import { Controller, Post, Param, ParseUUIDPipe } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiEntityService } from './ai-entity.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('entities')
@ApiBearerAuth()
@Controller('entities')
export class AiEntityController {
  constructor(private readonly aiEntityService: AiEntityService) {}

  @Post(':id/ai/explain-risk')
  @RequirePermission(Permission.ENTITIES_VIEW)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async explainRisk(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiEntityService.explainRisk(id, tenantId, user)
  }
}
