import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiDashboardService } from './ai-dashboard.service'
import { type ExplainAnomalyDto, ExplainAnomalySchema } from './dto/ai-dashboard.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('dashboards')
@ApiBearerAuth()
@Controller('dashboards/ai')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AiDashboardController {
  constructor(private readonly aiDashboardService: AiDashboardService) {}

  @Post('explain-anomaly')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async explainAnomaly(
    @Body(new ZodValidationPipe(ExplainAnomalySchema)) dto: ExplainAnomalyDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiDashboardService.explainAnomaly(tenantId, dto, user, dto.connector)
  }

  @Post('daily-summary')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async dailySummary(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body('connector') connector?: string
  ): Promise<AiResponse> {
    return this.aiDashboardService.generateDailySummary(tenantId, user, connector)
  }
}
