/**
 * Keys that must be redacted from log metadata and audit payloads.
 * Shared between AuditInterceptor and AppLoggerService.
 */
export const SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'passwordHash',
  'secret',
  'apiKey',
  'token',
  'bearerToken',
  'accessKey',
  'clientSecret',
  'refreshToken',
  'accessToken',
  'encryptedConfig',
  'authorization',
  'secretAccessKey',
  'cookie',
  'sessionToken',
  'encryptionKey',
])

export const MAX_REDACT_DEPTH = 5
