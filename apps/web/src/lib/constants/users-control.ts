import {
  Permission,
  SortOrder,
  UserRole,
  UserSessionBrowser,
  UserSessionClientType,
  UserSessionOsFamily,
  UserSessionStatus,
  UserStatus,
  UsersControlUserSortField,
} from '@/enums'

export const USERS_CONTROL_ROUTE = '/admin/users-control'
export const USERS_CONTROL_DEFAULT_LIMIT = 20
export const USERS_CONTROL_SESSION_LIMIT = 6
export const USERS_CONTROL_DEFAULT_SORT_FIELD = UsersControlUserSortField.LAST_LOGIN_AT
export const USERS_CONTROL_DEFAULT_SORT_ORDER = SortOrder.DESC
export const USERS_CONTROL_SORT_FIELDS = new Set<string>(Object.values(UsersControlUserSortField))
export const USERS_CONTROL_PERMISSION_KEYS = new Set<string>([
  Permission.USERS_CONTROL_VIEW,
  Permission.USERS_CONTROL_VIEW_SESSIONS,
  Permission.USERS_CONTROL_FORCE_LOGOUT,
  Permission.USERS_CONTROL_FORCE_LOGOUT_ALL,
])
export const USERS_CONTROL_ADMIN_ROLES: readonly UserRole[] = [
  UserRole.GLOBAL_ADMIN,
  UserRole.TENANT_ADMIN,
]

export const USERS_CONTROL_OS_LABEL_KEYS: Readonly<Record<UserSessionOsFamily, string>> = {
  [UserSessionOsFamily.WINDOWS]: 'osFamily.windows',
  [UserSessionOsFamily.MACOS]: 'osFamily.macos',
  [UserSessionOsFamily.LINUX]: 'osFamily.linux',
  [UserSessionOsFamily.IOS]: 'osFamily.ios',
  [UserSessionOsFamily.ANDROID]: 'osFamily.android',
  [UserSessionOsFamily.IPADOS]: 'osFamily.ipados',
  [UserSessionOsFamily.UNKNOWN]: 'osFamily.unknown',
}

export const USERS_CONTROL_CLIENT_TYPE_LABEL_KEYS: Readonly<Record<UserSessionClientType, string>> =
  {
    [UserSessionClientType.DESKTOP]: 'clientType.desktop',
    [UserSessionClientType.MOBILE]: 'clientType.mobile',
    [UserSessionClientType.TABLET]: 'clientType.tablet',
    [UserSessionClientType.WEB]: 'clientType.web',
    [UserSessionClientType.UNKNOWN]: 'clientType.unknown',
  }

export const USERS_CONTROL_SESSION_STATUS_LABEL_KEYS: Readonly<Record<UserSessionStatus, string>> =
  {
    [UserSessionStatus.ACTIVE]: 'sessionStatus.active',
    [UserSessionStatus.REVOKED]: 'sessionStatus.revoked',
    [UserSessionStatus.EXPIRED]: 'sessionStatus.expired',
  }

export const USERS_CONTROL_BROWSER_LABEL_KEYS: Readonly<Record<UserSessionBrowser, string>> = {
  [UserSessionBrowser.CHROME]: 'browser.chrome',
  [UserSessionBrowser.EDGE]: 'browser.edge',
  [UserSessionBrowser.FIREFOX]: 'browser.firefox',
  [UserSessionBrowser.SAFARI]: 'browser.safari',
  [UserSessionBrowser.OPERA]: 'browser.opera',
  [UserSessionBrowser.SAMSUNG_INTERNET]: 'browser.samsungInternet',
  [UserSessionBrowser.UNKNOWN]: 'browser.unknown',
}

export const MEMBERSHIP_STATUS_LABEL_KEYS: Readonly<Record<UserStatus, string>> = {
  [UserStatus.ACTIVE]: 'membershipStatus.active',
  [UserStatus.SUSPENDED]: 'membershipStatus.suspended',
  [UserStatus.INACTIVE]: 'membershipStatus.inactive',
}

export const MEMBERSHIP_STATUS_DEFAULT_LABEL_KEY = 'membershipStatus.unknown'

export const PRESENCE_LABEL_KEYS: Readonly<Record<string, string>> = {
  online: 'online',
  offline: 'offline',
}

export const USERS_CONTROL_QUERY_KEY = ['admin', 'users-control'] as const
