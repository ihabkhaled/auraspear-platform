export const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000
export const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const AUTH_BCRYPT_SALT_ROUNDS = 12
export const DUMMY_BCRYPT_HASH = '$2b$12$mffuEnbgz2XglaCwSv1EFOwnXT8DaW5/CIE60E5/07DiN4b6Ncvxi'
export const DEFAULT_REFRESH_EXPIRY_SECONDS = 604800
export const JWT_CLOCK_TOLERANCE_SECONDS = 30
export const PLATFORM_ADMIN_EMAIL = 'platform-admin@auraspear.io'
export const PLATFORM_ADMIN_NAME = 'Platform Administrator'
export const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:'
export const REFRESH_FAMILY_PREFIX = 'rf:'
export const REFRESH_FAMILY_REVOKED_PREFIX = 'rf:revoked:'

export const TENANT_SELECT = {
  select: { id: true, name: true, slug: true },
} as const
