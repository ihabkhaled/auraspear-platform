import { randomBytes } from 'node:crypto'
import { ACCESS_COOKIE_MAX_AGE_MS, REFRESH_COOKIE_MAX_AGE_MS } from './auth.constants'
import { AuthCookieName, AuthCookiePath, AuthCookieSameSite } from './auth.enums'
import { NodeEnvironment } from '../../common/enums'
import type { CookieOptions, Response } from 'express'

function isProduction(): boolean {
  return process.env['NODE_ENV'] === NodeEnvironment.PRODUCTION
}

function buildBaseCookieOptions(): Pick<CookieOptions, 'secure'> {
  return {
    secure: isProduction(),
  }
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string
): void {
  const baseOptions = buildBaseCookieOptions()

  response.cookie(AuthCookieName.ACCESS, accessToken, {
    ...baseOptions,
    httpOnly: true,
    sameSite: AuthCookieSameSite.LAX,
    path: AuthCookiePath.ROOT,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
  })

  response.cookie(AuthCookieName.REFRESH, refreshToken, {
    ...baseOptions,
    httpOnly: true,
    sameSite: AuthCookieSameSite.STRICT,
    path: AuthCookiePath.ROOT,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  })
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(AuthCookieName.ACCESS, { path: AuthCookiePath.ROOT })
  response.clearCookie(AuthCookieName.REFRESH, { path: AuthCookiePath.ROOT })
  response.clearCookie(AuthCookieName.CSRF, { path: AuthCookiePath.ROOT })
}

export function issueCsrfToken(response: Response): string {
  const csrfToken = randomBytes(32).toString('hex')
  const baseOptions = buildBaseCookieOptions()

  response.cookie(AuthCookieName.CSRF, csrfToken, {
    ...baseOptions,
    httpOnly: false,
    sameSite: AuthCookieSameSite.STRICT,
    path: AuthCookiePath.ROOT,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
  })

  return csrfToken
}
