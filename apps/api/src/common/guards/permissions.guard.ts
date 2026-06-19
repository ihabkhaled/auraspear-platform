import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RoleSettingsService } from '../../modules/role-settings/role-settings.service'
import { PrismaService } from '../../prisma/prisma.service'
import { ALLOW_CASE_OWNER_KEY } from '../decorators/allow-case-owner.decorator'
import { PERMISSIONS_KEY } from '../decorators/permission.decorator'
import { BusinessException } from '../exceptions/business.exception'
import { UserRole } from '../interfaces/authenticated-request.interface'
import type { Permission } from '../enums/permission.enum'
import type { JwtPayload } from '../interfaces/authenticated-request.interface'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleSettingsService: RoleSettingsService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    )

    // No @RequirePermission decorator — allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: JwtPayload; params?: Record<string, string> }>()
    const { user } = request

    if (!user?.role) {
      throw new BusinessException(
        403,
        'Insufficient permissions',
        'errors.auth.insufficientPermissions'
      )
    }

    // GLOBAL_ADMIN always passes
    if (user.role === UserRole.GLOBAL_ADMIN) {
      return true
    }

    const userPermissions = await this.roleSettingsService.getUserPermissions(
      user.tenantId,
      user.role
    )

    const userPermissionSet = new Set(userPermissions)
    const hasAll = requiredPermissions.every(p => userPermissionSet.has(p))

    if (hasAll) {
      return true
    }

    // Check case-owner bypass: if the endpoint is decorated with
    // @AllowCaseOwner(), allow the request when the user owns the case.
    const allowCaseOwner = this.reflector.getAllAndOverride<boolean | undefined>(
      ALLOW_CASE_OWNER_KEY,
      [context.getHandler(), context.getClass()]
    )

    if (allowCaseOwner) {
      const caseId = request.params?.id
      if (caseId) {
        const caseRecord = await this.prisma.case.findUnique({
          where: { id: caseId },
          select: { ownerUserId: true },
        })
        if (caseRecord?.ownerUserId === user.sub) {
          return true
        }
      }
    }

    throw new BusinessException(
      403,
      'Insufficient permissions for this action',
      'errors.auth.insufficientPermissions'
    )
  }
}
