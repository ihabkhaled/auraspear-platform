import { type UserSessionClientType, type UserSessionOsFamily } from '../../common/enums'
import type { UserRole } from '../../common/interfaces/authenticated-request.interface'
import type {
  RefreshTokenFamily,
  RefreshTokenRotation,
  TenantMembership,
  UserSession,
  User,
} from '@prisma/client'

export interface AuthTenantRecord {
  id: string
  name: string
  slug: string
}

export interface MembershipWithTenant {
  tenantId: string
  status?: string
  role: string
  tenant: AuthTenantRecord
}

export interface TenantMembershipInfo {
  id: string
  name: string
  slug: string
  role: UserRole
}

export interface AuthUserIdentity {
  id: string
  email: string
}

export type UserWithMemberships = User & {
  memberships: Array<TenantMembership & { tenant: AuthTenantRecord }>
}

export type RefreshRotationWithFamily = RefreshTokenRotation & {
  family: RefreshTokenFamily
}

export interface IssuedRefreshToken {
  refreshToken: string
  family: string
  generation: number
  jti: string
  expiresAt: Date
}

export interface IssuedAccessToken {
  accessToken: string
  jti: string
  expiresAt: Date
}

export interface IssuedSessionTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthSessionContext {
  ipAddress: string | null
  userAgent: string | null
  osFamily: UserSessionOsFamily
  clientType: UserSessionClientType
}

export interface CreateRefreshTokenFamilyInput {
  id: string
  userId: string
  tenantId: string
  currentGeneration: number
  expiresAt: Date
}

export interface CreateRefreshTokenRotationInput {
  familyId: string
  generation: number
  jtiHash: string
  expiresAt: Date
  parentRotationId?: string
}

export interface RotateRefreshTokenFamilyInput {
  familyId: string
  expectedGeneration: number
  previousRotationId: string
  nextJtiHash: string
  nextExpiresAt: Date
  nextGeneration: number
  rotatedAt: Date
  tenantId: string
  currentAccessJti: string
  currentAccessExpiresAt: Date
  context: AuthSessionContext
}

export interface CreateUserSessionInput {
  familyId: string
  userId: string
  tenantId: string
  lastLoginAt: Date
  currentAccessJti: string
  currentAccessExpiresAt: Date
  context: AuthSessionContext
}

export interface TouchUserSessionInput {
  familyId: string
  tenantId: string
  touchedAt: Date
  currentAccessJti?: string
  currentAccessExpiresAt?: Date
  context: AuthSessionContext
}

export type RefreshTokenFamilyWithSession = RefreshTokenFamily & {
  session: UserSession | null
}

export interface SessionRevocationTarget {
  familyId: string
  currentAccessJti: string | null
  currentAccessExpiresAt: Date | null
}

export interface AuthorizedTenantContext {
  tenantId: string
  tenantSlug: string
  role: UserRole
}

export interface UserWithMembershipSummary {
  id: string
  email: string
  memberships: Array<{
    tenantId: string
    role: string
    tenant: { id: string; name: string; slug: string }
  }>
}
