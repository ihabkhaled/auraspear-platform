import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import { BusinessException } from '../exceptions/business.exception'

/**
 * Extracts the tenantId from the authenticated user on the request.
 * Throws 403 if tenantId is missing — defense-in-depth against guard bypass.
 *
 * @example
 *   @TenantId() tenantId: string
 */
export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest()
  const tenantId = request.user?.tenantId as string | undefined
  if (!tenantId) {
    throw new BusinessException(403, 'Tenant context required', 'errors.auth.tenantRequired')
  }
  return tenantId
})
