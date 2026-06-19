import {
  AUTH_SESSION_IP_ADDRESS_MAX_LENGTH,
  AUTH_SESSION_ONLINE_WINDOW_MS,
  AUTH_SESSION_USER_AGENT_MAX_LENGTH,
} from './auth-session.constants'
import { UserSessionClientType, UserSessionOsFamily, UserSessionStatus } from '../../common/enums'
import { nowMs } from '../../common/utils/date-time.utility'
import type { AuthSessionContext } from './auth.types'
import type { Request } from 'express'

function normalizeUserAgent(userAgent: string | undefined): string | null {
  if (!userAgent || userAgent.trim().length === 0) {
    return null
  }

  return userAgent.trim().slice(0, AUTH_SESSION_USER_AGENT_MAX_LENGTH)
}

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  return value?.[0]
}

export function createDefaultAuthSessionContext(): AuthSessionContext {
  return {
    ipAddress: null,
    userAgent: null,
    osFamily: UserSessionOsFamily.UNKNOWN,
    clientType: UserSessionClientType.UNKNOWN,
  }
}

export function detectUserSessionOsFamily(userAgent: string | null): UserSessionOsFamily {
  if (!userAgent) {
    return UserSessionOsFamily.UNKNOWN
  }

  if (/iPad|CPU OS|iPadOS/i.test(userAgent)) {
    return UserSessionOsFamily.IPADOS
  }

  if (/iPhone|iOS/i.test(userAgent)) {
    return UserSessionOsFamily.IOS
  }

  if (/Android/i.test(userAgent)) {
    return UserSessionOsFamily.ANDROID
  }

  if (/Windows/i.test(userAgent)) {
    return UserSessionOsFamily.WINDOWS
  }

  if (/Macintosh|Mac OS X/i.test(userAgent)) {
    return UserSessionOsFamily.MACOS
  }

  if (/Linux/i.test(userAgent)) {
    return UserSessionOsFamily.LINUX
  }

  return UserSessionOsFamily.UNKNOWN
}

export function detectUserSessionClientType(userAgent: string | null): UserSessionClientType {
  if (!userAgent) {
    return UserSessionClientType.UNKNOWN
  }

  if (/iPad|Tablet/i.test(userAgent)) {
    return UserSessionClientType.TABLET
  }

  if (/Android|iPhone|Mobile/i.test(userAgent)) {
    return UserSessionClientType.MOBILE
  }

  if (/Mozilla|Chrome|Safari|Firefox|Edg/i.test(userAgent)) {
    return UserSessionClientType.DESKTOP
  }

  return UserSessionClientType.WEB
}

export function extractRequestIpAddress(request: Request): string | null {
  const forwardedHeader = getHeaderValue(request.headers['x-forwarded-for'])
  const candidate = forwardedHeader?.split(',')[0]?.trim() ?? request.ip ?? null

  if (!candidate || candidate.length === 0) {
    return null
  }

  return candidate.slice(0, AUTH_SESSION_IP_ADDRESS_MAX_LENGTH)
}

export function buildAuthSessionContext(request: Request): AuthSessionContext {
  const userAgent = normalizeUserAgent(getHeaderValue(request.headers['user-agent']))

  return {
    ...createDefaultAuthSessionContext(),
    ipAddress: extractRequestIpAddress(request),
    userAgent,
    osFamily: detectUserSessionOsFamily(userAgent),
    clientType: detectUserSessionClientType(userAgent),
  }
}

export function isUserSessionOnline(
  lastSeenAt: Date,
  status: UserSessionStatus,
  now = nowMs()
): boolean {
  if (status !== UserSessionStatus.ACTIVE) {
    return false
  }

  return now - lastSeenAt.getTime() <= AUTH_SESSION_ONLINE_WINDOW_MS
}
