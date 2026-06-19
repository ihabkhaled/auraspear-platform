import { createHash } from 'node:crypto'
import { DEFAULT_REFRESH_EXPIRY_SECONDS } from './auth.constants'
import { AuthExpiryUnit } from './auth.enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { UserRole } from '../../common/interfaces/authenticated-request.interface'
import {
  expiresInSeconds,
  fromUnixToDate,
  nowUnix,
  remainingSecondsUntilDate,
} from '../../common/utils/date-time.utility'
import type {
  AuthUserIdentity,
  MembershipWithTenant,
  TenantMembershipInfo,
  UserWithMembershipSummary,
} from './auth.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

export function mapMembershipsToTenantInfos(
  memberships: MembershipWithTenant[]
): TenantMembershipInfo[] {
  return memberships.map(m => ({
    id: m.tenant.id,
    name: m.tenant.name,
    slug: m.tenant.slug,
    role: m.role as UserRole,
  }))
}

/* ---------------------------------------------------------------- */
/* PAYLOAD BUILDING                                                  */
/* ---------------------------------------------------------------- */

export function buildPayloadFromMembership(
  user: AuthUserIdentity,
  membership: MembershipWithTenant
): JwtPayload {
  return {
    sub: user.id,
    email: user.email,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    role: membership.role as UserRole,
  }
}

export function preserveImpersonationClaims(newPayload: JwtPayload, original: JwtPayload): void {
  if (original.isImpersonated === true) {
    newPayload.isImpersonated = true
    newPayload.impersonatorSub = original.impersonatorSub
    newPayload.impersonatorEmail = original.impersonatorEmail
  }
}

/* ---------------------------------------------------------------- */
/* TOKEN TTL                                                         */
/* ---------------------------------------------------------------- */

export function computeRemainingTtl(exp: number): number {
  return Math.max(exp - nowUnix(), 0)
}

export function computeRemainingTtlFromDate(expiresAt: Date): number {
  return remainingSecondsUntilDate(expiresAt)
}

export function buildExpiryDateFromSeconds(ttlSeconds: number): Date {
  return expiresInSeconds(ttlSeconds)
}

export function hashTokenIdentifier(identifier: string): string {
  return createHash('sha256').update(identifier).digest('hex')
}

/* ---------------------------------------------------------------- */
/* CLAIM ASSERTIONS                                                   */
/* ---------------------------------------------------------------- */

export function assertRefreshRotationClaimsPresent(
  payload: JwtPayload
): asserts payload is JwtPayload & { jti: string; family: string; generation: number } {
  if (
    !payload.jti ||
    typeof payload.family !== 'string' ||
    typeof payload.generation !== 'number'
  ) {
    throw new BusinessException(
      401,
      'Refresh token missing rotation claims',
      'errors.auth.invalidRefreshToken'
    )
  }
}

export function assertAccessClaimsPresent(
  payload: JwtPayload | undefined
): asserts payload is JwtPayload & { jti: string; exp: number } {
  if (!payload?.jti || !payload?.exp) {
    throw new BusinessException(
      401,
      'Access token missing required claims',
      'errors.auth.invalidAccessToken'
    )
  }
}

export function assertRefreshClaimsPresent(
  payload: JwtPayload
): asserts payload is JwtPayload & { jti: string; exp: number } {
  if (!payload.jti || !payload.exp) {
    throw new BusinessException(
      401,
      'Refresh token missing required claims',
      'errors.auth.invalidRefreshToken'
    )
  }
}

export function assertRefreshSubjectMatches(
  refreshPayload: JwtPayload,
  accessUser: JwtPayload
): void {
  if (refreshPayload.sub !== accessUser.sub) {
    throw new BusinessException(
      403,
      'Refresh token does not belong to this user',
      'errors.auth.tokenMismatch'
    )
  }
}

export function assertTokenTypeValid(
  decoded: { tokenType?: string },
  expectedType: string,
  errorKey = 'errors.auth.invalidAccessToken'
): void {
  if (decoded.tokenType !== expectedType) {
    throw new BusinessException(401, `Invalid token type — expected ${expectedType}`, errorKey)
  }
}

/* ---------------------------------------------------------------- */
/* MEMBERSHIP HELPERS                                                 */
/* ---------------------------------------------------------------- */

export function extractFirstMembershipOrThrow(user: UserWithMembershipSummary): {
  tenantId: string
  role: string
  tenant: { id: string; name: string; slug: string }
} {
  if (user.memberships.length === 0) {
    throw new BusinessException(401, 'User account is not active', 'errors.auth.accountInactive')
  }

  const first = user.memberships[0]
  if (!first) {
    throw new BusinessException(401, 'User account is not active', 'errors.auth.accountInactive')
  }

  return first
}

export function hasGlobalAdminMembership(memberships: MembershipWithTenant[]): boolean {
  return memberships.some(item => item.role === UserRole.GLOBAL_ADMIN)
}

/* ---------------------------------------------------------------- */
/* MISC HELPERS                                                       */
/* ---------------------------------------------------------------- */

export function extractFamilyFromPayload(payload: JwtPayload): string | undefined {
  return typeof payload.family === 'string' ? payload.family : undefined
}

export function buildEpochToDate(epochSeconds: number | undefined): Date | undefined {
  return epochSeconds === undefined ? undefined : fromUnixToDate(epochSeconds)
}

export function stripTokenMetaClaims(
  payload: JwtPayload
): Omit<JwtPayload, 'iat' | 'exp' | 'jti' | 'family' | 'generation'> {
  const {
    iat: _iat,
    exp: _exp,
    jti: _jti,
    family: _family,
    generation: _generation,
    ...clean
  } = payload
  return clean
}

/* ---------------------------------------------------------------- */
/* EXPIRY PARSING                                                    */
/* ---------------------------------------------------------------- */

/**
 * Parse a JWT expiry string (e.g., '7d', '15m', '1h') into seconds.
 * Returns a default of 604800 (7 days) if parsing fails.
 */
export function parseExpiryToSeconds(expiry: string): number {
  const match = /^(\d+)([smhdw])$/i.exec(expiry)
  if (!match) {
    return DEFAULT_REFRESH_EXPIRY_SECONDS
  }

  const valuePart = match[1]
  const unitPart = match[2]?.toLowerCase()
  if (valuePart === undefined || unitPart === undefined) {
    return DEFAULT_REFRESH_EXPIRY_SECONDS
  }

  const value = Number.parseInt(valuePart, 10)
  switch (unitPart) {
    case AuthExpiryUnit.SECOND:
      return value
    case AuthExpiryUnit.MINUTE:
      return value * 60
    case AuthExpiryUnit.HOUR:
      return value * 3600
    case AuthExpiryUnit.DAY:
      return value * 86400
    case AuthExpiryUnit.WEEK:
      return value * DEFAULT_REFRESH_EXPIRY_SECONDS
    default:
      return DEFAULT_REFRESH_EXPIRY_SECONDS
  }
}
