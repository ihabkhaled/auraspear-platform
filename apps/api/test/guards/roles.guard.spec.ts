import { type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { RolesGuard } from '../../src/common/guards/roles.guard'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'

function createMockContext(role: UserRole): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { sub: 'test', email: 'test@test.com', tenantId: 't1', role },
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}

describe('RolesGuard', () => {
  let guard: RolesGuard
  let reflector: Reflector

  beforeEach(() => {
    reflector = new Reflector()
    guard = new RolesGuard(reflector)
  })

  it('should allow access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    const context = createMockContext(UserRole.EXECUTIVE_READONLY)
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should allow GLOBAL_ADMIN access to everything', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SOC_ANALYST_L1])
    const context = createMockContext(UserRole.GLOBAL_ADMIN)
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should allow TENANT_ADMIN access to SOC_ANALYST_L1 route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.SOC_ANALYST_L1])
    const context = createMockContext(UserRole.TENANT_ADMIN)
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should deny EXECUTIVE_READONLY access to TENANT_ADMIN route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.TENANT_ADMIN])
    const context = createMockContext(UserRole.EXECUTIVE_READONLY)
    expect(() => guard.canActivate(context)).toThrow(BusinessException)
  })

  it('should deny SOC_ANALYST_L1 access to TENANT_ADMIN route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.TENANT_ADMIN])
    const context = createMockContext(UserRole.SOC_ANALYST_L1)
    expect(() => guard.canActivate(context)).toThrow(BusinessException)
  })

  it('should allow THREAT_HUNTER access to THREAT_HUNTER route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.THREAT_HUNTER])
    const context = createMockContext(UserRole.THREAT_HUNTER)
    expect(guard.canActivate(context)).toBe(true)
  })

  it('should allow when user role matches one of multiple required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([UserRole.THREAT_HUNTER, UserRole.SOC_ANALYST_L2])
    const context = createMockContext(UserRole.THREAT_HUNTER)
    expect(guard.canActivate(context)).toBe(true)
  })
})
