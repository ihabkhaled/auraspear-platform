import { Prisma } from '@prisma/client'
import {
  BROWSER_PATTERNS,
  USERS_CONTROL_SESSION_SORT_FIELDS,
  USERS_CONTROL_USER_SORT_FIELDS,
} from './users-control.constants'
import { type UsersControlSessionSortField, UsersControlUserSortField } from './users-control.enums'
import { type SortOrder, UserSessionBrowser, UserSessionStatus } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { UserRole } from '../../common/interfaces/authenticated-request.interface'
import { toDay } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import { isUserSessionOnline } from '../auth/auth-session.utilities'
import type {
  UsersControlPagination,
  UsersControlSessionItem,
  UsersControlSessionRecord,
  UsersControlSummary,
  UsersControlUserListItem,
  UsersControlUserRecord,
} from './users-control.types'

function detectBrowser(userAgent: string | null): UserSessionBrowser {
  if (!userAgent) {
    return UserSessionBrowser.UNKNOWN
  }

  for (const [pattern, browser] of BROWSER_PATTERNS) {
    if (pattern.test(userAgent)) {
      return browser
    }
  }

  return UserSessionBrowser.UNKNOWN
}

function getScopedMembership(
  memberships: UsersControlUserRecord['memberships'],
  tenantId?: string
): UsersControlUserRecord['memberships'][number] | null {
  if (tenantId) {
    const membership = memberships.find(item => item.tenantId === tenantId)
    return membership ?? null
  }

  return memberships[0] ?? null
}

function buildSessionPlatforms(
  sessions: UsersControlUserRecord['sessions']
): UsersControlUserListItem['sessionPlatforms'] {
  const platforms = new Set<UsersControlUserListItem['sessionPlatforms'][number]>()

  for (const session of sessions) {
    platforms.add(session.osFamily as UsersControlUserListItem['sessionPlatforms'][number])
  }

  return [...platforms]
}

export function assertUsersControlRole(role: UserRole): void {
  if (role === UserRole.GLOBAL_ADMIN || role === UserRole.TENANT_ADMIN) {
    return
  }

  throw new BusinessException(
    403,
    'Only global admins and tenant admins can access users control',
    'errors.auth.insufficientPermissions'
  )
}

export function buildUsersControlUserWhere(
  search: string | undefined,
  tenantId?: string
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    memberships: {
      some: tenantId ? { tenantId } : {},
    },
  }

  if (search && search.trim().length > 0) {
    where.OR = [
      {
        name: {
          contains: search.trim(),
          mode: Prisma.QueryMode.insensitive,
        },
      },
      {
        email: {
          contains: search.trim(),
          mode: Prisma.QueryMode.insensitive,
        },
      },
    ]
  }

  return where
}

export function buildUsersControlUserOrderBy(
  sortBy: UsersControlUserSortField,
  sortOrder: SortOrder
): Prisma.UserOrderByWithRelationInput {
  return buildOrderBy(USERS_CONTROL_USER_SORT_FIELDS, 'name', sortBy, sortOrder)
}

function compareNullableStrings(
  left: string | null,
  right: string | null,
  sortOrder: SortOrder
): number {
  const leftValue = left ?? ''
  const rightValue = right ?? ''
  const comparison = leftValue.localeCompare(rightValue)

  return sortOrder === 'asc' ? comparison : comparison * -1
}

function compareNullableDates(left: Date | null, right: Date | null, sortOrder: SortOrder): number {
  const leftValue = left ? toDay(left).valueOf() : 0
  const rightValue = right ? toDay(right).valueOf() : 0
  const comparison = leftValue - rightValue

  return sortOrder === 'asc' ? comparison : comparison * -1
}

function compareNumbers(left: number, right: number, sortOrder: SortOrder): number {
  const comparison = left - right

  return sortOrder === 'asc' ? comparison : comparison * -1
}

function comparePlatformLists(
  left: UsersControlUserListItem['sessionPlatforms'],
  right: UsersControlUserListItem['sessionPlatforms'],
  sortOrder: SortOrder
): number {
  const leftValue = [...left].sort().join(',')
  const rightValue = [...right].sort().join(',')
  const comparison = leftValue.localeCompare(rightValue)

  return sortOrder === 'asc' ? comparison : comparison * -1
}

export function buildUsersControlSessionOrderBy(
  sortBy: UsersControlSessionSortField,
  sortOrder: SortOrder
): Prisma.UserSessionOrderByWithRelationInput {
  return buildOrderBy(USERS_CONTROL_SESSION_SORT_FIELDS, 'lastSeenAt', sortBy, sortOrder)
}

export function buildPagination(
  page: number,
  limit: number,
  total: number
): UsersControlPagination {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  }
}

export function mapUsersControlSummary(
  totalUsers: number,
  onlineUsers: number,
  activeSessions: number
): UsersControlSummary {
  return {
    totalUsers,
    onlineUsers,
    activeSessions,
  }
}

function getLatestSessionDate(sessions: UsersControlUserRecord['sessions']): Date | null {
  const sorted = [...sessions].sort(
    (left, right) => toDay(right.lastSeenAt).valueOf() - toDay(left.lastSeenAt).valueOf()
  )
  return sorted[0]?.lastSeenAt ?? null
}

