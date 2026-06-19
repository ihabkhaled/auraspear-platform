import { Controller, Post, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiSoarService } from './ai-soar.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('soar')
@ApiBearerAuth()
@Controller('soar')
export class AiSoarController {
  constructor(private readonly aiSoarService: AiSoarService) {}

  @Post('ai/draft-playbook')
  @RequirePermission(Permission.AI_SOAR_COPILOT)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async draftPlaybook(
    @Body() body: { description: string; connector?: string },
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiSoarService.draftPlaybook(tenantId, user, body.description, body.connector)
  }
}
