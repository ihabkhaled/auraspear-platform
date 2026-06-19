import { timingSafeEqual } from 'node:crypto'
import { type CanActivate, type ExecutionContext, Injectable, Logger } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { STATE_CHANGING_METHODS } from './csrf.constants'
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator'
import { BusinessException } from '../exceptions/business.exception'
import type { Request } from 'express'

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name)

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()

    if (!STATE_CHANGING_METHODS.has(request.method)) {
      return true
    }

    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skipCsrf) {
      return true
    }

    if (!this.usesCookieBackedAuth(request)) {
      return true
    }

    const cookieToken = request.cookies?.['csrf_token'] as string | undefined
    const headerToken = request.headers['x-csrf-token'] as string | undefined

    if (!cookieToken || !headerToken) {
      this.logger.warn('CSRF token missing - cookie or header absent')
      throw new BusinessException(403, 'CSRF token missing', 'errors.auth.csrfTokenMismatch')
    }

    if (!this.constantTimeCompare(cookieToken, headerToken)) {
      this.logger.warn('CSRF token mismatch detected')
      throw new BusinessException(403, 'CSRF token mismatch', 'errors.auth.csrfTokenMismatch')
    }

    return true
  }

  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    const bufA = Buffer.from(a, 'utf8')
    const bufB = Buffer.from(b, 'utf8')

    return timingSafeEqual(bufA, bufB)
  }

  private usesCookieBackedAuth(request: Request): boolean {
    const accessCookie = request.cookies?.['access_token']
    const refreshCookie = request.cookies?.['refresh_token']
    const csrfCookie = request.cookies?.['csrf_token']

    return [accessCookie, refreshCookie, csrfCookie].some(
      value => typeof value === 'string' && value.length > 0
    )
  }
}
