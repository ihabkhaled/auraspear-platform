import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AiHandoffService } from './ai-handoff.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { HandoffStats, PromoteResult } from './ai-handoff.service'
import type { AiFindingOutputLink } from '@prisma/client'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

@ApiTags('ai-handoffs')
@ApiBearerAuth()
@Controller('ai-handoffs')
@UseGuards(AuthGuard, TenantGuard)
export class AiHandoffController {
  constructor(private readonly handoffService: AiHandoffService) {}

  @Post('promote')
  @RequirePermission(Permission.AI_HANDOFF_PROMOTE)
  async promote(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: {
      findingId: string
      targetModule: string
      title?: string
      description?: string
    }
  ): Promise<PromoteResult> {
    return this.handoffService.promote({
      tenantId,
      findingId: body.findingId,
      targetModule: body.targetModule,
      actorUserId: user.sub,
      actorEmail: user.email,
      title: body.title,
      description: body.description,
    })
  }

  @Get('history')
  @RequirePermission(Permission.AI_HANDOFF_PROMOTE)
  async getHistory(
    @TenantId() tenantId: string,
    @Query('limit') rawLimit?: string,
    @Query('offset') rawOffset?: string,
    @Query('targetModule') targetModule?: string,
    @Query('agentId') agentId?: string
  ): Promise<{ data: unknown[]; total: number }> {
    const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit ?? '25', 10) || 25))
    const offset = Math.max(0, Number.parseInt(rawOffset ?? '0', 10) || 0)
    return this.handoffService.getHistory(tenantId, { limit, offset, targetModule, agentId })
  }

  @Get('stats')
  @RequirePermission(Permission.AI_HANDOFF_PROMOTE)
  async getStats(@TenantId() tenantId: string): Promise<HandoffStats> {
    return this.handoffService.getStats(tenantId)
  }

  @Get('findings/:id/links')
  @RequirePermission(Permission.AI_HANDOFF_PROMOTE)
  async getFindingLinks(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) findingId: string
  ): Promise<AiFindingOutputLink[]> {
    return this.handoffService.getFindingLinks(tenantId, findingId)
  }
}
