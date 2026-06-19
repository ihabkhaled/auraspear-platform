import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { BusinessException } from '../exceptions/business.exception'
import type { JwtPayload } from '../interfaces/authenticated-request.interface'

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>()
    const { user } = request

    if (!user?.tenantId) {
      throw new BusinessException(403, 'Tenant context required', 'errors.auth.tenantRequired')
    }

    return true
  }
}
