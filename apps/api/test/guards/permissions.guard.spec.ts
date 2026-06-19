import { type ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Permission } from '../../src/common/enums/permission.enum'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { PermissionsGuard } from '../../src/common/guards/permissions.guard'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import type { JwtPayload } from '../../src/common/interfaces/authenticated-request.interface'

function createMockContext(user?: Partial<JwtPayload>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: user
          ? {
              sub: 'user-001',
              email: 'test@test.com',
              tenantId: 'tenant-001',
              tenantSlug: 'test-tenant',
              role: UserRole.SOC_ANALYST_L1,
              ...user,
            }
          : undefined,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard
  let reflector: Reflector
  let mockRoleSettingsService: { getUserPermissions: jest.Mock }

  beforeEach(() => {
    reflector = new Reflector()
    mockRoleSettingsService = {
      getUserPermissions: jest.fn(),
    }
    guard = new PermissionsGuard(reflector, mockRoleSettingsService as never)
  })

  /* ---------------------------------------------------------------- */
  /* No @RequirePermission decorator — should pass                      */
  /* ---------------------------------------------------------------- */

  it('should allow access when no permissions are required (undefined)', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    const context = createMockContext({ role: UserRole.EXECUTIVE_READONLY })
    const result = await guard.canActivate(context)
    expect(result).toBe(true)
    expect(mockRoleSettingsService.getUserPermissions).not.toHaveBeenCalled()
  })

  it('should allow access when permissions array is empty', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([])
    const context = createMockContext({ role: UserRole.EXECUTIVE_READONLY })
    const result = await guard.canActivate(context)
    expect(result).toBe(true)
  })

  /* ---------------------------------------------------------------- */
  /* GLOBAL_ADMIN always passes                                         */
  /* ---------------------------------------------------------------- */

  it('should allow GLOBAL_ADMIN access regardless of required permissions', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.ADMIN_TENANTS_DELETE, Permission.ADMIN_USERS_DELETE])
    const context = createMockContext({ role: UserRole.GLOBAL_ADMIN })
    const result = await guard.canActivate(context)
    expect(result).toBe(true)
    expect(mockRoleSettingsService.getUserPermissions).not.toHaveBeenCalled()
  })

  it('should allow GLOBAL_ADMIN even for a single permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ROLE_SETTINGS_UPDATE])
    const context = createMockContext({ role: UserRole.GLOBAL_ADMIN })
    const result = await guard.canActivate(context)
    expect(result).toBe(true)
  })

  /* ---------------------------------------------------------------- */
  /* User with the required permission passes                           */
  /* ---------------------------------------------------------------- */

  it('should allow a user who has the required permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ALERTS_VIEW])
    mockRoleSettingsService.getUserPermissions.mockResolvedValue([
      Permission.ALERTS_VIEW,
      Permission.DASHBOARD_VIEW,
    ])

    const context = createMockContext({ role: UserRole.SOC_ANALYST_L1 })
    const result = await guard.canActivate(context)
    expect(result).toBe(true)
    expect(mockRoleSettingsService.getUserPermissions).toHaveBeenCalledWith(
      'tenant-001',
      UserRole.SOC_ANALYST_L1
    )
  })

  it('should allow when user has all of multiple required permissions', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.CASES_VIEW, Permission.CASES_CREATE])
    mockRoleSettingsService.getUserPermissions.mockResolvedValue([
      Permission.CASES_VIEW,
      Permission.CASES_CREATE,
      Permission.CASES_UPDATE,
    ])

    const context = createMockContext({ role: UserRole.SOC_ANALYST_L2 })
    const result = await guard.canActivate(context)
    expect(result).toBe(true)
  })

  /* ---------------------------------------------------------------- */
  /* User without the required permission gets 403                      */
  /* ---------------------------------------------------------------- */

  it('should throw 403 when user lacks the required permission', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ADMIN_USERS_DELETE])
    mockRoleSettingsService.getUserPermissions.mockResolvedValue([
      Permission.ALERTS_VIEW,
      Permission.DASHBOARD_VIEW,
    ])

    const context = createMockContext({ role: UserRole.SOC_ANALYST_L1 })
    await expect(guard.canActivate(context)).rejects.toThrow(BusinessException)
  })

  it('should throw 403 when user has some but not all required permissions', async () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Permission.CASES_VIEW, Permission.CASES_DELETE])
    mockRoleSettingsService.getUserPermissions.mockResolvedValue([
      Permission.CASES_VIEW,
      Permission.CASES_CREATE,
    ])

    const context = createMockContext({ role: UserRole.SOC_ANALYST_L1 })
    await expect(guard.canActivate(context)).rejects.toThrow(BusinessException)
  })

  it('should throw 403 when user has zero permissions', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ALERTS_VIEW])
    mockRoleSettingsService.getUserPermissions.mockResolvedValue([])

    const context = createMockContext({ role: UserRole.EXECUTIVE_READONLY })
    await expect(guard.canActivate(context)).rejects.toThrow(BusinessException)
  })

  /* ---------------------------------------------------------------- */
  /* Missing user / role                                                */
  /* ---------------------------------------------------------------- */

  it('should throw 403 when request has no user', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ALERTS_VIEW])

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext

    await expect(guard.canActivate(context)).rejects.toThrow(BusinessException)
  })

  it('should throw 403 when user has no role', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Permission.ALERTS_VIEW])

    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { sub: 'user-001', email: 'test@test.com', tenantId: 'tenant-001' },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext

    await expect(guard.canActivate(context)).rejects.toThrow(BusinessException)
  })

  /* ---------------------------------------------------------------- */
  /* Reflector reads both handler and class metadata                    */
  /* ---------------------------------------------------------------- */

  it('should read metadata from both handler and class', async () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined)
    const context = createMockContext({ role: UserRole.SOC_ANALYST_L1 })

    await guard.canActivate(context)

    expect(spy).toHaveBeenCalledWith('permissions', [context.getHandler(), context.getClass()])
  })
})
