import {
  type UserSessionClientType,
  type UserSessionBrowser,
  type UserSessionOsFamily,
  type UserSessionStatus,
  type SortOrder,
} from '../../common/enums'
import type { UsersControlSessionSortField, UsersControlUserSortField } from './users-control.enums'
import type { Prisma } from '@prisma/client'

export interface UsersControlPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface UsersControlSummary {
  totalUsers: number
  onlineUsers: number
  activeSessions: number
}

export interface UsersControlUserListItem {
  id: string
  name: string
  email: string
  createdAt: Date
  role: string | null
  status: string | null
  tenantId: string | null
  tenantName: string | null
  tenantCount: number
  lastLoginAt: Date | null
  lastSeenAt: Date | null
  isOnline: boolean
  activeSessionCount: number
  totalSessionCount: number
  sessionPlatforms: UserSessionOsFamily[]
  isProtected: boolean
  hasGlobalAdminMembership: boolean
  mfaEnabled: boolean
}

export interface UsersControlSessionItem {
  id: string
  familyId: string
  tenantId: string
  tenantName: string
  tenantSlug: string
  status: UserSessionStatus
  osFamily: UserSessionOsFamily
  clientType: UserSessionClientType
  browser: UserSessionBrowser
  ipAddress: string | null
  userAgent: string | null
  lastSeenAt: Date
  lastLoginAt: Date
  revokedAt: Date | null
  revokeReason: string | null
  isOnline: boolean
}

export type UsersControlUserRecord = Prisma.UserGetPayload<{
  include: {
    memberships: {
      include: {
        tenant: {
          select: {
            id: true
            name: true
            slug: true
          }
        }
      }
    }
    sessions: {
      include: {
        tenant: {
          select: {
            id: true
            name: true
            slug: true
          }
        }
      }
    }
  }
}>

export type UsersControlSessionRecord = Prisma.UserSessionGetPayload<{
  include: {
    tenant: {
      select: {
        id: true
        name: true
        slug: true
      }
    }
  }
}>

export interface UsersControlUserListParameters {
  tenantId?: string
  page: number
  limit: number
  search?: string
  sortBy: UsersControlUserSortField
  sortOrder: SortOrder
}

export interface UsersControlSessionListParameters {
  userId: string
  tenantId?: string
  page: number
  limit: number
  sortBy: UsersControlSessionSortField
  sortOrder: SortOrder
  status?: UserSessionStatus
}
