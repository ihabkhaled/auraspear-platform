import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common'
import * as bcrypt from 'bcryptjs'
import { TenantsRepository } from './tenants.repository'
import {
  buildPagination,
  buildTenantOrderBy,
  buildTenantSearchWhere,
  buildUserOrderBy,
  buildUserSearchWhere,
  canCallerModifyGlobalAdmin,
  isAlreadySuspended,
  isNotInactive,
  isNotSuspended,
  isProtectedUser,
  isSelfAction,
  isUniqueConstraintError,
  mapFindOrCreateResultToUserRecord,
  mapMembershipToUserRecord,
  mapTenantToCounts,
  needsNewUserFields,
} from './tenants.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import {
  MembershipStatus,
  ROLE_HIERARCHY,
  UserRole,
} from '../../common/interfaces/authenticated-request.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { AUTH_BCRYPT_SALT_ROUNDS } from '../auth/auth.constants'
import { AuthService } from '../auth/auth.service'
import { PermissionUpdateReason } from '../notifications/notifications.enums'
import { NotificationsService } from '../notifications/notifications.service'
import type {
  CreateTenantDto,
  UpdateTenantDto,
  AddUserDto,
  UpdateUserDto,
  AssignUserDto,
} from './dto/tenant.dto'
import type {
  TenantRecord,
  TenantWithCounts,
  UserRecord,
  PaginatedResult,
  CheckEmailResult,
  ImpersonationSessionResult,
  FindOrCreateUserResult,
} from './tenants.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { TenantMembership, User } from '@prisma/client'

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly tenantsRepository: TenantsRepository,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    private readonly appLogger: AppLoggerService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.TENANT_MEMBERS, 'TenantsService')
  }

  /* ---------------------------------------------------------------- */
  /* FIND ALL TENANTS                                                  */
  /* ---------------------------------------------------------------- */

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    sortBy = 'name',
    sortOrder = 'asc'
  ): Promise<PaginatedResult<TenantWithCounts>> {
    this.logger.log(`findAll called: page=${String(page)}, limit=${String(limit)}`)
    const where = buildTenantSearchWhere(search)
    const orderBy = buildTenantOrderBy(sortBy, sortOrder)

    const [tenants, total] = await this.tenantsRepository.findAllTenantsWithCounts({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    this.log.success('findAll', '', {
      page,
      limit,
      total,
      hasSearch: Boolean(search),
    })
    return { data: tenants.map(mapTenantToCounts), pagination: buildPagination(page, limit, total) }
  }

  /* ---------------------------------------------------------------- */
  /* FIND BY ID                                                        */
  /* ---------------------------------------------------------------- */

  async findById(id: string): Promise<TenantWithCounts> {
    this.logger.log(`findById called for tenant ${id}`)
    const tenant = await this.tenantsRepository.findByIdWithCounts(id)
    if (!tenant) {
      this.log.warn('findById', id ?? '', 'Tenant findById failed')
      throw new BusinessException(404, 'Tenant not found', 'errors.tenants.notFound')
    }
    this.log.debug('findById', id ?? '', 'Tenant findById')
    return mapTenantToCounts(tenant)
  }

  /* ---------------------------------------------------------------- */
  /* CREATE                                                            */
  /* ---------------------------------------------------------------- */

  async create(dto: CreateTenantDto): Promise<TenantRecord> {
    this.logger.log(`create called for tenant slug=${dto.slug}`)
    try {
      const tenant = await this.tenantsRepository.create({ name: dto.name, slug: dto.slug })
      this.log.success('create', tenant.id ?? '', {
        tenantName: dto.name,
        tenantSlug: dto.slug,
      })
      return tenant
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        this.log.warn('create', '', 'Tenant create failed', { slug: dto.slug })
        throw new BusinessException(
          409,
          'Tenant slug already exists',
          'errors.tenants.slugConflict'
        )
      }
      this.log.error('create', '', error, { slug: dto.slug })
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE                                                            */
  /* ---------------------------------------------------------------- */

  async update(id: string, dto: UpdateTenantDto): Promise<TenantRecord> {
    this.logger.log(`update called for tenant ${id}`)
    const tenant = await this.tenantsRepository.update(id, dto)
    this.log.success('update', id ?? '', { updatedFields: Object.keys(dto) })
    return tenant
  }

  /* ---------------------------------------------------------------- */
  /* REMOVE (SOFT DELETE)                                               */
  /* ---------------------------------------------------------------- */

  async remove(id: string): Promise<{ deleted: boolean }> {
    this.logger.log(`remove called for tenant ${id}`)
    await this.tenantsRepository.deactivateAllMemberships(id, MembershipStatus.INACTIVE)
    this.logger.log(`Tenant ${id} soft-deleted: all memberships deactivated`)
    this.log.success('remove', id ?? '')
    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* FIND USERS                                                        */
  /* ---------------------------------------------------------------- */

  async findUsers(
    tenantId: string,
    page = 1,
    limit = 20,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
    role?: string,
    status?: string
  ): Promise<PaginatedResult<UserRecord>> {
    this.logger.log(
      `findUsers called for tenant ${tenantId}: page=${String(page)}, limit=${String(limit)}`
    )
    try {
      return await this.executeFindUsers(
        tenantId,
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        role,
        status
      )
    } catch (error) {
      this.logger.error(`Failed to fetch users for tenant ${tenantId}`, error)
      this.log.error('findUsers', '', error, { tenantId })
      throw error
    }
  }

  private async executeFindUsers(
    tenantId: string,
    page: number,
    limit: number,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
    role?: string,
    status?: string
  ): Promise<PaginatedResult<UserRecord>> {
    const where = buildUserSearchWhere(tenantId, search, role, status)
    const [memberships, total] = await this.tenantsRepository.findMembershipsWithUsers({
      where,
      orderBy: buildUserOrderBy(sortBy, sortOrder),
      skip: (page - 1) * limit,
      take: limit,
    })

    this.log.success('findUsers', tenantId ?? '', {
      page,
      limit,
      total,
      hasSearch: Boolean(search),
    })
    return {
      data: memberships.map(mapMembershipToUserRecord),
      pagination: buildPagination(page, limit, total),
    }
  }

  /* ---------------------------------------------------------------- */
  /* FIND MEMBERS (LIGHTWEIGHT)                                        */
  /* ---------------------------------------------------------------- */

  async findMembers(tenantId: string): Promise<Array<{ id: string; name: string; email: string }>> {
    this.logger.log(`findMembers called for tenant ${tenantId}`)
    try {
      const memberships = await this.tenantsRepository.findActiveMembersWithUsers(
        tenantId,
        MembershipStatus.ACTIVE
      )
      this.log.debug('findMembers', tenantId ?? '', 'Tenant findMembers', {
        count: memberships.length,
      })
      return memberships.map(m => ({ id: m.user.id, name: m.user.name, email: m.user.email }))
    } catch (error) {
      this.logger.error(`Failed to fetch members for tenant ${tenantId}`, error)
      this.log.error('findMembers', '', error, { tenantId })
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* CHECK EMAIL                                                       */
  /* ---------------------------------------------------------------- */

  async checkEmail(tenantId: string, email: string): Promise<CheckEmailResult> {
    this.logger.log(`checkEmail called for tenant ${tenantId}`)
    const user = await this.tenantsRepository.findUserByEmail(email.toLowerCase().trim())
    if (!user) return { exists: false, user: null, alreadyInTenant: false }

    const membership = await this.tenantsRepository.findMembershipByUserAndTenant(user.id, tenantId)
    this.log.debug('checkEmail', tenantId ?? '', 'Tenant checkEmail', {
      exists: true,
      alreadyInTenant: membership !== null,
    })
    return { exists: true, user, alreadyInTenant: membership !== null }
  }

  /* ---------------------------------------------------------------- */
  /* ASSIGN USER                                                       */
  /* ---------------------------------------------------------------- */

  async assignUser(
    tenantId: string,
    dto: AssignUserDto,
    callerRole: UserRole,
    callerId: string,
    callerEmail: string
  ): Promise<UserRecord> {
    this.logger.log(`assignUser called for tenant ${tenantId}`)
    this.guardGlobalAdminAssignment('assignUser', tenantId, dto.role, callerRole, dto.email)
    const normalizedEmail = dto.email.toLowerCase().trim()

    try {
      const result = await this.performAssignment(tenantId, normalizedEmail, dto)
      this.log.success('assignUser', tenantId ?? '', {
        targetResourceId: result.user.id,
        role: result.membership.role,
      })
      await this.notifyTenantAssigned(
        tenantId,
        result.user.id,
        result.membership.role,
        callerId,
        callerEmail
      )
      return mapFindOrCreateResultToUserRecord(result)
    } catch (error) {
      return this.handleUserMutationError(error, 'assignUser', tenantId, normalizedEmail)
    }
  }

  /* ---------------------------------------------------------------- */
  /* ADD USER                                                          */
  /* ---------------------------------------------------------------- */

  async addUser(tenantId: string, dto: AddUserDto, callerRole: UserRole): Promise<UserRecord> {
    this.logger.log(`addUser called for tenant ${tenantId}`)
    this.guardGlobalAdminAssignment('addUser', tenantId, dto.role, callerRole, dto.email)
    const passwordHash = await bcrypt.hash(dto.password, AUTH_BCRYPT_SALT_ROUNDS)

    try {
      const { user: existingUser, membership: existingMembership } =
        await this.tenantsRepository.findUserWithTenantMembership(dto.email, tenantId)

      this.guardProtectedUser('addUser', tenantId, existingUser)
      if (existingUser && dto.password) {
        throw new BusinessException(
          409,
          'User already exists. Password cannot be changed via add user.',
          'errors.tenants.userAlreadyExists'
        )
      }
      this.guardAlreadyInTenant('addUser', tenantId, existingMembership, dto.email)

      const result = await this.tenantsRepository.findOrCreateUserWithMembership(
        tenantId,
        dto.email,
        dto.role as string,
        existingUser ? undefined : { name: dto.name, passwordHash }
      )

      this.log.success('addUser', tenantId ?? '', {
        targetResourceId: result.user.id,
        role: result.membership.role,
      })
      return mapFindOrCreateResultToUserRecord(result)
    } catch (error) {
      return this.handleUserMutationError(error, 'addUser', tenantId, dto.email)
    }
  }

  /* ---------------------------------------------------------------- */
  /* UPDATE USER                                                       */
  /* ---------------------------------------------------------------- */

  async updateUser(
    tenantId: string,
    userId: string,
    dto: UpdateUserDto,
    callerRole: UserRole,
    callerId: string,
    callerEmail: string
  ): Promise<UserRecord> {
    this.logger.log(`updateUser called for user ${userId} in tenant ${tenantId}`)
    this.guardSelfRoleChange('updateUser', tenantId, callerId, userId, dto.role)
    const membership = await this.findMembershipOrThrow(userId, tenantId, 'updateUser')

    this.guardProtectedUserAction('updateUser', tenantId, userId, membership.user)
    this.guardProtectedRoleChange('updateUser', tenantId, userId, membership, dto.role)
    this.guardGlobalAdminModification('updateUser', tenantId, userId, membership.role, callerRole)
    this.guardGlobalAdminAssignment('updateUser', tenantId, dto.role, callerRole)

    const previousRole = membership.role
    await this.applyUserUpdates(userId, tenantId, dto)

    const updated = await this.findMembershipOrThrow(userId, tenantId, 'updateUser')
    this.log.success('updateUser', tenantId ?? '', {
      targetResourceId: userId,
      updatedFields: Object.keys(dto),
      actorUserId: callerId,
    })

    await this.notifyRoleChangeIfNeeded(
      tenantId,
      userId,
      previousRole,
      dto.role,
      callerId,
      callerEmail
    )
    return mapMembershipToUserRecord(updated)
  }

  private async notifyRoleChangeIfNeeded(
    tenantId: string,
    userId: string,
    previousRole: string,
    newRole: string | undefined,
    callerId: string,
    callerEmail: string
  ): Promise<void> {
    if (newRole === undefined || newRole === previousRole) return
    await this.notificationsService.notifyRoleChanged(
      tenantId,
      userId,
      previousRole,
      newRole,
      callerId,
      callerEmail
    )
    this.notificationsService.emitPermissionsUpdated(
      tenantId,
      userId,
      PermissionUpdateReason.ROLE_UPDATED
    )
  }

  /* ---------------------------------------------------------------- */
  /* REMOVE USER                                                       */
  /* ---------------------------------------------------------------- */

  async removeUser(
    tenantId: string,
    userId: string,
    callerRole: UserRole,
    callerId: string,
    callerEmail: string
  ): Promise<{ deleted: boolean }> {
    this.logger.log(`removeUser called for user ${userId} in tenant ${tenantId}`)
    this.guardSelfAction(
      'removeUser',
      'Cannot delete your own account',
      'errors.tenants.cannotDeleteSelf',
      tenantId,
      callerId,
      userId
    )
    const membership = await this.findMembershipOrThrow(userId, tenantId, 'removeUser')
    this.guardProtectedUserAction('removeUser', tenantId, userId, membership.user)
    this.guardGlobalAdminModification('removeUser', tenantId, userId, membership.role, callerRole)

    await this.tenantsRepository.updateMembershipStatus(userId, tenantId, MembershipStatus.INACTIVE)
    this.log.success('removeUser', tenantId ?? '', {
      targetResourceId: userId,
      actorUserId: callerId,
    })
    await this.notificationsService.notifyUserRemoved(tenantId, userId, callerId, callerEmail)
    this.notificationsService.emitPermissionsUpdated(
      tenantId,
      userId,
      PermissionUpdateReason.MEMBERSHIP_STATUS_UPDATED
    )
    return { deleted: true }
  }

  /* ---------------------------------------------------------------- */
  /* RESTORE USER                                                      */
  /* ---------------------------------------------------------------- */

  async restoreUser(
    tenantId: string,
    userId: string,
    callerRole: UserRole,
    callerId: string,
    callerEmail: string
  ): Promise<UserRecord> {
    this.logger.log(`restoreUser called for user ${userId} in tenant ${tenantId}`)
    const membership = await this.findMembershipOrThrow(userId, tenantId, 'restoreUser')

    if (isNotInactive(membership.status)) {
      this.log.warn('restoreUser', tenantId ?? '', 'Tenant restoreUser failed', {
        userId,
        currentStatus: membership.status,
      })
      throw new BusinessException(400, 'User is not deleted', 'errors.tenants.userNotDeleted')
    }
    this.guardGlobalAdminModification('restoreUser', tenantId, userId, membership.role, callerRole)

    const updated = await this.tenantsRepository.updateMembershipStatusWithUser(
      userId,
      tenantId,
      MembershipStatus.ACTIVE
    )
    this.log.success('restoreUser', tenantId ?? '', {
      targetResourceId: userId,
      actorUserId: callerId,
    })
    await this.notificationsService.notifyUserRestored(tenantId, userId, callerId, callerEmail)
    this.notificationsService.emitPermissionsUpdated(
      tenantId,
      userId,
      PermissionUpdateReason.MEMBERSHIP_STATUS_UPDATED
    )
    return mapMembershipToUserRecord(updated)
  }

  /* ---------------------------------------------------------------- */
  /* BLOCK USER                                                        */
  /* ---------------------------------------------------------------- */

  async blockUser(
    tenantId: string,
    userId: string,
    callerRole: UserRole,
    callerId: string,
    callerEmail: string
  ): Promise<UserRecord> {
    this.logger.log(`blockUser called for user ${userId} in tenant ${tenantId}`)
    this.guardSelfAction(
      'blockUser',
      'Cannot block your own account',
      'errors.tenants.cannotBlockSelf',
      tenantId,
      callerId,
      userId
    )
    const membership = await this.findMembershipOrThrow(userId, tenantId, 'blockUser')
    this.guardProtectedUserAction('blockUser', tenantId, userId, membership.user)
    this.guardGlobalAdminModification('blockUser', tenantId, userId, membership.role, callerRole)
    this.guardNotAlreadySuspended(membership.status, tenantId, userId)

    const updated = await this.tenantsRepository.updateMembershipStatusWithUser(
      userId,
      tenantId,
      MembershipStatus.SUSPENDED
    )
    this.log.success('blockUser', tenantId ?? '', {
      targetResourceId: userId,
      actorUserId: callerId,
    })
    await this.notificationsService.notifyUserBlocked(tenantId, userId, callerId, callerEmail)
    this.notificationsService.emitPermissionsUpdated(
      tenantId,
      userId,
      PermissionUpdateReason.MEMBERSHIP_STATUS_UPDATED
    )
    return mapMembershipToUserRecord(updated)
  }

  private guardNotAlreadySuspended(status: string, tenantId: string, userId: string): void {
    if (!isAlreadySuspended(status)) return
    this.log.warn('blockUser', tenantId ?? '', 'Tenant blockUser failed', { userId })
    throw new BusinessException(400, 'User is already blocked', 'errors.tenants.userAlreadyBlocked')
  }

  /* ---------------------------------------------------------------- */
  /* UNBLOCK USER                                                      */
  /* ---------------------------------------------------------------- */

  async unblockUser(
    tenantId: string,
    userId: string,
    callerRole: UserRole,
    callerId: string,
    callerEmail: string
  ): Promise<UserRecord> {
    this.logger.log(`unblockUser called for user ${userId} in tenant ${tenantId}`)
    const membership = await this.findMembershipOrThrow(userId, tenantId, 'unblockUser')

    if (isNotSuspended(membership.status)) {
      this.log.warn('unblockUser', tenantId ?? '', 'Tenant unblockUser failed', {
        userId,
        currentStatus: membership.status,
      })
      throw new BusinessException(400, 'User is not blocked', 'errors.tenants.userNotBlocked')
    }
    this.guardGlobalAdminModification('unblockUser', tenantId, userId, membership.role, callerRole)

    const updated = await this.tenantsRepository.updateMembershipStatusWithUser(
      userId,
      tenantId,
      MembershipStatus.ACTIVE
    )
    this.log.success('unblockUser', tenantId ?? '', {
      targetResourceId: userId,
      actorUserId: callerId,
    })
    await this.notificationsService.notifyUserUnblocked(tenantId, userId, callerId, callerEmail)
    this.notificationsService.emitPermissionsUpdated(
      tenantId,
      userId,
      PermissionUpdateReason.MEMBERSHIP_STATUS_UPDATED
    )
    return mapMembershipToUserRecord(updated)
  }

  /* ---------------------------------------------------------------- */
  /* IMPERSONATE USER                                                  */
  /* ---------------------------------------------------------------- */

  async impersonateUser(
    tenantId: string,
    userId: string,
    caller: JwtPayload
  ): Promise<ImpersonationSessionResult> {
    this.logger.log(`impersonateUser called for user ${userId} in tenant ${tenantId}`)
    this.guardNestedImpersonation(caller)
    this.guardSelfImpersonation(caller, userId, tenantId)

    const { tenant, targetUser, targetMembership } = await this.resolveImpersonationTarget(
      tenantId,
      userId,
      caller
    )

    const targetPayload = this.buildImpersonationPayload(
      targetUser,
      tenant,
      targetMembership,
      caller
    )
    const session = await this.authService.issueSession(targetUser.id, tenantId, targetPayload)

    this.logImpersonation(tenantId, caller, targetUser, targetMembership.role)
    return this.buildImpersonationResult(session, targetUser, tenant, targetMembership, caller)
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Finders                                                  */
  /* ---------------------------------------------------------------- */

  private async findMembershipOrThrow(
    userId: string,
    tenantId: string,
    action: string
  ): Promise<TenantMembership & { user: User }> {
    const membership = await this.tenantsRepository.findMembershipWithUser(userId, tenantId)
    if (!membership) {
      this.log.warn(action, tenantId ?? '', `Tenant ${action} failed`, { userId })
      throw new BusinessException(
        404,
        'User not found in this tenant',
        'errors.tenants.userNotFound'
      )
    }
    return membership
  }

  private async findTenantOrThrow(
    tenantId: string
  ): Promise<{ id: string; slug: string; name: string }> {
    const tenant = await this.tenantsRepository.findTenantById(tenantId)
    if (!tenant) {
      this.log.warn('impersonateUser', tenantId ?? '', 'Tenant impersonateUser failed')
      throw new BusinessException(404, 'Tenant not found', 'errors.tenants.notFound')
    }
    return tenant
  }

  private async findTargetUserOrThrow(
    userId: string,
    tenantId: string
  ): Promise<{ id: string; email: string; name: string; isProtected: boolean }> {
    const user = await this.tenantsRepository.findUserById(userId)
    if (!user) {
      this.log.warn('impersonateUser', tenantId ?? '', 'Tenant impersonateUser failed', { userId })
      throw new BusinessException(404, 'Target user not found', 'errors.impersonation.userNotFound')
    }
    return user
  }

  private async findActiveMembershipOrThrow(
    userId: string,
    tenantId: string,
    targetEmail: string
  ): Promise<{ role: string; status: string }> {
    const membership = await this.tenantsRepository.findMembershipByUserAndTenant(userId, tenantId)
    if (membership?.status !== MembershipStatus.ACTIVE) {
      this.logDenied('impersonateUser', tenantId, {
        userId,
        targetEmail,
        membershipStatus: membership?.status,
      })
      throw new BusinessException(
        403,
        'Target user is not active in this tenant',
        'errors.impersonation.userNotActive'
      )
    }
    return membership
  }

  private async resolveImpersonationTarget(
    tenantId: string,
    userId: string,
    caller: JwtPayload
  ): Promise<{
    tenant: { id: string; slug: string; name: string }
    targetUser: { id: string; email: string; name: string; isProtected: boolean }
    targetMembership: { role: string; status: string }
  }> {
    const tenant = await this.findTenantOrThrow(tenantId)
    const targetUser = await this.findTargetUserOrThrow(userId, tenantId)
    this.guardImpersonateProtectedUser(targetUser, tenantId)

    const targetMembership = await this.findActiveMembershipOrThrow(
      userId,
      tenantId,
      targetUser.email
    )
    this.guardRoleHierarchy(caller, targetMembership.role as UserRole, tenantId, userId)

    return { tenant, targetUser, targetMembership }
  }

  private buildImpersonationResult(
    session: { accessToken: string; refreshToken: string },
    targetUser: { id: string; email: string },
    tenant: { slug: string },
    targetMembership: { role: string },
    caller: JwtPayload
  ): ImpersonationSessionResult {
    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: {
        sub: targetUser.id,
        email: targetUser.email,
        tenantId: caller.tenantId,
        tenantSlug: tenant.slug,
        role: targetMembership.role,
      },
      impersonator: {
        sub: caller.sub,
        email: caller.email,
        role: caller.role,
        tenantId: caller.tenantId,
        tenantSlug: caller.tenantSlug,
      },
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Guards                                                   */
  /* ---------------------------------------------------------------- */

  private guardGlobalAdminAssignment(
    action: string,
    tenantId: string,
    targetRole: string | undefined,
    callerRole: UserRole,
    email?: string
  ): void {
    if (targetRole === UserRole.GLOBAL_ADMIN && !canCallerModifyGlobalAdmin(callerRole)) {
      this.logDenied(action, tenantId, { email, callerRole })
      throw new BusinessException(
        403,
        'Only Global Admin can assign Global Admin role',
        'errors.tenants.cannotAssignGlobalAdmin'
      )
    }
  }

  private guardGlobalAdminModification(
    action: string,
    tenantId: string,
    userId: string,
    targetRole: string,
    callerRole: UserRole
  ): void {
    if (targetRole === UserRole.GLOBAL_ADMIN && !canCallerModifyGlobalAdmin(callerRole)) {
      this.logDenied(action, tenantId, { userId, callerRole })
      throw new BusinessException(
        403,
        'Only Global Admin can modify Global Admin users',
        'errors.tenants.cannotModifyGlobalAdmin'
      )
    }
  }

  private guardProtectedUser(
    action: string,
    tenantId: string,
    user: { isProtected: boolean } | null
  ): void {
    if (user && isProtectedUser(user)) {
      throw new BusinessException(
        403,
        'Cannot assign a protected user to another tenant',
        'errors.tenants.userProtected'
      )
    }
  }

  private guardProtectedUserAction(
    action: string,
    tenantId: string,
    userId: string,
    user: { isProtected: boolean }
  ): void {
    if (isProtectedUser(user)) {
      this.logDenied(action, tenantId, { userId })
      throw new BusinessException(
        403,
        'This user is protected and cannot be modified',
        'errors.tenants.userProtected'
      )
    }
  }

  private guardProtectedRoleChange(
    action: string,
    tenantId: string,
    userId: string,
    membership: { role: string; user: { isProtected: boolean } },
    newRole?: string
  ): void {
    if (membership.user.isProtected && newRole !== undefined && newRole !== membership.role) {
      this.logDenied(action, tenantId, { userId })
      throw new BusinessException(
        403,
        'Cannot change the role of a protected user',
        'errors.tenants.userProtected'
      )
    }
  }

  private guardAlreadyInTenant(
    action: string,
    tenantId: string,
    membership: unknown,
    email: string
  ): void {
    if (membership) {
      this.log.warn(action, tenantId ?? '', `Tenant ${action} failed`, { email })
      throw new BusinessException(
        409,
        'User is already a member of this tenant',
        'errors.tenants.userAlreadyInTenant'
      )
    }
  }

  private guardNewUserFields(
    action: string,
    tenantId: string,
    dto: { name?: string; password?: string },
    userExists: boolean
  ): void {
    const { missingName, missingPassword } = needsNewUserFields(dto, userExists)
    if (missingName) {
      throw new BusinessException(
        400,
        'Name is required when creating a new user',
        'errors.validation.name.required'
      )
    }
    if (missingPassword) {
      throw new BusinessException(
        400,
        'Password is required when creating a new user',
        'errors.validation.password.required'
      )
    }
  }

  private guardSelfAction(
    action: string,
    message: string,
    key: string,
    tenantId: string,
    callerId: string,
    userId: string
  ): void {
    if (isSelfAction(callerId, userId)) {
      this.logDenied(action, tenantId, { userId, callerId })
      throw new BusinessException(403, message, key)
    }
  }

  private guardSelfRoleChange(
    action: string,
    tenantId: string,
    callerId: string,
    userId: string,
    newRole?: string
  ): void {
    if (isSelfAction(callerId, userId) && newRole !== undefined) {
      this.logDenied(action, tenantId, { userId, callerId })
      throw new BusinessException(
        403,
        'Cannot change your own role',
        'errors.tenants.cannotModifySelf'
      )
    }
  }

  private guardNestedImpersonation(caller: JwtPayload): void {
    if (caller.isImpersonated === true) {
      this.logDenied('impersonateUser', caller.tenantId, { callerSub: caller.sub })
      throw new BusinessException(
        403,
        'Cannot impersonate while already impersonating',
        'errors.impersonation.nestedNotAllowed'
      )
    }
  }

  private guardSelfImpersonation(caller: JwtPayload, userId: string, tenantId: string): void {
    if (caller.sub === userId) {
      this.logDenied('impersonateUser', tenantId, { userId, callerSub: caller.sub })
      throw new BusinessException(
        400,
        'Cannot impersonate yourself',
        'errors.impersonation.cannotImpersonateSelf'
      )
    }
  }

  private guardImpersonateProtectedUser(
    user: { id: string; email: string; isProtected: boolean },
    tenantId: string
  ): void {
    if (user.isProtected) {
      this.logDenied('impersonateUser', tenantId, { userId: user.id, targetEmail: user.email })
      throw new BusinessException(
        403,
        'Protected users cannot be impersonated',
        'errors.impersonation.protectedUser'
      )
    }
  }

  private guardRoleHierarchy(
    caller: JwtPayload,
    targetRole: UserRole,
    tenantId: string,
    userId: string
  ): void {
    const callerIndex = ROLE_HIERARCHY.indexOf(caller.role)
    const targetIndex = ROLE_HIERARCHY.indexOf(targetRole)

    if (callerIndex === -1 || targetIndex === -1) {
      this.logDenied('impersonateUser', tenantId, { userId, callerRole: caller.role, targetRole })
      throw new BusinessException(
        403,
        'Invalid role hierarchy',
        'errors.impersonation.insufficientPrivilege'
      )
    }
    if (callerIndex >= targetIndex) {
      this.logDenied('impersonateUser', tenantId, { userId, callerRole: caller.role, targetRole })
      throw new BusinessException(
        403,
        'Cannot impersonate a user with equal or higher privileges',
        'errors.impersonation.insufficientPrivilege'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Mutation Helpers                                         */
  /* ---------------------------------------------------------------- */

  private async performAssignment(
    tenantId: string,
    normalizedEmail: string,
    dto: AssignUserDto
  ): Promise<FindOrCreateUserResult> {
    const { user: existingUser, membership: existingMembership } =
      await this.tenantsRepository.findUserWithTenantMembership(normalizedEmail, tenantId)

    this.guardProtectedUser('assignUser', tenantId, existingUser)
    this.guardAlreadyInTenant('assignUser', tenantId, existingMembership, normalizedEmail)
    this.guardNewUserFields('assignUser', tenantId, dto, Boolean(existingUser))

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, AUTH_BCRYPT_SALT_ROUNDS)
      : undefined

    return this.tenantsRepository.findOrCreateUserWithMembership(
      tenantId,
      normalizedEmail,
      dto.role as string,
      passwordHash ? { name: dto.name?.trim() ?? '', passwordHash } : undefined
    )
  }

  private async applyUserUpdates(
    userId: string,
    tenantId: string,
    dto: UpdateUserDto
  ): Promise<void> {
    if (dto.role !== undefined) {
      await this.tenantsRepository.updateMembershipRole(userId, tenantId, dto.role as UserRole)
    }
    const userUpdateData: Record<string, unknown> = {}
    if (dto.name !== undefined) {
      userUpdateData.name = dto.name
    }
    if (dto.password !== undefined) {
      userUpdateData.passwordHash = await bcrypt.hash(dto.password, AUTH_BCRYPT_SALT_ROUNDS)
    }
    if (Object.keys(userUpdateData).length > 0) {
      await this.tenantsRepository.updateUser(userId, userUpdateData)
    }
  }

  private async notifyTenantAssigned(
    tenantId: string,
    userId: string,
    role: string,
    callerId: string,
    callerEmail: string
  ): Promise<void> {
    const tenant = await this.tenantsRepository.findTenantById(tenantId)
    await this.notificationsService.notifyTenantAssigned(
      tenantId,
      userId,
      tenant?.name ?? tenantId,
      role,
      callerId,
      callerEmail
    )
  }

  private handleUserMutationError(
    error: unknown,
    action: string,
    tenantId: string,
    email: string
  ): never {
    if (error instanceof BusinessException) throw error
    if (isUniqueConstraintError(error)) {
      this.log.warn(action, tenantId ?? '', `Tenant ${action} failed`, { email })
      throw new BusinessException(
        409,
        'Email already exists in this tenant',
        'errors.tenants.emailExists'
      )
    }
    this.log.error(action, '', error, { tenantId, email })
    throw error
  }

  private buildImpersonationPayload(
    targetUser: { id: string; email: string },
    tenant: { slug: string },
    membership: { role: string },
    caller: JwtPayload
  ): JwtPayload {
    return {
      sub: targetUser.id,
      email: targetUser.email,
      tenantId: caller.tenantId,
      tenantSlug: tenant.slug,
      role: membership.role as UserRole,
      isImpersonated: true,
      impersonatorSub: caller.sub,
      impersonatorEmail: caller.email,
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logDenied(action: string, tenantId?: string, metadata?: Record<string, unknown>): void {
    this.appLogger.warn(`TenantsService => ${action} denied`, {
      feature: AppLogFeature.TENANT_MEMBERS,
      action,
      outcome: AppLogOutcome.DENIED,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'TenantsService',
      functionName: action,
      metadata,
    })
  }

  private logImpersonation(
    tenantId: string,
    caller: JwtPayload,
    targetUser: { id: string; email: string },
    targetRole: string
  ): void {
    this.appLogger.info('Impersonation started', {
      feature: AppLogFeature.IMPERSONATION,
      action: 'impersonateUser',
      outcome: AppLogOutcome.SUCCESS,
      tenantId,
      actorEmail: caller.email,
      actorUserId: caller.sub,
      targetResource: 'User',
      targetResourceId: targetUser.id,
      sourceType: AppLogSourceType.SERVICE,
      className: 'TenantsService',
      functionName: 'impersonateUser',
      metadata: { targetEmail: targetUser.email, targetRole, callerRole: caller.role },
    })
  }
}
