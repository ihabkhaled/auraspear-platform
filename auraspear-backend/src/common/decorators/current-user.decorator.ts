import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import { BusinessException } from '../exceptions/business.exception'
import { type JwtPayload } from '../interfaces/authenticated-request.interface'

function getPayloadField(user: JwtPayload, field: keyof JwtPayload): string {
  const fieldGetters = new Map<keyof JwtPayload, () => string>([
    ['sub', () => user.sub],
    ['email', () => user.email],
    ['tenantId', () => user.tenantId],
    ['tenantSlug', () => user.tenantSlug],
    ['role', () => user.role],
    ['jti', () => String(user.jti ?? '')],
    ['iat', () => String(user.iat ?? '')],
    ['exp', () => String(user.exp ?? '')],
    ['isImpersonated', () => String(user.isImpersonated ?? '')],
  ])

  const getter = fieldGetters.get(field)
  return getter ? getter() : ''
}

/**
 * Extracts the authenticated user (JwtPayload) from the request.
 * Optionally pass a property name to extract a single field.
 *
 * @example
 *   @CurrentUser() user: JwtPayload
 *   @CurrentUser('tenantId') tenantId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | string => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user as JwtPayload | undefined
    if (!user) {
      throw new BusinessException(401, 'Authentication required', 'errors.auth.missingToken')
    }
    return data ? getPayloadField(user, data) : user
  }
)
