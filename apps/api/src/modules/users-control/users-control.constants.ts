import { Permission, UserSessionBrowser } from '../../common/enums'
import { UserRole } from '../../common/interfaces/authenticated-request.interface'

export const USERS_CONTROL_MODULE = 'usersControl'
export const USERS_CONTROL_DEFAULT_PAGE = 1
export const USERS_CONTROL_DEFAULT_LIMIT = 20
export const USERS_CONTROL_MAX_LIMIT = 100
export const USERS_CONTROL_MUTATION_THROTTLE = { default: { limit: 10, ttl: 60000 } }
export const USERS_CONTROL_STANDARD_THROTTLE = { default: { limit: 30, ttl: 60000 } }
export const USERS_CONTROL_TENANT_SELECT = {
  select: {
    id: true,
    name: true,
    slug: true,
  },
} as const
export const USERS_CONTROL_PROTECTED_PERMISSIONS = new Set<string>([
  Permission.USERS_CONTROL_VIEW,
  Permission.USERS_CONTROL_VIEW_SESSIONS,
  Permission.USERS_CONTROL_FORCE_LOGOUT,
  Permission.USERS_CONTROL_FORCE_LOGOUT_ALL,
])
export const USERS_CONTROL_PERMISSION_KEYS = [...USERS_CONTROL_PROTECTED_PERMISSIONS]
export const USERS_CONTROL_ASSIGNABLE_ROLES = [
  UserRole.GLOBAL_ADMIN,
  UserRole.TENANT_ADMIN,
] as const

export const USERS_CONTROL_USER_SORT_FIELDS: Record<string, string> = {
  email: 'email',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  name: 'name',
}

export const USERS_CONTROL_SESSION_SORT_FIELDS: Record<string, string> = {
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  lastSeenAt: 'lastSeenAt',
}

export const BROWSER_PATTERNS: ReadonlyArray<readonly [RegExp, UserSessionBrowser]> = [
  [/SamsungBrowser/i, UserSessionBrowser.SAMSUNG_INTERNET],
  [/Edg/i, UserSessionBrowser.EDGE],
  [/OPR|Opera/i, UserSessionBrowser.OPERA],
  [/Firefox/i, UserSessionBrowser.FIREFOX],
  [/Chrome|CriOS/i, UserSessionBrowser.CHROME],
  [/Safari/i, UserSessionBrowser.SAFARI],
]
