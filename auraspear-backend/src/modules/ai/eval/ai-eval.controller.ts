import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { AiEvalService } from './ai-eval.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

@Controller('ai-eval')
@UseGuards(AuthGuard, TenantGuard)
export class AiEvalController {
  constructor(private readonly aiEvalService: AiEvalService) {}

  @Get('suites')
  @RequirePermission(Permission.AI_EVAL_VIEW)
  listSuites(@CurrentUser() user: JwtPayload) {
    return this.aiEvalService.listSuites(user.tenantId)
  }

  @Post('suites')
  @RequirePermission(Permission.AI_EVAL_MANAGE)
  createSuite(
    @Body() body: { name: string; description?: string; datasetJson: unknown },
    @CurrentUser() user: JwtPayload
  ) {
    return this.aiEvalService.createSuite(user.tenantId, body, user.sub)
  }

  @Delete('suites/:id')
  @RequirePermission(Permission.AI_EVAL_MANAGE)
  deleteSuite(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.aiEvalService.deleteSuite(user.tenantId, id)
  }

  @Get('runs')
  @RequirePermission(Permission.AI_EVAL_VIEW)
  listRuns(@Query('suiteId') suiteId: string | undefined, @CurrentUser() user: JwtPayload) {
    return this.aiEvalService.listRuns(user.tenantId, suiteId)
  }

  @Get('runs/:id')
  @RequirePermission(Permission.AI_EVAL_VIEW)
  getRunDetail(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.aiEvalService.getRunDetail(user.tenantId, id)
  }

  @Post('runs')
  @RequirePermission(Permission.AI_EVAL_MANAGE)
  startRun(
    @Body() body: { suiteId: string; provider: string; model: string },
    @CurrentUser() user: JwtPayload
  ) {
    return this.aiEvalService.startRun(user.tenantId, body, user.sub)
  }

  @Get('stats')
  @RequirePermission(Permission.AI_EVAL_VIEW)
  getStats(@CurrentUser() user: JwtPayload) {
    return this.aiEvalService.getStats(user.tenantId)
  }
}
