import { Controller, Post, Param, Get } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ConnectorSyncService } from './connector-sync.service'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { ConnectorSyncStatusItem } from './connector-sync.types'

@ApiTags('connector-sync')
@ApiBearerAuth()
@Controller('connector-sync')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class ConnectorSyncController {
  constructor(private readonly syncService: ConnectorSyncService) {}

  /** Manually trigger a sync for a specific connector type. */
  @Post(':type/sync')
  @RequirePermission(Permission.CONNECTORS_SYNC)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async triggerSync(
    @TenantId() tenantId: string,
    @Param('type') type: string
  ): Promise<{ success: boolean; message: string; ingested?: number }> {
    return this.syncService.syncConnector(tenantId, type)
  }

  /** Get sync status for all connectors of the current tenant. */
  @Get('status')
  @RequirePermission(Permission.CONNECTORS_VIEW)
  async getSyncStatus(@TenantId() tenantId: string): Promise<ConnectorSyncStatusItem[]> {
    return this.syncService.getSyncStatus(tenantId)
  }
}
