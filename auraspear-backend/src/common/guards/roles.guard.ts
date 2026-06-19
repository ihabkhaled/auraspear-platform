import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { BusinessException } from '../exceptions/business.exception'
import {
  type JwtPayload,
  ROLE_HIERARCHY,
  type UserRole,
} from '../interfaces/authenticated-request.interface'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>()
    const { user } = request

    if (!user?.role) {
      throw new BusinessException(
        403,
        'Insufficient permissions',
        'errors.auth.insufficientPermissions'
      )
    }

    const userRoleIndex = ROLE_HIERARCHY.indexOf(user.role)

    if (userRoleIndex === -1) {
      throw new BusinessException(403, 'Unknown role', 'errors.auth.unknownRole')
    }

    const hasPermission = requiredRoles.some(requiredRole => {
      const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole)
      return requiredIndex !== -1 && userRoleIndex <= requiredIndex
    })

    if (!hasPermission) {
      throw new BusinessException(
        403,
        'Insufficient permissions for this action',
        'errors.auth.insufficientPermissions'
      )
    }

    return true
  }
}
