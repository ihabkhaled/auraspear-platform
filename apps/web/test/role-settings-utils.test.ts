import { describe, expect, it } from 'vitest'
import { Permission, UserRole } from '@/enums'
import {
  canAssignRoleSettingsPermission,
  canResetRoleSettings,
  canToggleRoleSettingsPermission,
  filterRoleSettingsPermissionGroups,
  ROLE_SETTINGS_MODULE_KEY,
} from '@/lib/role-settings'

describe('role settings utilities', () => {
  it('hides the role settings module group for tenant admins', () => {
    const groups = [
      { key: 'alerts', labelKey: 'roleSettings.modules.alerts', permissions: ['alerts.view'] },
      {
        key: ROLE_SETTINGS_MODULE_KEY,
        labelKey: 'roleSettings.modules.roleSettings',
        permissions: [Permission.ROLE_SETTINGS_VIEW],
      },
    ]

    const result = filterRoleSettingsPermissionGroups(groups, UserRole.TENANT_ADMIN)

    expect(result).toEqual([
      { key: 'alerts', labelKey: 'roleSettings.modules.alerts', permissions: ['alerts.view'] },
    ])
  })

  it('keeps the role settings module group for global admins', () => {
    const groups = [
      {
        key: ROLE_SETTINGS_MODULE_KEY,
        labelKey: 'roleSettings.modules.roleSettings',
        permissions: [Permission.ROLE_SETTINGS_UPDATE],
      },
    ]

    const result = filterRoleSettingsPermissionGroups(groups, UserRole.GLOBAL_ADMIN)

    expect(result).toEqual(groups)
  })

  it('prevents tenant admins from toggling protected role settings permissions', () => {
    expect(
      canToggleRoleSettingsPermission(UserRole.TENANT_ADMIN, Permission.ROLE_SETTINGS_VIEW)
    ).toBe(false)
    expect(
      canToggleRoleSettingsPermission(UserRole.TENANT_ADMIN, Permission.ROLE_SETTINGS_UPDATE)
    ).toBe(false)
    expect(
      canToggleRoleSettingsPermission(UserRole.TENANT_ADMIN, Permission.USERS_CONTROL_VIEW)
    ).toBe(false)
    expect(
      canToggleRoleSettingsPermission(
        UserRole.TENANT_ADMIN,
        Permission.USERS_CONTROL_FORCE_LOGOUT_ALL
      )
    ).toBe(false)
    expect(canToggleRoleSettingsPermission(UserRole.TENANT_ADMIN, Permission.ALERTS_VIEW)).toBe(
      true
    )
  })

  it('limits users control assignments to global admin and tenant admin roles', () => {
    expect(
      canAssignRoleSettingsPermission(UserRole.GLOBAL_ADMIN, Permission.USERS_CONTROL_VIEW)
    ).toBe(true)
    expect(
      canAssignRoleSettingsPermission(UserRole.TENANT_ADMIN, Permission.USERS_CONTROL_VIEW)
    ).toBe(true)
    expect(
      canAssignRoleSettingsPermission(UserRole.SOC_ANALYST_L1, Permission.USERS_CONTROL_VIEW)
    ).toBe(false)
  })

  it('hides reset defaults for tenant admins while keeping save access', () => {
    expect(canResetRoleSettings(UserRole.TENANT_ADMIN, true)).toBe(false)
    expect(canResetRoleSettings(UserRole.GLOBAL_ADMIN, true)).toBe(true)
  })
})
