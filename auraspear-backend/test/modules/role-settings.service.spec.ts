import { ALL_PERMISSIONS, Permission } from '../../src/common/enums/permission.enum'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import { PermissionUpdateReason } from '../../src/modules/notifications/notifications.enums'
import { CONFIGURABLE_ROLES } from '../../src/modules/role-settings/constants/default-permissions'
import { PERMISSION_DEFINITIONS } from '../../src/modules/role-settings/constants/permission-definitions'
import { RoleSettingsService } from '../../src/modules/role-settings/role-settings.service'

const TENANT_ID = 'tenant-001'

function createMockRepository() {
  return {
    findPermissionsByTenant: jest.fn(),
    findPermissionsByTenantAndRole: jest.fn(),
    hasPermissionByTenantAndRole: jest.fn(),
    findActiveUserIdsByRoles: jest.fn(),
    bulkUpsertPermissions: jest.fn(),
    bulkCreatePermissions: jest.fn(),
    deleteAllByTenant: jest.fn(),
    countByTenant: jest.fn(),
    findAllTenantIds: jest.fn(),
    upsertPermissionDefinition: jest.fn(),
    findPermissionDefinitions: jest.fn(),
    hasPermissionDefinition: jest.fn(),
  }
}

function createMockCache() {
  return {
    get: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    invalidate: jest.fn(),
    invalidateAll: jest.fn(),
  }
}

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockNotificationsService = {
  emitPermissionsUpdatedToUsers: jest.fn(),
}

