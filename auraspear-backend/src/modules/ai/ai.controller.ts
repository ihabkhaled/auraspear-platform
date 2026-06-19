import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AiService } from './ai.service'
import { AiExplainSchema, type AiExplainDto } from './dto/ai-explain.dto'
import { type AiHuntDto, AiHuntSchema } from './dto/ai-hunt.dto'
import { type AiInvestigateDto, AiInvestigateSchema } from './dto/ai-investigate.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { AiResponse } from './ai.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('ai')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/hunt
   * AI-assisted threat hunting. Requires tenant to have
   * a Bedrock connector with aiEnabled=true.
   */
  @Post('hunt')
  @RequirePermission(Permission.AI_AGENTS_EXECUTE)
  async aiHunt(
    @Body(new ZodValidationPipe(AiHuntSchema)) dto: AiHuntDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiService.aiHunt(dto, user)
  }

  /**
   * POST /ai/investigate
   * AI-powered investigation of a specific alert. Requires tenant
   * to have a Bedrock connector with aiEnabled=true.
   */
  @Post('investigate')
  @RequirePermission(Permission.AI_AGENTS_EXECUTE)
  async aiInvestigate(
    @Body(new ZodValidationPipe(AiInvestigateSchema)) dto: AiInvestigateDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiService.aiInvestigate(dto, user)
  }

  /**
   * POST /ai/explain
   * Explainable AI output -- break down a security finding or concept
   * into analyst-friendly language. Requires tenant to have a Bedrock
   * connector with aiEnabled=true.
   */
  @Post('explain')
  @RequirePermission(Permission.AI_AGENTS_EXECUTE)
  async aiExplain(
    @Body(new ZodValidationPipe(AiExplainSchema)) dto: AiExplainDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiService.aiExplain(dto, user)
  }
}