function getActiveSessions(
  sessions: UsersControlUserRecord['sessions']
): UsersControlUserRecord['sessions'] {
  return sessions.filter(session => session.status === UserSessionStatus.ACTIVE)
}

function countOnlineSessions(activeSessions: UsersControlUserRecord['sessions']): number {
  return activeSessions.filter(session =>
    isUserSessionOnline(session.lastSeenAt, session.status as UserSessionStatus)
  ).length
}

function hasGlobalAdminMembership(memberships: UsersControlUserRecord['memberships']): boolean {
  return memberships.some(membership => membership.role === UserRole.GLOBAL_ADMIN)
}

export function mapUsersControlUser(
  user: UsersControlUserRecord,
  tenantId?: string
): UsersControlUserListItem {
  const scopedMembership = getScopedMembership(user.memberships, tenantId)
  const activeSessions = getActiveSessions(user.sessions)

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    role: scopedMembership?.role ?? null,
    status: scopedMembership?.status ?? null,
    tenantId: scopedMembership?.tenant.id ?? null,
    tenantName: scopedMembership?.tenant.name ?? null,
    tenantCount: user.memberships.length,
    lastLoginAt: user.lastLoginAt,
    lastSeenAt: getLatestSessionDate(user.sessions),
    isOnline: countOnlineSessions(activeSessions) > 0,
    activeSessionCount: activeSessions.length,
    totalSessionCount: user.sessions.length,
    sessionPlatforms: buildSessionPlatforms(user.sessions),
    isProtected: user.isProtected,
    hasGlobalAdminMembership: hasGlobalAdminMembership(user.memberships),
    mfaEnabled: user.mfaEnabled,
  }
}

function toNullableDate(value: Date | string | null): Date | null {
  if (!value) return null
  return value instanceof Date ? value : toDay(value).toDate()
}

function getUserSortComparator(
  sortBy: UsersControlUserSortField,
  sortOrder: SortOrder
): (left: UsersControlUserListItem, right: UsersControlUserListItem) => number {
  switch (sortBy) {
    case UsersControlUserSortField.EMAIL:
      return (left, right): number => compareNullableStrings(left.email, right.email, sortOrder)
    case UsersControlUserSortField.TENANT_NAME:
      return (left, right): number =>
        compareNullableStrings(left.tenantName, right.tenantName, sortOrder)
    case UsersControlUserSortField.ROLE:
      return (left, right): number => compareNullableStrings(left.role, right.role, sortOrder)
    case UsersControlUserSortField.STATUS:
      return (left, right): number => compareNullableStrings(left.status, right.status, sortOrder)
    case UsersControlUserSortField.SESSION_PLATFORMS:
      return (left, right): number =>
        comparePlatformLists(left.sessionPlatforms, right.sessionPlatforms, sortOrder)
    case UsersControlUserSortField.LAST_SEEN_AT:
      return (left, right): number =>
        compareNullableDates(
          toNullableDate(left.lastSeenAt),
          toNullableDate(right.lastSeenAt),
          sortOrder
        )
    case UsersControlUserSortField.LAST_LOGIN_AT:
      return (left, right): number =>
        compareNullableDates(
          toNullableDate(left.lastLoginAt),
          toNullableDate(right.lastLoginAt),
          sortOrder
        )
    case UsersControlUserSortField.ACTIVE_SESSION_COUNT:
      return (left, right): number =>
        compareNumbers(left.activeSessionCount, right.activeSessionCount, sortOrder)
    case UsersControlUserSortField.CREATED_AT:
      return (left, right): number =>
        compareNullableDates(
          toNullableDate(left.createdAt),
          toNullableDate(right.createdAt),
          sortOrder
        )
    case UsersControlUserSortField.NAME:
    default:
      return (left, right): number => compareNullableStrings(left.name, right.name, sortOrder)
  }
}

export function sortUsersControlUsers(
  users: UsersControlUserListItem[],
  sortBy: UsersControlUserSortField,
  sortOrder: SortOrder
): UsersControlUserListItem[] {
  const sortedUsers = [...users]
  const comparator = getUserSortComparator(sortBy, sortOrder)
  sortedUsers.sort(comparator)

  return sortedUsers
}

export function paginateUsersControlUsers(
  users: UsersControlUserListItem[],
  page: number,
  limit: number
): UsersControlUserListItem[] {
  const start = (page - 1) * limit

  return users.slice(start, start + limit)
}

export function mapUsersControlSession(
  session: UsersControlSessionRecord
): UsersControlSessionItem {
  return {
    id: session.id,
    familyId: session.familyId,
    tenantId: session.tenantId,
    tenantName: session.tenant.name,
    tenantSlug: session.tenant.slug,
    status: session.status as UsersControlSessionItem['status'],
    osFamily: session.osFamily as UsersControlSessionItem['osFamily'],
    clientType: session.clientType as UsersControlSessionItem['clientType'],
    browser: detectBrowser(session.userAgent),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastSeenAt: session.lastSeenAt,
    lastLoginAt: session.lastLoginAt,
    revokedAt: session.revokedAt,
    revokeReason: session.revokeReason,
    isOnline: isUserSessionOnline(session.lastSeenAt, session.status as UserSessionStatus),
  }
}
