import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AiKnowledgeService } from './ai-knowledge.service'
import {
  type AiGenerateRunbookDto,
  AiGenerateRunbookSchema,
  type AiSearchKnowledgeDto,
  AiSearchKnowledgeSchema,
} from './dto/ai-knowledge.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Controller('runbooks/ai')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AiKnowledgeController {
  constructor(private readonly aiKnowledgeService: AiKnowledgeService) {}

  @Post('generate')
  @RequirePermission(Permission.RUNBOOKS_CREATE)
  async generateRunbook(
    @Body(new ZodValidationPipe(AiGenerateRunbookSchema)) dto: AiGenerateRunbookDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiKnowledgeService.generateRunbook(
      user.tenantId,
      user.sub,
      user.email,
      dto.description,
      dto.connector
    )
  }

  @Post('search')
  @RequirePermission(Permission.RUNBOOKS_VIEW)
  async aiSearch(
    @Body(new ZodValidationPipe(AiSearchKnowledgeSchema)) dto: AiSearchKnowledgeDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiKnowledgeService.searchWithAi(
      user.tenantId,
      user.sub,
      user.email,
      dto.query,
      dto.connector
    )
  }
}
