import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AuditLogsService } from './audit-logs.service'
import { SearchAuditLogsSchema } from './dto/search-audit-logs.dto'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { PaginatedAuditLogs } from './audit-logs.types'

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @RequirePermission(Permission.ADMIN_USERS_VIEW)
  async search(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedAuditLogs> {
    const query = SearchAuditLogsSchema.parse(rawQuery)
    return this.auditLogsService.search(tenantId, query)
  }
}
