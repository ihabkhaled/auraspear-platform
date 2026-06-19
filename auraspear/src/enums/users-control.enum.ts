export enum UsersControlUserSortField {
  NAME = 'name',
  EMAIL = 'email',
  TENANT_NAME = 'tenantName',
  ROLE = 'role',
  STATUS = 'status',
  SESSION_PLATFORMS = 'sessionPlatforms',
  LAST_SEEN_AT = 'lastSeenAt',
  LAST_LOGIN_AT = 'lastLoginAt',
  ACTIVE_SESSION_COUNT = 'activeSessionCount',
  CREATED_AT = 'createdAt',
}

export enum UsersControlSessionSortField {
  LAST_SEEN_AT = 'lastSeenAt',
  LAST_LOGIN_AT = 'lastLoginAt',
  CREATED_AT = 'createdAt',
}

export enum UserSessionOsFamily {
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  IOS = 'ios',
  ANDROID = 'android',
  IPADOS = 'ipados',
  UNKNOWN = 'unknown',
}

export enum UserSessionClientType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  WEB = 'web',
  UNKNOWN = 'unknown',
}

export enum UserSessionBrowser {
  CHROME = 'chrome',
  EDGE = 'edge',
  FIREFOX = 'firefox',
  SAFARI = 'safari',
  OPERA = 'opera',
  SAMSUNG_INTERNET = 'samsung_internet',
  UNKNOWN = 'unknown',
}

export enum UserSessionStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}
