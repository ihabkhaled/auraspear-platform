import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiReportService } from './ai-report.service'
import { type AiExecutiveReportDto, AiExecutiveReportSchema } from './dto/ai-report.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports/ai')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 5, ttl: 60000 } })
export class AiReportController {
  constructor(private readonly aiReportService: AiReportService) {}

  @Post('executive')
  @RequirePermission(Permission.REPORTS_VIEW)
  async generateExecutiveReport(
    @Body(new ZodValidationPipe(AiExecutiveReportSchema)) dto: AiExecutiveReportDto,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AiResponse> {
    return this.aiReportService.generateExecutiveReport(
      tenantId,
      dto.timeRange,
      user,
      dto.connector
    )
  }
}
