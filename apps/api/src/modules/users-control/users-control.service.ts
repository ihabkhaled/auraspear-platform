import { Injectable, Logger } from '@nestjs/common'
import { UsersControlRepository } from './users-control.repository'
import {
  buildPagination,
  buildUsersControlSessionOrderBy,
  buildUsersControlUserWhere,
  mapUsersControlSession,
  mapUsersControlSummary,
  mapUsersControlUser,
  assertUsersControlRole,
  paginateUsersControlUsers,
  sortUsersControlUsers,
} from './users-control.utilities'
import { AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { UserRole } from '../../common/interfaces/authenticated-request.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { subtractDuration, nowDate } from '../../common/utils/date-time.utility'
import { AUTH_SESSION_ONLINE_WINDOW_MS } from '../auth/auth-session.constants'
import { RefreshTokenFamilyRevocationReason } from '../auth/auth.enums'
import { AuthService } from '../auth/auth.service'
import type { ListControlledUsersQueryDto } from './dto/list-controlled-users-query.dto'
import type { ListUserSessionsQueryDto } from './dto/list-user-sessions-query.dto'
import type {
  UsersControlPagination,
  UsersControlSessionItem,
  UsersControlSummary,
  UsersControlUserListItem,
  UsersControlUserRecord,
} from './users-control.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Injectable()
export class UsersControlService {
  private readonly logger = new Logger(UsersControlService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: UsersControlRepository,
    private readonly authService: AuthService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.USERS_CONTROL, 'UsersControlService')
  }

  async getSummary(actor: JwtPayload, tenantId: string): Promise<UsersControlSummary> {
    this.logger.log(`getSummary called by ${actor.email} for tenant ${tenantId}`)
    assertUsersControlRole(actor.role)
    const scopedTenantId = this.getScopedTenantId(actor, tenantId)
    const where = buildUsersControlUserWhere(undefined, scopedTenantId)
    const onlineThreshold = subtractDuration(
      nowDate(),
      AUTH_SESSION_ONLINE_WINDOW_MS,
      'millisecond'
    )
    const [totalUsers, onlineUsers, activeSessions] = await Promise.all([
      this.repository.countScopedUsers(where),
      this.repository.countScopedOnlineUsers(onlineThreshold, scopedTenantId),
      this.repository.countScopedActiveSessions(scopedTenantId),
    ])

    const summary = mapUsersControlSummary(totalUsers, onlineUsers, activeSessions)
    this.logger.log(
      `getSummary completed: ${String(totalUsers)} total users, ${String(onlineUsers)} online`
    )
    return summary
  }

  async listUsers(
    actor: JwtPayload,
    tenantId: string,
    query: ListControlledUsersQueryDto
  ): Promise<{ data: UsersControlUserListItem[]; pagination: UsersControlPagination }> {
    this.logger.log(`listUsers called by ${actor.email} for tenant ${tenantId}`)
    assertUsersControlRole(actor.role)
    const scopedTenantId = this.getScopedTenantId(actor, tenantId)
    const where = buildUsersControlUserWhere(query.search, scopedTenantId)
    const users = await this.repository.findAllScopedUsers(
      {
        tenantId: scopedTenantId,
        page: query.page,
        limit: query.limit,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
      where
    )
    const sortedUsers = sortUsersControlUsers(
      users.map(user => mapUsersControlUser(user, scopedTenantId)),
      query.sortBy,
      query.sortOrder
    )
    const total = sortedUsers.length

    this.logger.log(`listUsers completed: ${String(total)} total users found`)
    return {
      data: paginateUsersControlUsers(sortedUsers, query.page, query.limit),
      pagination: buildPagination(query.page, query.limit, total),
    }
  }

  async listUserSessions(
    userId: string,
    actor: JwtPayload,
    tenantId: string,
    query: ListUserSessionsQueryDto
  ): Promise<{ data: UsersControlSessionItem[]; pagination: UsersControlPagination }> {
    this.logger.log(`listUserSessions called for user ${userId} by ${actor.email}`)
    assertUsersControlRole(actor.role)
    const scopedTenantId = this.getScopedTenantId(actor, tenantId)
    await this.findScopedUserOrThrow(userId, scopedTenantId)

    const [sessions, total] = await this.repository.findUserSessions(
      {
        userId,
        tenantId: scopedTenantId,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        status: query.status,
      },
      buildUsersControlSessionOrderBy(query.sortBy, query.sortOrder)
    )

    this.logger.log(`listUserSessions completed for user ${userId}: ${String(total)} sessions`)
    return {
      data: sessions.map(mapUsersControlSession),
      pagination: buildPagination(query.page, query.limit, total),
    }
  }

  async forceLogoutUser(
    userId: string,
    actor: JwtPayload,
    tenantId: string
  ): Promise<{ revokedSessions: number }> {
    this.logger.log(`forceLogoutUser called for user ${userId} by ${actor.email}`)
    assertUsersControlRole(actor.role)
    const scopedTenantId = this.getScopedTenantId(actor, tenantId)
    const user = await this.findScopedUserOrThrow(userId, scopedTenantId)
    this.assertCanManageTargetUser(actor, user)
    const targets = await this.repository.findSessionRevocationTargetsByUser(userId, scopedTenantId)
    const revokedSessions = await this.authService.revokeSessionTargets(
      targets,
      RefreshTokenFamilyRevocationReason.FORCE_LOGOUT_USER,
      actor.sub
    )

    this.logger.log(
      `forceLogoutUser completed for user ${userId}: ${String(revokedSessions)} sessions revoked`
    )
    this.log.success('forceLogoutUser', actor.tenantId, {
      targetUserId: userId,
      revokedSessions,
      scopedTenantId,
      actorUserId: actor.sub,
      actorEmail: actor.email,
    })

    return { revokedSessions }
  }

  async terminateSession(
    userId: string,
    sessionId: string,
    actor: JwtPayload,
    tenantId: string
  ): Promise<{ revokedSessions: number }> {
    this.logger.log(
      `terminateSession called for session ${sessionId} of user ${userId} by ${actor.email}`
    )
    const scopedTenantId = this.validateAndScopeUser(actor, tenantId)
    const user = await this.findScopedUserOrThrow(userId, scopedTenantId)
    this.assertCanManageTargetUser(actor, user)

    const targets = await this.findSessionTargetsOrThrow(userId, sessionId, scopedTenantId)
    const revokedSessions = await this.authService.revokeSessionTargets(
      targets,
      RefreshTokenFamilyRevocationReason.FORCE_LOGOUT_SESSION,
      actor.sub
    )

    this.logger.log(
      `terminateSession completed for session ${sessionId}: ${String(revokedSessions)} sessions revoked`
    )
    this.log.success('terminateSession', actor.tenantId, {
      targetUserId: userId,
      targetSessionId: sessionId,
      revokedSessions,
      scopedTenantId,
      actorUserId: actor.sub,
      actorEmail: actor.email,
    })

    return { revokedSessions }
  }

  async forceLogoutAll(actor: JwtPayload, tenantId: string): Promise<{ revokedSessions: number }> {
    this.logger.log(`forceLogoutAll called by ${actor.email} for tenant ${tenantId}`)
    assertUsersControlRole(actor.role)
    const scopedTenantId = this.getScopedTenantId(actor, tenantId)
    const isGlobalAdmin = actor.role === UserRole.GLOBAL_ADMIN
    const targets = await this.repository.findSessionRevocationTargetsByScope(scopedTenantId, {
      actorUserId: actor.sub,
      excludeGlobalAdmins: !isGlobalAdmin,
    })
    const revokedSessions = await this.authService.revokeSessionTargets(
      targets,
      RefreshTokenFamilyRevocationReason.FORCE_LOGOUT_ALL,
      actor.sub
    )

    this.logger.log(`forceLogoutAll completed: ${String(revokedSessions)} sessions revoked`)
    this.log.success('forceLogoutAll', actor.tenantId, {
      revokedSessions,
      scopedTenantId,
      actorUserId: actor.sub,
      actorEmail: actor.email,
    })

    return { revokedSessions }
  }

  private async findScopedUserOrThrow(
    userId: string,
    tenantId?: string
  ): Promise<UsersControlUserRecord> {
    const user = await this.repository.findScopedUser(userId, tenantId)

    if (!user) {
      throw new BusinessException(404, 'User not found', 'errors.userControl.userNotFound')
    }

    return user
  }

  private getScopedTenantId(actor: JwtPayload, tenantId: string): string | undefined {
    if (actor.role === UserRole.GLOBAL_ADMIN) {
      return undefined
    }

    return tenantId
  }

  private assertCanManageTargetUser(actor: JwtPayload, user: UsersControlUserRecord): void {
    if (actor.role === UserRole.GLOBAL_ADMIN) {
      return
    }

    if (user.isProtected) {
      throw new BusinessException(
        403,
        'This user is protected and cannot be modified',
        'errors.tenants.userProtected'
      )
    }

    const hasGlobalAdminMembership = user.memberships.some(
      membership => membership.role === UserRole.GLOBAL_ADMIN
    )

    if (hasGlobalAdminMembership) {
      throw new BusinessException(
        403,
        'Only Global Admin can modify Global Admin users',
        'errors.tenants.cannotModifyGlobalAdmin'
      )
    }
  }

  private validateAndScopeUser(actor: JwtPayload, tenantId: string): string | undefined {
    assertUsersControlRole(actor.role)
    return this.getScopedTenantId(actor, tenantId)
  }

  private async findSessionTargetsOrThrow(
    userId: string,
    sessionId: string,
    scopedTenantId: string | undefined
  ): Promise<Awaited<ReturnType<typeof this.repository.findSessionRevocationTargetsBySession>>> {
    const targets = await this.repository.findSessionRevocationTargetsBySession(
      userId,
      sessionId,
      scopedTenantId
    )

    if (targets.length === 0) {
      throw new BusinessException(404, 'Session not found', 'errors.userControl.sessionNotFound')
    }

    return targets
  }
}
