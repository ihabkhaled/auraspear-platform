import { Controller, Get, Param, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { AppLogsService } from './app-logs.service'
import { SearchAppLogsSchema } from './dto/search-app-logs.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { UserRole } from '../../common/interfaces/authenticated-request.interface'
import type { PaginatedApplicationLogs, ApplicationLogRecord } from './app-logs.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@ApiTags('app-logs')
@ApiBearerAuth()
@Controller('app-logs')
export class AppLogsController {
  constructor(private readonly appLogsService: AppLogsService) {}

  @Get()
  @RequirePermission(Permission.ADMIN_USERS_VIEW)
  async search(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedApplicationLogs> {
    const query = SearchAppLogsSchema.parse(rawQuery)

    // GLOBAL_ADMIN sees all logs; TENANT_ADMIN sees only their tenant's logs
    const scopedTenantId = user.role === UserRole.GLOBAL_ADMIN ? undefined : tenantId

    return this.appLogsService.search(query, scopedTenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.ADMIN_USERS_VIEW)
  async findById(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<ApplicationLogRecord> {
    const scopedTenantId = user.role === UserRole.GLOBAL_ADMIN ? undefined : tenantId
    return this.appLogsService.findById(id, scopedTenantId)
  }
}
