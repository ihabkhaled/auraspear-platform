import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { RagObservabilityService } from './rag-observability.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { RagStats, RagTraceResult } from './rag-observability.service'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

@ApiTags('rag-observability')
@ApiBearerAuth()
@Controller('rag')
@UseGuards(AuthGuard, TenantGuard)
export class RagObservabilityController {
  constructor(private readonly ragService: RagObservabilityService) {}

  @Get('trace')
  @RequirePermission(Permission.AI_MEMORY_VIEW)
  async traceRetrieval(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query('query') query: string
  ): Promise<RagTraceResult> {
    return this.ragService.traceRetrieval(tenantId, user.sub, query ?? '')
  }

  @Get('stats')
  @RequirePermission(Permission.AI_MEMORY_VIEW)
  async getStats(@TenantId() tenantId: string): Promise<RagStats> {
    return this.ragService.getStats(tenantId)
  }
}
