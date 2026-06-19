import type {
  SortOrder,
  UserRole,
  UserSessionBrowser,
  UserSessionClientType,
  UserSessionOsFamily,
  UserSessionStatus,
  UserStatus,
  UsersControlSessionSortField,
  UsersControlUserSortField,
} from '@/enums'
import type { Column, PaginationMeta } from './common.types'

type UsersControlTranslationValues = Record<string, number | string>

export type UsersControlTranslationFn = (
  key: string,
  values?: UsersControlTranslationValues
) => string

export interface UsersControlSummary {
  totalUsers: number
  onlineUsers: number
  activeSessions: number
}

export interface UsersControlUser {
  id: string
  name: string
  email: string
  createdAt: string
  role: UserRole | null
  status: UserStatus | null
  tenantId: string | null
  tenantName: string | null
  tenantCount: number
  lastLoginAt: string | null
  lastSeenAt: string | null
  isOnline: boolean
  activeSessionCount: number
  totalSessionCount: number
  sessionPlatforms: UserSessionOsFamily[]
  isProtected: boolean
  hasGlobalAdminMembership: boolean
  mfaEnabled: boolean
}

export interface UsersControlSession {
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
  lastSeenAt: string
  lastLoginAt: string
  revokedAt: string | null
  revokeReason: string | null
  isOnline: boolean
}

export interface UsersControlUsersParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: UsersControlUserSortField
  sortOrder?: SortOrder
}

export interface UsersControlSessionsParams {
  page?: number
  limit?: number
  sortBy?: UsersControlSessionSortField
  sortOrder?: SortOrder
  status?: UserSessionStatus
}

export type UsersControlListParams = UsersControlUsersParams
export type UsersControlSessionListParams = UsersControlSessionsParams

export interface UsersControlForceLogoutResult {
  revokedSessions: number
}

export interface UsersControlOverviewCardsProps {
  summary: UsersControlSummary | null
  loading?: boolean
  canForceLogoutAll: boolean
  isForceLogoutAllPending?: boolean
  onForceLogoutAll?: () => void
  scopeLabel: string
  t: UsersControlTranslationFn
}

export interface UsersControlSummaryCardsProps {
  summary: UsersControlSummary | null
  loading: boolean
  canForceLogoutAll: boolean
  isForceLogoutAllPending: boolean
  scopeLabel: string
  onForceLogoutAll: () => void
  t: UsersControlTranslationFn
}

export interface UsersControlUsersTableProps {
  users: UsersControlUser[]
  loading?: boolean
  locale: string
  sortBy: UsersControlUserSortField
  sortOrder: SortOrder
  onSort: (key: string, nextSortOrder: SortOrder) => void
  onUserSelect?: (user: UsersControlUser) => void
  onForceLogoutUser?: (user: UsersControlUser) => void
  canForceLogoutUser: boolean
  canManageTarget?: (user: UsersControlUser) => boolean
  selectedUserId?: string
  t: UsersControlTranslationFn
  tCommon: UsersControlTranslationFn
  tRoleSettings: UsersControlTranslationFn
}

export interface UsersControlTableProps {
  users: UsersControlUser[]
  loading: boolean
  search: string
  onSearchChange: (value: string) => void
  selectedUserId: string
  sortBy: UsersControlUserSortField
  sortOrder: SortOrder
  onSortByChange: (sortBy: UsersControlUserSortField) => void
  onSortOrderChange: (sortOrder: SortOrder) => void
  onViewSessions: (user: UsersControlUser) => void
  onForceLogoutUser: (user: UsersControlUser) => void
  canForceLogoutUser: boolean
  canManageTarget: (user: UsersControlUser) => boolean
  t: UsersControlTranslationFn
}

export interface UsersControlSessionPanelProps {
  user: UsersControlUser | null
  sessions: UsersControlSession[]
  loading?: boolean
  locale: string
  canViewSessions: boolean
  canForceLogoutUser: boolean
  canManageTarget?: boolean
  onForceLogoutUser?: (user: UsersControlUser) => void
  onTerminateSession?: (session: UsersControlSession) => void
  terminatingSessionId?: string
  page: number
  totalPages: number
  total?: number
  onPageChange: (page: number) => void
  t: UsersControlTranslationFn
}

export interface UserSessionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UsersControlUser | null
  sessions: UsersControlSession[]
  loading: boolean
  pagination: PaginationMeta | null
  sortBy: UsersControlSessionSortField
  sortOrder: SortOrder
  onSortByChange: (sortBy: UsersControlSessionSortField) => void
  onSortOrderChange: (sortOrder: SortOrder) => void
  onPageChange: (page: number) => void
  onForceLogoutUser: () => void
  canForceLogoutUser: boolean
  canManageTarget: boolean
  isForceLogoutUserPending: boolean
  t: UsersControlTranslationFn
}

export interface UsersControlColumnTranslations {
  user: string
  scope: string
  role: string
  status: string
  platforms: string
  lastSeen: string
  lastLogin: string
  sessions: string
}

export type UsersControlTableColumn = Column<UsersControlUser>

export interface UsersControlPageDialogsReturn {
  readonly overviewOpen: boolean
  readonly setOverviewOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly usersOpen: boolean
  readonly setUsersOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly sessionsOpen: boolean
  readonly setSessionsOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly selectedUser: UsersControlUser | null
  readonly selectedUserId: string
  readonly selectedUserStateId: string
  readonly setSelectedUserStateId: React.Dispatch<React.SetStateAction<string>>
  readonly sessionsSectionRef: React.RefObject<HTMLDivElement | null>
}
