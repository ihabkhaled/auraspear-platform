import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import { AuthController } from '../../src/modules/auth/auth.controller'
import type { JwtPayload } from '../../src/common/interfaces/authenticated-request.interface'

const TENANT_ID = 'tenant-001'

function createMockUser(overrides?: Partial<JwtPayload>): JwtPayload {
  return {
    sub: 'user-001',
    email: 'analyst@test.com',
    tenantId: TENANT_ID,
    tenantSlug: 'test-tenant',
    role: UserRole.SOC_ANALYST_L1,
    ...overrides,
  }
}

describe('AuthController — GET /auth/me', () => {
  let controller: AuthController
  let mockAuthService: {
    login: jest.Mock
    getPermissions: jest.Mock
    refreshTokens: jest.Mock
    logout: jest.Mock
    verifyRefreshToken: jest.Mock
    endImpersonation: jest.Mock
    getUserTenants: jest.Mock
  }

  beforeEach(() => {
    mockAuthService = {
      login: jest.fn(),
      getPermissions: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      verifyRefreshToken: jest.fn(),
      endImpersonation: jest.fn(),
      getUserTenants: jest.fn(),
    }

    controller = new AuthController(mockAuthService as never)
  })

  /* ---------------------------------------------------------------- */
  /* Returns user + permissions array                                   */
  /* ---------------------------------------------------------------- */

  it('should return user and permissions from the auth service', async () => {
    const user = createMockUser()
    const expectedPermissions = ['alerts.view', 'dashboard.view', 'cases.view']
    mockAuthService.getPermissions.mockResolvedValue(expectedPermissions)

    const result = await controller.getProfile(user)

    expect(result).toEqual({
      user,
      permissions: expectedPermissions,
    })
    expect(mockAuthService.getPermissions).toHaveBeenCalledWith(user.tenantId, user.role)
  })

  it('should call getPermissions with the correct tenantId and role', async () => {
    const user = createMockUser({
      tenantId: 'tenant-999',
      role: UserRole.TENANT_ADMIN,
    })
    mockAuthService.getPermissions.mockResolvedValue([])

    await controller.getProfile(user)

    expect(mockAuthService.getPermissions).toHaveBeenCalledWith('tenant-999', UserRole.TENANT_ADMIN)
  })

  it('should return empty permissions array when service returns empty', async () => {
    const user = createMockUser({ role: UserRole.EXECUTIVE_READONLY })
    mockAuthService.getPermissions.mockResolvedValue([])

    const result = await controller.getProfile(user)

    expect(result.permissions).toEqual([])
    expect(result.user).toEqual(user)
  })

  it('should return all permissions for GLOBAL_ADMIN', async () => {
    const user = createMockUser({ role: UserRole.GLOBAL_ADMIN })
    const allPerms = [
      'alerts.view',
      'alerts.investigate',
      'cases.view',
      'cases.create',
      'admin.tenants.view',
      'admin.tenants.create',
      'admin.tenants.update',
      'admin.tenants.delete',
    ]
    mockAuthService.getPermissions.mockResolvedValue(allPerms)

    const result = await controller.getProfile(user)

    expect(result.permissions).toEqual(allPerms)
    expect(result.permissions).toHaveLength(allPerms.length)
  })

  it('should propagate errors from the auth service', async () => {
    const user = createMockUser()
    mockAuthService.getPermissions.mockRejectedValue(new Error('Service error'))

    await expect(controller.getProfile(user)).rejects.toThrow('Service error')
  })

  /* ---------------------------------------------------------------- */
  /* Permissions come from role settings service (via auth service)      */
  /* ---------------------------------------------------------------- */

  it('should return different permissions for different roles', async () => {
    const l1User = createMockUser({ role: UserRole.SOC_ANALYST_L1 })
    const l2User = createMockUser({ role: UserRole.SOC_ANALYST_L2 })

    const l1Perms = ['alerts.view', 'dashboard.view']
    const l2Perms = ['alerts.view', 'dashboard.view', 'cases.create', 'cases.delete']

    mockAuthService.getPermissions.mockResolvedValueOnce(l1Perms).mockResolvedValueOnce(l2Perms)

    const l1Result = await controller.getProfile(l1User)
    const l2Result = await controller.getProfile(l2User)

    expect(l1Result.permissions).toEqual(l1Perms)
    expect(l2Result.permissions).toEqual(l2Perms)
    expect(l2Result.permissions.length).toBeGreaterThan(l1Result.permissions.length)
  })

  it('should return different permissions for different tenants', async () => {
    const tenantAUser = createMockUser({ tenantId: 'tenant-a' })
    const tenantBUser = createMockUser({ tenantId: 'tenant-b' })

    const tenantAPerms = ['alerts.view']
    const tenantBPerms = ['alerts.view', 'cases.view']

    mockAuthService.getPermissions
      .mockResolvedValueOnce(tenantAPerms)
      .mockResolvedValueOnce(tenantBPerms)

    const resultA = await controller.getProfile(tenantAUser)
    const resultB = await controller.getProfile(tenantBUser)

    expect(resultA.permissions).toEqual(tenantAPerms)
    expect(resultB.permissions).toEqual(tenantBPerms)

    expect(mockAuthService.getPermissions).toHaveBeenCalledWith('tenant-a', UserRole.SOC_ANALYST_L1)
    expect(mockAuthService.getPermissions).toHaveBeenCalledWith('tenant-b', UserRole.SOC_ANALYST_L1)
  })
})
