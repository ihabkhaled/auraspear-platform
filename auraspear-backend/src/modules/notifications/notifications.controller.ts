import { Controller, Get, Patch, Param, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ListNotificationsQuerySchema } from './dto/list-notifications-query.dto'
import { NotificationsService } from './notifications.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type { PaginatedNotifications } from './notifications.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('notifications')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermission(Permission.NOTIFICATIONS_VIEW)
  async listNotifications(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedNotifications> {
    const { page, limit, sortBy, sortOrder, query, type, isRead } =
      ListNotificationsQuerySchema.parse(rawQuery)
    return this.notificationsService.listNotifications(
      tenantId,
      user.sub,
      page,
      limit,
      sortBy,
      sortOrder,
      query,
      type,
      isRead
    )
  }

  @Get('unread-count')
  @RequirePermission(Permission.NOTIFICATIONS_VIEW)
  async getUnreadCount(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ count: number }> {
    const count = await this.notificationsService.getUnreadCount(tenantId, user.sub)
    return { count }
  }

  @Patch('read-all')
  @RequirePermission(Permission.NOTIFICATIONS_MANAGE)
  async markAllAsRead(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markAllAsRead(tenantId, user.sub)
    return { success: true }
  }

  @Patch(':id/read')
  @RequirePermission(Permission.NOTIFICATIONS_MANAGE)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ success: boolean }> {
    await this.notificationsService.markAsRead(id, user)
    return { success: true }
  }
}
