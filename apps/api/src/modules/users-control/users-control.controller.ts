import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ListControlledUsersQuerySchema } from './dto/list-controlled-users-query.dto'
import { ListUserSessionsQuerySchema } from './dto/list-user-sessions-query.dto'
import {
  USERS_CONTROL_MUTATION_THROTTLE,
  USERS_CONTROL_STANDARD_THROTTLE,
} from './users-control.constants'
import { UsersControlService } from './users-control.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import type {
  UsersControlPagination,
  UsersControlSessionItem,
  UsersControlSummary,
  UsersControlUserListItem,
} from './users-control.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@ApiTags('users-control')
@ApiBearerAuth()
@Controller('users-control')
@UseGuards(AuthGuard, TenantGuard)
@Throttle(USERS_CONTROL_STANDARD_THROTTLE)
export class UsersControlController {
  constructor(private readonly usersControlService: UsersControlService) {}

  @Get('summary')
  @RequirePermission(Permission.USERS_CONTROL_VIEW)
  async getSummary(
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string
  ): Promise<UsersControlSummary> {
    return this.usersControlService.getSummary(user, tenantId)
  }

  @Get('users')
  @RequirePermission(Permission.USERS_CONTROL_VIEW)
  async listUsers(
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<{ data: UsersControlUserListItem[]; pagination: UsersControlPagination }> {
    return this.usersControlService.listUsers(
      user,
      tenantId,
      ListControlledUsersQuerySchema.parse(rawQuery)
    )
  }

  @Get('users/:userId/sessions')
  @RequirePermission(Permission.USERS_CONTROL_VIEW_SESSIONS)
  async listUserSessions(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<{ data: UsersControlSessionItem[]; pagination: UsersControlPagination }> {
    return this.usersControlService.listUserSessions(
      userId,
      user,
      tenantId,
      ListUserSessionsQuerySchema.parse(rawQuery)
    )
  }

  @Post('users/:userId/force-logout')
  @RequirePermission(Permission.USERS_CONTROL_FORCE_LOGOUT)
  @Throttle(USERS_CONTROL_MUTATION_THROTTLE)
  async forceLogoutUser(
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string
  ): Promise<{ revokedSessions: number }> {
    return this.usersControlService.forceLogoutUser(userId, user, tenantId)
  }

  @Post('users/:userId/sessions/:sessionId/force-logout')
  @RequirePermission(Permission.USERS_CONTROL_FORCE_LOGOUT)
  @Throttle(USERS_CONTROL_MUTATION_THROTTLE)
  async terminateSession(
    @Param('userId') userId: string,
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string
  ): Promise<{ revokedSessions: number }> {
    return this.usersControlService.terminateSession(userId, sessionId, user, tenantId)
  }

  @Post('force-logout-all')
  @RequirePermission(Permission.USERS_CONTROL_FORCE_LOGOUT_ALL)
  @Throttle(USERS_CONTROL_MUTATION_THROTTLE)
  async forceLogoutAll(
    @CurrentUser() user: JwtPayload,
    @TenantId() tenantId: string
  ): Promise<{ revokedSessions: number }> {
    return this.usersControlService.forceLogoutAll(user, tenantId)
  }
}
