import { randomUUID } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RefreshTokenFamilyStatus, RefreshTokenRotationStatus } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { createDefaultAuthSessionContext } from './auth-session.utilities'
import { DUMMY_BCRYPT_HASH, JWT_CLOCK_TOLERANCE_SECONDS } from './auth.constants'
import { RefreshTokenFamilyRevocationReason } from './auth.enums'
import { AuthRepository } from './auth.repository'
import {
  assertAccessClaimsPresent,
  assertRefreshClaimsPresent,
  assertRefreshRotationClaimsPresent,
  assertRefreshSubjectMatches,
  assertTokenTypeValid,
  buildEpochToDate,
  buildExpiryDateFromSeconds,
  buildPayloadFromMembership,
  computeRemainingTtl,
  computeRemainingTtlFromDate,
  extractFamilyFromPayload,
  extractFirstMembershipOrThrow,
  hasGlobalAdminMembership,
  hashTokenIdentifier,
  mapMembershipsToTenantInfos,
  parseExpiryToSeconds,
  preserveImpersonationClaims,
  stripTokenMetaClaims,
} from './auth.utilities'
import { TokenBlacklistService } from './token-blacklist.service'
import { AppLogFeature, TokenType, UserSessionStatus } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { MembershipStatus, UserRole } from '../../common/interfaces/authenticated-request.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { nowDate } from '../../common/utils/date-time.utility'
import { RoleSettingsService } from '../role-settings/role-settings.service'
import type {
  AuthSessionContext,
  AuthorizedTenantContext,
  IssuedAccessToken,
  IssuedRefreshToken,
  IssuedSessionTokens,
  MembershipWithTenant,
  RefreshRotationWithFamily,
  SessionRevocationTarget,
  TenantMembershipInfo,
  UserWithMembershipSummary,
  UserWithMemberships,
} from './auth.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly log: ServiceLogger
  private readonly jwtSecret: string
  private readonly accessExpiry: jwt.SignOptions['expiresIn']
  private readonly refreshExpiry: jwt.SignOptions['expiresIn']

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    private readonly appLogger: AppLoggerService,
    private readonly roleSettingsService: RoleSettingsService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.AUTH, 'AuthService')
    const secret = this.configService.get<string>('JWT_SECRET')
    if (!secret || secret.length < 64 || !/^[\da-f]+$/i.test(secret)) {
      throw new Error('JWT_SECRET must be at least 64 hex characters (32 bytes)')
    }

    this.jwtSecret = secret
    this.accessExpiry = this.configService.get<string>(
      'JWT_ACCESS_EXPIRY',
      '15m'
    ) as jwt.SignOptions['expiresIn']
    this.refreshExpiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d'
    ) as jwt.SignOptions['expiresIn']
  }

  async login(
    email: string,
    password: string,
    sessionContext?: AuthSessionContext
  ): Promise<{
    accessToken: string
    refreshToken: string
    user: JwtPayload
    permissions: string[]
    tenants: TenantMembershipInfo[]
  }> {
    const user = await this.authenticateCredentials(email, password)
    const firstMembership = this.getFirstMembershipOrThrow(user, 'login')
    await this.authRepository.updateLastLogin(user.id)

    const payload = buildPayloadFromMembership(user, firstMembership)
    const session = await this.issueSession(
      user.id,
      firstMembership.tenantId,
      payload,
      sessionContext
    )

    return this.buildLoginResponse(user, firstMembership, payload, session)
  }

  private async authenticateCredentials(
    email: string,
    password: string
  ): Promise<UserWithMemberships> {
    const user = await this.authRepository.findUserByEmailWithMemberships(
      email,
      MembershipStatus.ACTIVE
    )
    const valid = await this.validatePasswordOrDummy(password, user?.passwordHash)

    if (!user?.passwordHash || !valid) {
      this.log.warn('login', 'system', 'Invalid credentials', { actorEmail: email })
      throw new BusinessException(
        401,
        'Invalid email or password',
        'errors.auth.invalidCredentials'
      )
    }

    return user
  }

  private async buildLoginResponse(
    user: UserWithMemberships,
    firstMembership: MembershipWithTenant,
    payload: JwtPayload,
    session: IssuedSessionTokens
  ): Promise<{
    accessToken: string
    refreshToken: string
    user: JwtPayload
    permissions: string[]
    tenants: TenantMembershipInfo[]
  }> {
    const permissions = await this.roleSettingsService.getUserPermissions(
      firstMembership.tenantId,
      firstMembership.role
    )

    this.log.success('login', firstMembership.tenantId, {
      actorEmail: user.email,
      actorUserId: user.id,
    })

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: payload,
      permissions,
      tenants: mapMembershipsToTenantInfos(user.memberships),
    }
  }

  async getPermissions(tenantId: string, role: string): Promise<string[]> {
    this.log.success('getPermissions', tenantId, { role })
    return this.roleSettingsService.getUserPermissions(tenantId, role)
  }

  async issueSession(
    userId: string,
    tenantId: string,
    payload: JwtPayload,
    sessionContext?: AuthSessionContext
  ): Promise<IssuedSessionTokens> {
    this.log.entry('issueSession', tenantId, { actorUserId: userId })

    const issuedRefresh = this.issueRefreshToken(payload)
    const issuedAccess = this.issueAccessTokenBundle({
      ...payload,
      family: issuedRefresh.family,
    })
    await this.createRefreshSession(
      userId,
      tenantId,
      issuedRefresh,
      issuedAccess,
      sessionContext ?? createDefaultAuthSessionContext()
    )

    this.log.success('issueSession', tenantId, {
      actorUserId: userId,
      family: issuedRefresh.family,
    })

    return {
      accessToken: issuedAccess.accessToken,
      refreshToken: issuedRefresh.refreshToken,
    }
  }

  signAccessToken(payload: JwtPayload): string {
    return this.issueAccessTokenBundle(payload).accessToken
  }

  signRefreshToken(payload: JwtPayload, family?: string, generation?: number): string {
    return this.issueRefreshToken(payload, family, generation).refreshToken
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    return this.verifyToken(
      token,
      TokenType.ACCESS,
      'verifyAccessToken',
      'errors.auth.invalidAccessToken',
      true
    )
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.verifyToken(
      token,
      TokenType.REFRESH,
      'verifyRefreshToken',
      'errors.auth.invalidRefreshToken',
      true
    )
  }

  async refreshTokens(
    refreshToken: string,
    requestedTenantId?: string,
    sessionContext?: AuthSessionContext
  ): Promise<IssuedSessionTokens> {
    const payload = await this.verifyRefreshToken(refreshToken)
    const rotation = await this.getRefreshRotationOrThrow(payload)
    await this.assertRefreshRotationCurrent(payload, rotation)

    const user = await this.findActiveUserOrThrow(payload.sub, 'refreshTokens')
    const membership = this.resolveRefreshMembership(user, payload, requestedTenantId)

    const nextPayload = buildPayloadFromMembership(user, membership)
    preserveImpersonationClaims(nextPayload, payload)

    const tokens = await this.rotateAndIssueTokens(
      nextPayload,
      rotation,
      membership.tenantId,
      sessionContext
    )
    await this.finalizeRefreshRotation(payload, rotation, tokens)

    this.logRefreshSuccess(user, membership, rotation, tokens, requestedTenantId)

    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
  }

  private logRefreshSuccess(
    user: UserWithMemberships,
    membership: MembershipWithTenant,
    rotation: RefreshRotationWithFamily,
    tokens: IssuedRefreshToken,
    requestedTenantId?: string
  ): void {
    this.log.success('refreshTokens', membership.tenantId, {
      actorEmail: user.email,
      actorUserId: user.id,
      requestedTenantId: requestedTenantId ?? membership.tenantId,
      family: rotation.family.id,
      generation: tokens.generation,
    })
  }

  async logout(
    accessJti: string,
    refreshJti: string,
    accessExp: number,
    refreshExp: number,
    family?: string,
    actorUserId?: string
  ): Promise<void> {
    const blacklistTasks: Promise<void>[] = [
      this.tokenBlacklistService.blacklist(accessJti, computeRemainingTtl(accessExp)),
      this.tokenBlacklistService.blacklist(refreshJti, computeRemainingTtl(refreshExp)),
    ]

    if (family) {
      blacklistTasks.push(
        this.authRepository.revokeRefreshTokenFamily(
          family,
          RefreshTokenFamilyRevocationReason.LOGOUT,
          nowDate(),
          undefined,
          actorUserId
        )
      )
    }

    await Promise.all(blacklistTasks)
    this.log.success('logout', 'system', { family })
  }

  async performLogout(accessUser: JwtPayload | undefined, refreshToken: string): Promise<void> {
    this.log.entry('performLogout', 'system', { actorUserId: accessUser?.sub })
    assertAccessClaimsPresent(accessUser)

    const refreshPayload = await this.verifyRefreshToken(refreshToken)
    assertRefreshSubjectMatches(refreshPayload, accessUser)
    assertRefreshClaimsPresent(refreshPayload)

    await this.logout(
      accessUser.jti,
      refreshPayload.jti,
      accessUser.exp,
      refreshPayload.exp,
      extractFamilyFromPayload(refreshPayload),
      accessUser.sub
    )

    this.log.success('performLogout', 'system', { actorUserId: accessUser.sub })
  }

  resolveRefreshToken(cookieToken: string | undefined, bodyToken: string | undefined): string {
    const refreshToken = bodyToken ?? cookieToken

    if (!refreshToken) {
      throw new BusinessException(
        400,
        'Refresh token is required',
        'errors.auth.refreshTokenRequired'
      )
    }

    return refreshToken
  }

  async validateUserActive(userId: string): Promise<void> {
    this.log.entry('validateUserActive', 'system', { actorUserId: userId })

    const user = await this.authRepository.findUserByIdWithActiveMembershipCheck(
      userId,
      MembershipStatus.ACTIVE
    )
    if (!user) {
      this.log.warn('validateUserActive', 'system', 'User no longer exists', {
        actorUserId: userId,
      })
      throw new BusinessException(401, 'User no longer exists', 'errors.auth.userNotFound')
    }
    if (user.memberships.length === 0) {
      this.log.warn('validateUserActive', 'system', 'User account is not active', {
        actorUserId: userId,
      })
      throw new BusinessException(401, 'User account is not active', 'errors.auth.accountInactive')
    }

    this.log.success('validateUserActive', 'system', { actorUserId: userId })
  }

  async validateMembershipActive(userId: string, tenantId: string): Promise<void> {
    this.log.entry('validateMembershipActive', tenantId, { actorUserId: userId })

    const membership = await this.authRepository.findMembershipByUserAndTenant(userId, tenantId)
    if (membership?.status !== MembershipStatus.ACTIVE) {
      this.log.warn('validateMembershipActive', tenantId, 'Membership not active — denied', {
        actorUserId: userId,
      })
      throw new BusinessException(401, 'User account is not active', 'errors.auth.accountInactive')
    }

    this.log.success('validateMembershipActive', tenantId, { actorUserId: userId })
  }

  async resolveAuthorizedTenantContext(
    payload: JwtPayload,
    requestedTenantId?: string
  ): Promise<AuthorizedTenantContext> {
    const memberships = await this.authRepository.findActiveMembershipsWithTenant(
      payload.sub,
      MembershipStatus.ACTIVE
    )

    if (memberships.length === 0) {
      this.log.warn(
        'resolveAuthorizedTenantContext',
        payload.tenantId,
        'No active memberships — denied',
        {
          actorUserId: payload.sub,
          requestedTenantId,
        }
      )
      throw new BusinessException(401, 'User account is not active', 'errors.auth.accountInactive')
    }

    const targetTenantId = requestedTenantId ?? payload.tenantId
    const targetMembership = memberships.find(item => item.tenantId === targetTenantId)

    if (targetMembership) {
      return {
        tenantId: targetMembership.tenantId,
        tenantSlug: targetMembership.tenant.slug,
        role: targetMembership.role as UserRole,
      }
    }

    return this.resolveGlobalAdminTenantContext(memberships, targetTenantId, payload.sub)
  }

  async getUserTenants(userId: string): Promise<TenantMembershipInfo[]> {
    const memberships = await this.authRepository.findActiveMembershipsWithTenant(
      userId,
      MembershipStatus.ACTIVE
    )
    this.log.success('getUserTenants', 'system', {
      actorUserId: userId,
      tenantCount: memberships.length,
    })
    return mapMembershipsToTenantInfos(memberships)
  }

  async endImpersonation(
    caller: JwtPayload,
    sessionContext?: AuthSessionContext
  ): Promise<{ accessToken: string; refreshToken: string; user: JwtPayload }> {
    this.assertCallerIsImpersonated(caller)
    await this.revokeImpersonationTokens(caller)

    const admin = await this.findActiveUserOrThrow(
      caller.impersonatorSub as string,
      'endImpersonation'
    )
    const firstMembership = this.getFirstMembershipOrThrow(admin, 'endImpersonation')
    const adminPayload = buildPayloadFromMembership(admin, firstMembership)
    const session = await this.issueSession(
      admin.id,
      firstMembership.tenantId,
      adminPayload,
      sessionContext
    )

    this.log.success('endImpersonation', firstMembership.tenantId, {
      actorEmail: admin.email,
      actorUserId: admin.id,
      impersonatedUserId: caller.sub,
      impersonatedEmail: caller.email,
    })

    return {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      user: adminPayload,
    }
  }

  async findOrCreateUser(
    tenantId: string,
    oidcSub: string,
    email: string,
    name: string
  ): Promise<{ id: string; role: UserRole }> {
    try {
      const user = await this.authRepository.upsertUserByOidcSub(oidcSub, email, name)
      const membership = await this.authRepository.upsertTenantMembership(
        user.id,
        tenantId,
        UserRole.SOC_ANALYST_L1
      )

      this.log.success('findOrCreateUser', tenantId, {
        actorUserId: user.id,
        actorEmail: email,
        role: membership.role,
      })

      return { id: user.id, role: membership.role as UserRole }
    } catch (error) {
      this.logger.error('Failed to upsert user', error)
      this.log.error('findOrCreateUser', tenantId, error, { actorEmail: email })
      throw new BusinessException(401, 'Unable to provision user', 'errors.auth.provisionFailed')
    }
  }

  private async validatePasswordOrDummy(
    password: string,
    passwordHash: string | null | undefined
  ): Promise<boolean> {
    const hashToCompare = passwordHash ?? DUMMY_BCRYPT_HASH
    return bcrypt.compare(password, hashToCompare)
  }

  private issueAccessTokenBundle(payload: JwtPayload): IssuedAccessToken {
    const clean = stripTokenMetaClaims(payload)
    const tokenJti = randomUUID()

    return {
      accessToken: jwt.sign(
        { ...clean, jti: tokenJti, tokenType: TokenType.ACCESS },
        this.jwtSecret,
        {
          algorithm: 'HS256',
          expiresIn: this.accessExpiry,
        }
      ),
      jti: tokenJti,
      expiresAt: buildExpiryDateFromSeconds(parseExpiryToSeconds(String(this.accessExpiry))),
    }
  }

  private issueRefreshToken(
    payload: JwtPayload,
    family?: string,
    generation?: number
  ): IssuedRefreshToken {
    const tokenFamily = family ?? randomUUID()
    const tokenGeneration = generation ?? 0
    const tokenJti = randomUUID()
    const cleanPayload = stripTokenMetaClaims(payload)

    const refreshToken = jwt.sign(
      {
        ...cleanPayload,
        jti: tokenJti,
        tokenType: TokenType.REFRESH,
        family: tokenFamily,
        generation: tokenGeneration,
      },
      this.jwtSecret,
      { algorithm: 'HS256', expiresIn: this.refreshExpiry }
    )

    return {
      refreshToken,
      family: tokenFamily,
      generation: tokenGeneration,
      jti: tokenJti,
      expiresAt: buildExpiryDateFromSeconds(parseExpiryToSeconds(String(this.refreshExpiry))),
    }
  }

  private async createRefreshSession(
    userId: string,
    tenantId: string,
    refreshToken: IssuedRefreshToken,
    accessToken: IssuedAccessToken,
    sessionContext: AuthSessionContext
  ): Promise<void> {
    await this.createTokenFamily(userId, tenantId, refreshToken)
    await this.createTokenRotation(refreshToken)
    await this.createSessionRecord(userId, tenantId, refreshToken, accessToken, sessionContext)
  }

  private async createTokenFamily(
    userId: string,
    tenantId: string,
    refreshToken: IssuedRefreshToken
  ): Promise<void> {
    await this.authRepository.createRefreshTokenFamily({
      id: refreshToken.family,
      userId,
      tenantId,
      currentGeneration: refreshToken.generation,
      expiresAt: refreshToken.expiresAt,
    })
  }

  private async createTokenRotation(refreshToken: IssuedRefreshToken): Promise<void> {
    await this.authRepository.createRefreshTokenRotation({
      familyId: refreshToken.family,
      generation: refreshToken.generation,
      jtiHash: hashTokenIdentifier(refreshToken.jti),
      expiresAt: refreshToken.expiresAt,
    })
  }

  private async createSessionRecord(
    userId: string,
    tenantId: string,
    refreshToken: IssuedRefreshToken,
    accessToken: IssuedAccessToken,
    sessionContext: AuthSessionContext
  ): Promise<void> {
    await this.authRepository.createUserSession({
      familyId: refreshToken.family,
      userId,
      tenantId,
      lastLoginAt: nowDate(),
      currentAccessJti: accessToken.jti,
      currentAccessExpiresAt: accessToken.expiresAt,
      context: sessionContext,
    })
  }

  async touchSessionActivity(
    payload: JwtPayload,
    tenantId: string,
    sessionContext: AuthSessionContext
  ): Promise<void> {
    if (typeof payload.family !== 'string') {
      return
    }

    this.log.entry('touchSessionActivity', tenantId, { actorUserId: payload.sub })

    const updatedCount = await this.authRepository.touchUserSession({
      familyId: payload.family,
      tenantId,
      touchedAt: nowDate(),
      currentAccessJti: payload.jti,
      currentAccessExpiresAt: buildEpochToDate(payload.exp),
      context: sessionContext,
    })

    if (updatedCount > 0) {
      return
    }

    const session = await this.authRepository.findUserSessionByFamilyId(payload.family)
    if (!session) {
      return
    }

    if (session.status !== UserSessionStatus.ACTIVE) {
      throw new BusinessException(401, 'Session has been revoked', 'errors.auth.sessionRevoked')
    }
  }

  async revokeSessionTargets(
    targets: SessionRevocationTarget[],
    reason: RefreshTokenFamilyRevocationReason,
    revokedByUserId?: string
  ): Promise<number> {
    this.log.entry('revokeSessionTargets', 'system', {
      targetCount: targets.length,
      reason,
      revokedByUserId,
    })

    if (targets.length === 0) {
      return 0
    }

    const tasks = this.buildRevocationTasks(targets, reason, revokedByUserId)
    await Promise.all(tasks)

    this.log.success('revokeSessionTargets', 'system', {
      revokedCount: targets.length,
      reason,
      revokedByUserId,
    })

    return targets.length
  }

  private buildRevocationTasks(
    targets: SessionRevocationTarget[],
    reason: RefreshTokenFamilyRevocationReason,
    revokedByUserId?: string
  ): Promise<void>[] {
    const tasks: Promise<void>[] = []

    for (const target of targets) {
      if (target.currentAccessJti && target.currentAccessExpiresAt) {
        tasks.push(
          this.tokenBlacklistService.blacklist(
            target.currentAccessJti,
            computeRemainingTtlFromDate(target.currentAccessExpiresAt)
          )
        )
      }

      tasks.push(
        this.authRepository.revokeRefreshTokenFamily(
          target.familyId,
          reason,
          nowDate(),
          undefined,
          revokedByUserId
        )
      )
    }

    return tasks
  }

  private async getRefreshRotationOrThrow(payload: JwtPayload): Promise<RefreshRotationWithFamily> {
    assertRefreshRotationClaimsPresent(payload)

    const rotation = await this.authRepository.findRefreshTokenRotationByHash(
      hashTokenIdentifier(payload.jti)
    )
    if (rotation?.family.id !== payload.family) {
      this.log.warn(
        'getRefreshRotationOrThrow',
        payload.tenantId,
        'Refresh token rotation record not found',
        {
          actorUserId: payload.sub,
          family: payload.family,
        }
      )
      throw new BusinessException(
        401,
        'Refresh token rotation record not found',
        'errors.auth.invalidRefreshToken'
      )
    }

    return rotation
  }

  private async assertRefreshRotationCurrent(
    payload: JwtPayload,
    rotation: RefreshRotationWithFamily
  ): Promise<void> {
    if (payload.generation !== rotation.generation) {
      throw new BusinessException(
        401,
        'Refresh token generation mismatch',
        'errors.auth.invalidRefreshToken'
      )
    }

    this.assertFamilyNotRevoked(rotation)
    this.assertFamilyNotExpired(rotation)

    if (
      rotation.status !== RefreshTokenRotationStatus.active ||
      rotation.generation !== rotation.family.currentGeneration
    ) {
      await this.handleRefreshReplay(rotation)
    }
  }

  private assertFamilyNotRevoked(rotation: RefreshRotationWithFamily): void {
    if (rotation.family.status === RefreshTokenFamilyStatus.revoked) {
      throw new BusinessException(
        401,
        'Refresh token family has been revoked',
        'errors.auth.tokenReplayDetected'
      )
    }
  }

  private assertFamilyNotExpired(rotation: RefreshRotationWithFamily): void {
    const now = nowDate()

    if (
      rotation.family.status === RefreshTokenFamilyStatus.expired ||
      rotation.expiresAt <= now ||
      rotation.family.expiresAt <= now
    ) {
      void this.authRepository.expireRefreshTokenFamily(rotation.family.id)
      throw new BusinessException(
        401,
        'Refresh token session expired',
        'errors.auth.invalidRefreshToken'
      )
    }
  }

  private resolveRefreshMembership(
    user: UserWithMemberships,
    payload: JwtPayload,
    requestedTenantId?: string
  ): MembershipWithTenant {
    const targetTenantId = requestedTenantId ?? payload.tenantId
    const membership = user.memberships.find(item => item.tenantId === targetTenantId)

    if (!membership) {
      this.log.warn('resolveRefreshMembership', targetTenantId, 'No access to tenant — denied', {
        actorUserId: user.id,
      })
      throw new BusinessException(403, 'No access to this tenant', 'errors.auth.noTenantAccess')
    }

    return membership
  }

  private async handleRefreshReplay(rotation: RefreshRotationWithFamily): Promise<never> {
    await this.authRepository.revokeRefreshTokenFamily(
      rotation.family.id,
      RefreshTokenFamilyRevocationReason.REPLAY_DETECTED,
      nowDate(),
      rotation.id
    )

    this.log.warn(
      'refreshTokens',
      rotation.family.tenantId,
      'Refresh token replay detected — denied',
      {
        actorUserId: rotation.family.userId,
        family: rotation.family.id,
        generation: rotation.generation,
      }
    )

    throw new BusinessException(
      401,
      'Refresh token replay detected',
      'errors.auth.tokenReplayDetected'
    )
  }

  private getFirstMembershipOrThrow(
    user: UserWithMembershipSummary,
    action: string
  ): { tenantId: string; role: string; tenant: { id: string; name: string; slug: string } } {
    try {
      return extractFirstMembershipOrThrow(user)
    } catch {
      this.log.warn(action, 'system', 'No memberships found', {
        actorEmail: user.email,
        actorUserId: user.id,
      })
      throw new BusinessException(401, 'User account is not active', 'errors.auth.accountInactive')
    }
  }

  private async verifyToken(
    token: string,
    expectedType: string,
    action: string,
    errorKey: string,
    checkBlacklist: boolean
  ): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        clockTolerance: JWT_CLOCK_TOLERANCE_SECONDS,
      }) as JwtPayload & { tokenType?: string }

      assertTokenTypeValid(decoded, expectedType, errorKey)
      await this.assertTokenNotBlacklisted(decoded.jti, checkBlacklist)

      return decoded
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error
      }

      this.log.warn(action, 'system', 'Token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw new BusinessException(401, `Invalid or expired ${expectedType} token`, errorKey)
    }
  }

  private async assertTokenNotBlacklisted(
    jti: string | undefined,
    checkBlacklist: boolean
  ): Promise<void> {
    if (!checkBlacklist || !jti) {
      return
    }

    const revoked = await this.tokenBlacklistService.isBlacklisted(jti)
    if (revoked) {
      throw new BusinessException(401, 'Token has been revoked', 'errors.auth.tokenRevoked')
    }
  }

  private async blacklistTokenIfPresent(payload: JwtPayload): Promise<void> {
    if (payload.jti && payload.exp) {
      await this.tokenBlacklistService.blacklist(payload.jti, computeRemainingTtl(payload.exp))
    }
  }

  private async findActiveUserOrThrow(
    userId: string,
    action: string
  ): Promise<UserWithMemberships> {
    const user = await this.authRepository.findUserByIdWithAllActiveMemberships(
      userId,
      MembershipStatus.ACTIVE
    )
    if (!user) {
      this.log.warn(action, 'system', 'User no longer exists', { actorUserId: userId })
      throw new BusinessException(401, 'User no longer exists', 'errors.auth.userNotFound')
    }
    if (user.memberships.length === 0) {
      this.log.warn(action, 'system', 'User has no active memberships', { actorUserId: userId })
      throw new BusinessException(401, 'User account is not active', 'errors.auth.accountInactive')
    }
    return user
  }

  private assertCallerIsImpersonated(caller: JwtPayload): void {
    if (caller.isImpersonated !== true || !caller.impersonatorSub) {
      this.log.warn('endImpersonation', caller.tenantId, 'Not currently impersonating — denied', {
        actorUserId: caller.sub,
        actorEmail: caller.email,
      })
      throw new BusinessException(
        400,
        'Not currently impersonating',
        'errors.impersonation.notImpersonating'
      )
    }
  }

  private async revokeImpersonationTokens(caller: JwtPayload): Promise<void> {
    await this.blacklistTokenIfPresent(caller)
    const family = extractFamilyFromPayload(caller)

    if (family) {
      await this.authRepository.revokeRefreshTokenFamily(
        family,
        RefreshTokenFamilyRevocationReason.IMPERSONATION_ENDED,
        nowDate(),
        undefined,
        caller.impersonatorSub
      )
    }
  }

  private async rotateAndIssueTokens(
    nextPayload: JwtPayload,
    rotation: RefreshRotationWithFamily,
    tenantId: string,
    sessionContext?: AuthSessionContext
  ): Promise<
    IssuedRefreshToken & { accessToken: string; accessJti: string; accessExpiresAt: Date }
  > {
    const issuedRefresh = this.issueRefreshToken(
      nextPayload,
      rotation.family.id,
      rotation.generation + 1
    )
    const issuedAccess = this.issueAccessTokenBundle({
      ...nextPayload,
      family: rotation.family.id,
    })

    await this.persistRotation(rotation, issuedRefresh, issuedAccess, tenantId, sessionContext)

    return {
      ...issuedRefresh,
      accessToken: issuedAccess.accessToken,
      accessJti: issuedAccess.jti,
      accessExpiresAt: issuedAccess.expiresAt,
    }
  }

  private async persistRotation(
    rotation: RefreshRotationWithFamily,
    issuedRefresh: IssuedRefreshToken,
    issuedAccess: IssuedAccessToken,
    tenantId: string,
    sessionContext?: AuthSessionContext
  ): Promise<void> {
    const rotateResult = await this.authRepository.rotateRefreshTokenFamily({
      familyId: rotation.family.id,
      expectedGeneration: rotation.generation,
      previousRotationId: rotation.id,
      nextJtiHash: hashTokenIdentifier(issuedRefresh.jti),
      nextExpiresAt: issuedRefresh.expiresAt,
      nextGeneration: issuedRefresh.generation,
      rotatedAt: nowDate(),
      tenantId,
      currentAccessJti: issuedAccess.jti,
      currentAccessExpiresAt: issuedAccess.expiresAt,
      context: sessionContext ?? createDefaultAuthSessionContext(),
    })

    if (rotateResult.familyAdvanceCount === 0 || rotateResult.newRotation === null) {
      await this.handleRefreshReplay(rotation)
    }
  }

  private async finalizeRefreshRotation(
    payload: JwtPayload,
    _rotation: RefreshRotationWithFamily,
    _tokens: { accessToken: string }
  ): Promise<void> {
    await this.blacklistTokenIfPresent(payload)
  }

  private async resolveGlobalAdminTenantContext(
    memberships: MembershipWithTenant[],
    targetTenantId: string,
    userId: string
  ): Promise<AuthorizedTenantContext> {
    if (!hasGlobalAdminMembership(memberships)) {
      this.log.warn(
        'resolveAuthorizedTenantContext',
        targetTenantId,
        'Not a global admin — denied',
        {
          actorUserId: userId,
        }
      )
      throw new BusinessException(403, 'No access to this tenant', 'errors.auth.noTenantAccess')
    }

    const tenant = await this.authRepository.findTenantById(targetTenantId)
    if (!tenant) {
      this.log.warn('resolveAuthorizedTenantContext', targetTenantId, 'Tenant not found — denied', {
        actorUserId: userId,
      })
      throw new BusinessException(400, 'Invalid tenant ID', 'errors.tenants.notFound')
    }

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      role: UserRole.GLOBAL_ADMIN,
    }
  }
}
