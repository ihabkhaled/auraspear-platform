import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { buildAuthSessionContext } from '../../modules/auth/auth-session.utilities'
import { AuthService } from '../../modules/auth/auth.service'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { BusinessException } from '../exceptions/business.exception'
import type {
  JwtPayload,
  AuthenticatedRequest,
} from '../interfaces/authenticated-request.interface'

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)

  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = this.extractTokenFromRequest(request)

    if (!token) {
      throw new BusinessException(
        401,
        'Missing or invalid Authorization header',
        'errors.auth.missingToken'
      )
    }

    try {
      const decoded = await this.authService.verifyAccessToken(token)

      await this.authService.validateUserActive(decoded.sub)
      request.user = await this.buildCurrentUserContext(
        decoded,
        this.getSingleHeaderValue(request.headers['x-tenant-id'])
      )
      await this.authService.touchSessionActivity(
        decoded,
        request.user.tenantId,
        buildAuthSessionContext(request)
      )

      return true
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.logger.warn(`JWT verification failed: ${(error as Error).message}`)
      throw new BusinessException(401, 'Invalid or expired token', 'errors.auth.expiredToken')
    }
  }

  private async buildCurrentUserContext(
    decoded: JwtPayload,
    headerTenantId?: string
  ): Promise<JwtPayload> {
    const authorizedContext = await this.authService.resolveAuthorizedTenantContext(
      decoded,
      headerTenantId
    )

    return {
      ...decoded,
      tenantId: authorizedContext.tenantId,
      tenantSlug: authorizedContext.tenantSlug,
      role: authorizedContext.role,
    }
  }

  /**
   * Extracts the access token from the request.
   * Prefers the Authorization header (backward compatibility), falls back to cookie.
   */
  private extractTokenFromRequest(request: AuthenticatedRequest): string | null {
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7)
    }

    // Fallback to HttpOnly cookie
    const cookieToken = request.cookies?.['access_token'] as string | undefined
    if (typeof cookieToken === 'string' && cookieToken.length > 0) {
      return cookieToken
    }

    return null
  }

  private getSingleHeaderValue(value: string | string[] | undefined): string | undefined {
    if (typeof value === 'string') {
      return value
    }

    return value?.[0]
  }
}