describe('RoleSettingsService', () => {
  let service: RoleSettingsService
  let repository: ReturnType<typeof createMockRepository>
  let cache: ReturnType<typeof createMockCache>

  beforeEach(() => {
    repository = createMockRepository()
    cache = createMockCache()
    mockNotificationsService.emitPermissionsUpdatedToUsers.mockReset()
    service = new RoleSettingsService(
      repository as never,
      cache as never,
      mockAppLogger as never,
      mockNotificationsService as never
    )
    repository.hasPermissionByTenantAndRole.mockResolvedValue(true)
    repository.hasPermissionDefinition.mockResolvedValue(true)
    repository.bulkCreatePermissions.mockResolvedValue(undefined)
  })

  /* ---------------------------------------------------------------- */
  /* getPermissionMatrix                                                */
  /* ---------------------------------------------------------------- */

  describe('getPermissionMatrix', () => {
    it('should return a matrix with all configurable roles as keys', async () => {
      repository.findPermissionsByTenant.mockResolvedValue([])

      const matrix = await service.getPermissionMatrix(TENANT_ID)

      for (const role of CONFIGURABLE_ROLES) {
        expect(matrix).toHaveProperty(role)
        expect(Array.isArray(matrix[role])).toBe(true)
      }
    })

    it('should populate permissions from DB records into the correct role', async () => {
      repository.findPermissionsByTenant.mockResolvedValue([
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.ALERTS_VIEW },
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.CASES_VIEW },
        { role: UserRole.SOC_ANALYST_L1, permissionKey: Permission.DASHBOARD_VIEW },
      ])

      const matrix = await service.getPermissionMatrix(TENANT_ID)

      expect(matrix[UserRole.TENANT_ADMIN]).toContain(Permission.ALERTS_VIEW)
      expect(matrix[UserRole.TENANT_ADMIN]).toContain(Permission.CASES_VIEW)
      expect(matrix[UserRole.SOC_ANALYST_L1]).toContain(Permission.DASHBOARD_VIEW)
      expect(matrix[UserRole.SOC_ANALYST_L2]).toEqual([])
    })

    it('should return empty arrays when DB has no records', async () => {
      repository.findPermissionsByTenant.mockResolvedValue([])

      const matrix = await service.getPermissionMatrix(TENANT_ID)

      for (const role of CONFIGURABLE_ROLES) {
        expect(matrix[role]).toEqual([])
      }
    })

    it('should backfill missing default permissions for legacy tenants', async () => {
      repository.hasPermissionByTenantAndRole.mockResolvedValue(false)
      repository.findPermissionsByTenant.mockResolvedValue([
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.USERS_CONTROL_VIEW },
      ])

      const matrix = await service.getPermissionMatrix(TENANT_ID)

      expect(repository.bulkCreatePermissions).toHaveBeenCalledWith(
        TENANT_ID,
        expect.arrayContaining([
          expect.objectContaining({
            role: UserRole.TENANT_ADMIN,
            permissionKey: Permission.USERS_CONTROL_VIEW,
            allowed: true,
          }),
        ])
      )
      expect(matrix[UserRole.TENANT_ADMIN]).toContain(Permission.USERS_CONTROL_VIEW)
      expect(cache.invalidate).toHaveBeenCalledWith(TENANT_ID)
    })
  })

  /* ---------------------------------------------------------------- */
  /* getPermissionDefinitions                                           */
  /* ---------------------------------------------------------------- */

  describe('getPermissionDefinitions', () => {
    it('should hide the role settings module for TENANT_ADMIN', async () => {
      repository.findPermissionDefinitions.mockResolvedValue([
        {
          key: Permission.ALERTS_VIEW,
          module: 'alerts',
          labelKey: 'roleSettings.permissions.alerts.view',
          sortOrder: 100,
        },
        {
          key: Permission.ROLE_SETTINGS_UPDATE,
          module: 'roleSettings',
          labelKey: 'roleSettings.permissions.roleSettings.update',
          sortOrder: 2501,
        },
      ])

      const definitions = await service.getPermissionDefinitions(TENANT_ID, UserRole.TENANT_ADMIN)

      expect(definitions).toEqual([
        {
          key: Permission.ALERTS_VIEW,
          module: 'alerts',
          labelKey: 'roleSettings.permissions.alerts.view',
          sortOrder: 100,
        },
      ])
    })

    it('should keep the role settings module visible for GLOBAL_ADMIN', async () => {
      repository.findPermissionDefinitions.mockResolvedValue([
        {
          key: Permission.ROLE_SETTINGS_UPDATE,
          module: 'roleSettings',
          labelKey: 'roleSettings.permissions.roleSettings.update',
          sortOrder: 2501,
        },
      ])

      const definitions = await service.getPermissionDefinitions(TENANT_ID, UserRole.GLOBAL_ADMIN)

      expect(definitions).toHaveLength(1)
      expect(definitions[0]?.module).toBe('roleSettings')
    })

    it('should keep the users control module visible for TENANT_ADMIN', async () => {
      repository.findPermissionDefinitions.mockResolvedValue([
        {
          key: Permission.USERS_CONTROL_VIEW,
          module: 'usersControl',
          labelKey: 'roleSettings.permissions.usersControl.view',
          sortOrder: 2601,
        },
      ])

      const definitions = await service.getPermissionDefinitions(TENANT_ID, UserRole.TENANT_ADMIN)

      expect(definitions).toHaveLength(1)
      expect(definitions[0]?.module).toBe('usersControl')
    })

    it('should seed missing permission definitions for legacy databases', async () => {
      repository.hasPermissionDefinition.mockResolvedValue(false)
      repository.upsertPermissionDefinition.mockResolvedValue(undefined)
      repository.findPermissionDefinitions.mockResolvedValue([
        {
          key: Permission.USERS_CONTROL_VIEW,
          module: 'usersControl',
          labelKey: 'roleSettings.permissions.usersControl.view',
          sortOrder: 2600,
        },
      ])

      const definitions = await service.getPermissionDefinitions(TENANT_ID, UserRole.GLOBAL_ADMIN)

      expect(repository.upsertPermissionDefinition).toHaveBeenCalledTimes(
        PERMISSION_DEFINITIONS.length
      )
      expect(definitions[0]?.module).toBe('usersControl')
    })
  })

  /* ---------------------------------------------------------------- */
  /* getUserPermissions                                                 */
  /* ---------------------------------------------------------------- */

  describe('getUserPermissions', () => {
    it('should return ALL_PERMISSIONS for GLOBAL_ADMIN', async () => {
      const permissions = await service.getUserPermissions(TENANT_ID, UserRole.GLOBAL_ADMIN)

      expect(permissions).toEqual(ALL_PERMISSIONS)
      expect(repository.findPermissionsByTenantAndRole).not.toHaveBeenCalled()
      expect(cache.get).not.toHaveBeenCalled()
    })

    it('should return cached permissions when available', async () => {
      const cachedSet = new Set([Permission.ALERTS_VIEW, Permission.DASHBOARD_VIEW])
      cache.get.mockReturnValue(cachedSet)

      const permissions = await service.getUserPermissions(TENANT_ID, UserRole.SOC_ANALYST_L1)

      expect(permissions).toEqual([...cachedSet])
      expect(repository.findPermissionsByTenantAndRole).not.toHaveBeenCalled()
    })

    it('should fetch from DB and cache when cache is empty', async () => {
      cache.get.mockReturnValue(null)
      repository.findPermissionsByTenantAndRole.mockResolvedValue([
        { permissionKey: Permission.ALERTS_VIEW },
        { permissionKey: Permission.CASES_VIEW },
      ])

      const permissions = await service.getUserPermissions(TENANT_ID, UserRole.SOC_ANALYST_L1)

      expect(permissions).toEqual([Permission.ALERTS_VIEW, Permission.CASES_VIEW])
      expect(cache.set).toHaveBeenCalledWith(
        TENANT_ID,
        UserRole.SOC_ANALYST_L1,
        new Set([Permission.ALERTS_VIEW, Permission.CASES_VIEW])
      )
    })

    it('should return empty array when user has no permissions in DB', async () => {
      cache.get.mockReturnValue(null)
      repository.findPermissionsByTenantAndRole.mockResolvedValue([])

      const permissions = await service.getUserPermissions(TENANT_ID, UserRole.EXECUTIVE_READONLY)

      expect(permissions).toEqual([])
    })
  })

  /* ---------------------------------------------------------------- */
  /* hasPermission                                                      */
  /* ---------------------------------------------------------------- */

  describe('hasPermission', () => {
    it('should return true for GLOBAL_ADMIN regardless of permission', async () => {
      const result = await service.hasPermission(
        TENANT_ID,
        UserRole.GLOBAL_ADMIN,
        Permission.ADMIN_TENANTS_DELETE
      )
      expect(result).toBe(true)
    })

    it('should return true when user has the permission', async () => {
      cache.get.mockReturnValue(null)
      repository.findPermissionsByTenantAndRole.mockResolvedValue([
        { permissionKey: Permission.ALERTS_VIEW },
      ])

      const result = await service.hasPermission(
        TENANT_ID,
        UserRole.SOC_ANALYST_L1,
        Permission.ALERTS_VIEW
      )
      expect(result).toBe(true)
    })

    it('should return false when user lacks the permission', async () => {
      cache.get.mockReturnValue(null)
      repository.findPermissionsByTenantAndRole.mockResolvedValue([
        { permissionKey: Permission.ALERTS_VIEW },
      ])

      const result = await service.hasPermission(
        TENANT_ID,
        UserRole.SOC_ANALYST_L1,
        Permission.ADMIN_TENANTS_DELETE
      )
      expect(result).toBe(false)
    })
  })

  /* ---------------------------------------------------------------- */
  /* resetToDefaults                                                    */
  /* ---------------------------------------------------------------- */

  describe('resetToDefaults', () => {
    it('should delete existing, re-seed, and invalidate cache', async () => {
      repository.deleteAllByTenant.mockResolvedValue({ count: 10 })
      repository.bulkUpsertPermissions.mockResolvedValue(undefined)
      repository.findPermissionsByTenant.mockResolvedValue([])
      repository.findActiveUserIdsByRoles.mockResolvedValue(['user-001'])

      await service.resetToDefaults(TENANT_ID, 'admin@test.com', 'admin-001', UserRole.GLOBAL_ADMIN)

      expect(repository.deleteAllByTenant).toHaveBeenCalledWith(TENANT_ID)
      expect(repository.bulkUpsertPermissions).toHaveBeenCalled()
      expect(cache.invalidate).toHaveBeenCalledWith(TENANT_ID)
      expect(mockNotificationsService.emitPermissionsUpdatedToUsers).toHaveBeenCalledWith(
        TENANT_ID,
        ['user-001'],
        PermissionUpdateReason.ROLE_MATRIX_UPDATED
      )
    })

    it('should block TENANT_ADMIN from resetting defaults', async () => {
      await expect(
        service.resetToDefaults(
          TENANT_ID,
          'tenant-admin@test.com',
          'admin-001',
          UserRole.TENANT_ADMIN
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.auth.insufficientPermissions',
      })

      expect(repository.deleteAllByTenant).not.toHaveBeenCalled()
    })
  })

  /* ---------------------------------------------------------------- */
  /* updatePermissionMatrix                                             */
  /* ---------------------------------------------------------------- */

  describe('updatePermissionMatrix', () => {
    it('should block TENANT_ADMIN from changing role settings permissions in the matrix', async () => {
      repository.findPermissionsByTenant.mockResolvedValue([
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.ROLE_SETTINGS_VIEW },
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.ROLE_SETTINGS_UPDATE },
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.ALERTS_VIEW },
      ])
      repository.findPermissionsByTenantAndRole.mockResolvedValue([
        { permissionKey: Permission.ROLE_SETTINGS_VIEW },
        { permissionKey: Permission.ROLE_SETTINGS_UPDATE },
        { permissionKey: Permission.ALERTS_VIEW },
      ])

      const matrix = {
        [UserRole.TENANT_ADMIN]: [Permission.ROLE_SETTINGS_VIEW, Permission.ALERTS_VIEW],
      }

      await expect(
        service.updatePermissionMatrix(
          TENANT_ID,
          matrix,
          'tenant-admin@test.com',
          'tenant-admin-001',
          UserRole.TENANT_ADMIN
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.auth.insufficientPermissions',
      })

      expect(repository.bulkUpsertPermissions).not.toHaveBeenCalled()
    })

    it('should block TENANT_ADMIN from changing users control permissions in the matrix', async () => {
      repository.findPermissionsByTenant.mockResolvedValue([
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.USERS_CONTROL_VIEW },
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.USERS_CONTROL_VIEW_SESSIONS },
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.USERS_CONTROL_FORCE_LOGOUT },
        { role: UserRole.TENANT_ADMIN, permissionKey: Permission.USERS_CONTROL_FORCE_LOGOUT_ALL },
      ])
      repository.findPermissionsByTenantAndRole.mockResolvedValue([
        { permissionKey: Permission.USERS_CONTROL_VIEW },
        { permissionKey: Permission.USERS_CONTROL_VIEW_SESSIONS },
        { permissionKey: Permission.USERS_CONTROL_FORCE_LOGOUT },
        { permissionKey: Permission.USERS_CONTROL_FORCE_LOGOUT_ALL },
      ])

      const matrix = {
        [UserRole.TENANT_ADMIN]: [
          Permission.USERS_CONTROL_VIEW,
          Permission.USERS_CONTROL_VIEW_SESSIONS,
          Permission.USERS_CONTROL_FORCE_LOGOUT,
        ],
      }

      await expect(
        service.updatePermissionMatrix(
          TENANT_ID,
          matrix,
          'tenant-admin@test.com',
          'tenant-admin-001',
          UserRole.TENANT_ADMIN
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.auth.insufficientPermissions',
      })

      expect(repository.bulkUpsertPermissions).not.toHaveBeenCalled()
    })

    it('should reject assigning users control permissions to non-tenant-admin roles', async () => {
      repository.findPermissionsByTenant.mockResolvedValue([])

      await expect(
        service.updatePermissionMatrix(
          TENANT_ID,
          {
            [UserRole.SOC_ANALYST_L1]: [Permission.USERS_CONTROL_VIEW],
          },
          'admin@test.com',
          'admin-001',
          UserRole.GLOBAL_ADMIN
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.roleSettings.usersControlRestrictedRole',
      })

      expect(repository.bulkUpsertPermissions).not.toHaveBeenCalled()
    })

    it('should allow global admins to keep users control permissions on tenant admin roles', async () => {
      repository.findPermissionsByTenant.mockResolvedValue([])
      repository.bulkUpsertPermissions.mockResolvedValue(undefined)
      repository.findActiveUserIdsByRoles.mockResolvedValue([])

      await expect(
        service.updatePermissionMatrix(
          TENANT_ID,
          {
            [UserRole.TENANT_ADMIN]: [
              Permission.USERS_CONTROL_VIEW,
              Permission.USERS_CONTROL_VIEW_SESSIONS,
              Permission.USERS_CONTROL_FORCE_LOGOUT,
              Permission.USERS_CONTROL_FORCE_LOGOUT_ALL,
            ],
          },
          'admin@test.com',
          'admin-001',
          UserRole.GLOBAL_ADMIN
        )
      ).resolves.toBeDefined()

      expect(repository.bulkUpsertPermissions).toHaveBeenCalled()
    })

    it('should emit permission refresh events for impacted roles after update', async () => {
      repository.findPermissionsByTenant.mockResolvedValue([
        { role: UserRole.SOC_ANALYST_L1, permissionKey: Permission.ALERTS_VIEW },
      ])
      repository.findPermissionsByTenantAndRole.mockResolvedValue([
        { permissionKey: Permission.ALERTS_VIEW },
        { permissionKey: Permission.CASES_VIEW },
      ])
      repository.bulkUpsertPermissions.mockResolvedValue(undefined)
      repository.findActiveUserIdsByRoles.mockResolvedValue(['user-101', 'user-202'])

      await service.updatePermissionMatrix(
        TENANT_ID,
        {
          [UserRole.SOC_ANALYST_L1]: [Permission.ALERTS_VIEW, Permission.CASES_VIEW],
        },
        'admin@test.com',
        'admin-001',
        UserRole.GLOBAL_ADMIN
      )

      expect(repository.findActiveUserIdsByRoles).toHaveBeenCalledWith(TENANT_ID, [
        UserRole.SOC_ANALYST_L1,
      ])
      expect(mockNotificationsService.emitPermissionsUpdatedToUsers).toHaveBeenCalledWith(
        TENANT_ID,
        ['user-101', 'user-202'],
        PermissionUpdateReason.ROLE_MATRIX_UPDATED
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* seedDefaultsForTenant                                              */
  /* ---------------------------------------------------------------- */

  describe('seedDefaultsForTenant', () => {
    it('should call bulkUpsertPermissions with entries for all configurable roles', async () => {
      repository.bulkUpsertPermissions.mockResolvedValue(undefined)

      await service.seedDefaultsForTenant(TENANT_ID)

      expect(repository.bulkUpsertPermissions).toHaveBeenCalledTimes(1)
      const entries = repository.bulkUpsertPermissions.mock.calls[0][1] as Array<{
        role: string
        permissionKey: string
        allowed: boolean
      }>

      // Each configurable role should have an entry for each permission
      const expectedEntryCount = CONFIGURABLE_ROLES.length * ALL_PERMISSIONS.length
      expect(entries).toHaveLength(expectedEntryCount)
    })
  })
})
