import { TENANT_SORT_FIELDS, USER_SORT_FIELDS } from './tenants.constants'
import { SortOrder } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { MembershipStatus, UserRole } from '../../common/interfaces/authenticated-request.interface'
import { buildOrderBy, toSortOrder } from '../../common/utils/query.utility'
import type {
  UserRecord,
  TenantWithCounts,
  TenantWithDatabaseCounts,
  MembershipWithUser,
} from './tenants.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { Prisma, UserStatus } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* TENANT QUERY BUILDING                                             */
/* ---------------------------------------------------------------- */

export function buildTenantSearchWhere(search?: string): Prisma.TenantWhereInput {
  if (!search || search.length === 0) return {}
  return {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ],
  }
}

export function buildTenantOrderBy(
  sortBy: string,
  sortOrder: string
): Prisma.TenantOrderByWithRelationInput {
  const order = toSortOrder(sortOrder)
  switch (sortBy) {
    case 'userCount':
      return { memberships: { _count: order } }
    case 'alertCount':
      return { alerts: { _count: order } }
    case 'caseCount':
      return { cases: { _count: order } }
    default:
      return buildOrderBy(TENANT_SORT_FIELDS, 'name', sortBy, sortOrder)
  }
}

/* ---------------------------------------------------------------- */
/* USER QUERY BUILDING                                               */
/* ---------------------------------------------------------------- */

export function buildUserSearchWhere(
  tenantId: string,
  search?: string,
  role?: string,
  status?: string
): Prisma.TenantMembershipWhereInput {
  const where: Prisma.TenantMembershipWhereInput = { tenantId }
  if (role) {
    where.role = role as UserRole
  }
  if (status) {
    where.status = status as UserStatus
  }
  if (search && search.length > 0) {
    where.user = {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    }
  }
  return where
}

export function buildUserOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.TenantMembershipOrderByWithRelationInput {
  const order = toSortOrder(sortOrder)
  switch (sortBy) {
    case 'name':
      return { user: { name: order } }
    case 'email':
      return { user: { email: order } }
    case 'lastLoginAt':
      return { user: { lastLoginAt: order } }
    default: {
      if (sortBy && USER_SORT_FIELDS[sortBy]) {
        return buildOrderBy(USER_SORT_FIELDS, 'createdAt', sortBy, sortOrder)
      }
      return { user: { name: SortOrder.ASC } }
    }
  }
}

/* ---------------------------------------------------------------- */
/* RECORD MAPPING                                                    */
/* ---------------------------------------------------------------- */

export function mapTenantToCounts(t: TenantWithDatabaseCounts): TenantWithCounts {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    createdAt: t.createdAt,
    userCount: t._count.memberships,
    alertCount: t._count.alerts,
    caseCount: t._count.cases,
  }
}

export function mapMembershipToUserRecord(m: MembershipWithUser): UserRecord {
  return {
    id: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    status: m.status,
    lastLoginAt: m.user.lastLoginAt,
    mfaEnabled: m.user.mfaEnabled,
    isProtected: m.user.isProtected,
    createdAt: m.createdAt,
  }
}

export function mapFindOrCreateResultToUserRecord(result: {
  user: MembershipWithUser['user']
  membership: { role: string; status: string; createdAt: Date }
}): UserRecord {
  return {
    id: result.user.id,
    email: result.user.email,
    name: result.user.name,
    role: result.membership.role,
    status: result.membership.status,
    lastLoginAt: result.user.lastLoginAt,
    mfaEnabled: result.user.mfaEnabled,
    isProtected: result.user.isProtected,
    createdAt: result.membership.createdAt,
  }
}

/* ---------------------------------------------------------------- */
/* PAGINATION                                                        */
/* ---------------------------------------------------------------- */

export function buildPagination(
  page: number,
  limit: number,
  total: number
): { page: number; limit: number; total: number; totalPages: number } {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
}

/* ---------------------------------------------------------------- */
/* VALIDATION HELPERS                                                */
/* ---------------------------------------------------------------- */

export function isUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return message.includes('Unique constraint')
}

export function canCallerModifyGlobalAdmin(callerRole: UserRole): boolean {
  return callerRole === UserRole.GLOBAL_ADMIN
}

export function isProtectedUser(user: { isProtected: boolean }): boolean {
  return user.isProtected
}

export function isSelfAction(callerId: string, targetId: string): boolean {
  return callerId === targetId
}

export function isAlreadySuspended(status: string): boolean {
  return status === MembershipStatus.SUSPENDED
}

export function isInactive(status: string): boolean {
  return status === MembershipStatus.INACTIVE
}

export function isNotSuspended(status: string): boolean {
  return status !== MembershipStatus.SUSPENDED
}

export function isNotInactive(status: string): boolean {
  return status !== MembershipStatus.INACTIVE
}

/**
 * Validates that a TENANT_ADMIN is only operating on their own tenant.
 * GLOBAL_ADMIN can operate on any tenant.
 */
export function assertTenantAccess(user: JwtPayload, parameterTenantId: string): void {
  if (user.role !== UserRole.GLOBAL_ADMIN && parameterTenantId !== user.tenantId) {
    throw new BusinessException(
      403,
      'Cannot operate on another tenant',
      'errors.tenants.crossTenantAccessDenied'
    )
  }
}

export function needsNewUserFields(
  dto: { name?: string; password?: string },
  userExists: boolean
): { missingName: boolean; missingPassword: boolean } {
  if (userExists) return { missingName: false, missingPassword: false }
  return {
    missingName: !dto.name || dto.name.trim().length === 0,
    missingPassword: !dto.password,
  }
}
