import { type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { TenantGuard } from '../../src/common/guards/tenant.guard'

function createMockContext(user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}

describe('TenantGuard', () => {
  let guard: TenantGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new TenantGuard(reflector)
  })

  it('should allow access for @Public() routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true)
    const context = createMockContext()

    const result = guard.canActivate(context)

    expect(result).toBe(true)
  })

  it('should allow access when request.user has tenantId', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
    const context = createMockContext({
      sub: 'user-1',
      email: 'test@test.com',
      tenantId: 'tenant-001',
      role: 'TENANT_ADMIN',
    })

    const result = guard.canActivate(context)

    expect(result).toBe(true)
  })

  it('should throw 403 BusinessException when tenantId is missing from user', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
    const context = createMockContext({
      sub: 'user-1',
      email: 'test@test.com',
      role: 'TENANT_ADMIN',
    })

    expect(() => guard.canActivate(context)).toThrow(BusinessException)
  })

  it('should throw 403 BusinessException when user is undefined', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
    const context = createMockContext(undefined)

    expect(() => guard.canActivate(context)).toThrow(BusinessException)
  })

  it('should include correct messageKey in the exception', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false)
    const context = createMockContext({ sub: 'user-1', email: 'test@test.com' })

    try {
      guard.canActivate(context)
      fail('Expected BusinessException to be thrown')
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BusinessException)
      expect((error as BusinessException).messageKey).toBe('errors.auth.tenantRequired')
    }
  })
})
