import { ALL_PERMISSIONS, Permission } from '../../src/common/enums/permission.enum'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import {
  CONFIGURABLE_ROLES,
  DEFAULT_PERMISSIONS,
} from '../../src/modules/role-settings/constants/default-permissions'

describe('Default Permissions', () => {
  /* ---------------------------------------------------------------- */
  /* TENANT_ADMIN permissions                                           */
  /* ---------------------------------------------------------------- */

  describe('TENANT_ADMIN', () => {
    const tenantAdminPerms = new Set(DEFAULT_PERMISSIONS[UserRole.TENANT_ADMIN])

    it('should have all permissions except admin.tenants write operations', () => {
      // TENANT_ADMIN should NOT have create/update/delete on tenants
      expect(tenantAdminPerms.has(Permission.ADMIN_TENANTS_CREATE)).toBe(false)
      expect(tenantAdminPerms.has(Permission.ADMIN_TENANTS_UPDATE)).toBe(false)
      expect(tenantAdminPerms.has(Permission.ADMIN_TENANTS_DELETE)).toBe(false)
    })

    it('should have admin.tenants.view', () => {
      expect(tenantAdminPerms.has(Permission.ADMIN_TENANTS_VIEW)).toBe(true)
    })

    it('should have all admin.users permissions', () => {
      expect(tenantAdminPerms.has(Permission.ADMIN_USERS_VIEW)).toBe(true)
      expect(tenantAdminPerms.has(Permission.ADMIN_USERS_CREATE)).toBe(true)
      expect(tenantAdminPerms.has(Permission.ADMIN_USERS_UPDATE)).toBe(true)
      expect(tenantAdminPerms.has(Permission.ADMIN_USERS_DELETE)).toBe(true)
      expect(tenantAdminPerms.has(Permission.ADMIN_USERS_BLOCK)).toBe(true)
      expect(tenantAdminPerms.has(Permission.ADMIN_USERS_RESTORE)).toBe(true)
    })

    it('should have all case permissions including tasks and artifacts', () => {
      expect(tenantAdminPerms.has(Permission.CASES_VIEW)).toBe(true)
      expect(tenantAdminPerms.has(Permission.CASES_CREATE)).toBe(true)
      expect(tenantAdminPerms.has(Permission.CASES_UPDATE)).toBe(true)
      expect(tenantAdminPerms.has(Permission.CASES_DELETE)).toBe(true)
      expect(tenantAdminPerms.has(Permission.CASES_ADD_TASK)).toBe(true)
      expect(tenantAdminPerms.has(Permission.CASES_UPDATE_TASK)).toBe(true)
      expect(tenantAdminPerms.has(Permission.CASES_DELETE_TASK)).toBe(true)
      expect(tenantAdminPerms.has(Permission.CASES_ADD_ARTIFACT)).toBe(true)
      expect(tenantAdminPerms.has(Permission.CASES_DELETE_ARTIFACT)).toBe(true)
    })

    it('should have role settings permissions (TENANT_ADMIN manages tenant RBAC)', () => {
      expect(tenantAdminPerms.has(Permission.ROLE_SETTINGS_VIEW)).toBe(true)
      expect(tenantAdminPerms.has(Permission.ROLE_SETTINGS_UPDATE)).toBe(true)
    })

    it('should have all users control permissions', () => {
      expect(tenantAdminPerms.has(Permission.USERS_CONTROL_VIEW)).toBe(true)
      expect(tenantAdminPerms.has(Permission.USERS_CONTROL_VIEW_SESSIONS)).toBe(true)
      expect(tenantAdminPerms.has(Permission.USERS_CONTROL_FORCE_LOGOUT)).toBe(true)
      expect(tenantAdminPerms.has(Permission.USERS_CONTROL_FORCE_LOGOUT_ALL)).toBe(true)
    })

    it('should have DASHBOARD_VIEW', () => {
      expect(tenantAdminPerms.has(Permission.DASHBOARD_VIEW)).toBe(true)
    })
  })

  /* ---------------------------------------------------------------- */
  /* SOC_ANALYST_L1 permissions                                         */
  /* ---------------------------------------------------------------- */

  describe('SOC_ANALYST_L1', () => {
    const l1Perms = new Set(DEFAULT_PERMISSIONS[UserRole.SOC_ANALYST_L1])

    it('should NOT have CASES_ADD_TASK', () => {
      expect(l1Perms.has(Permission.CASES_ADD_TASK)).toBe(false)
    })

    it('should NOT have CASES_UPDATE_TASK', () => {
      expect(l1Perms.has(Permission.CASES_UPDATE_TASK)).toBe(false)
    })

    it('should NOT have CASES_ADD_ARTIFACT', () => {
      expect(l1Perms.has(Permission.CASES_ADD_ARTIFACT)).toBe(false)
    })

    it('should have CASES_VIEW and CASES_CREATE', () => {
      expect(l1Perms.has(Permission.CASES_VIEW)).toBe(true)
      expect(l1Perms.has(Permission.CASES_CREATE)).toBe(true)
    })

    it('should have DASHBOARD_VIEW', () => {
      expect(l1Perms.has(Permission.DASHBOARD_VIEW)).toBe(true)
    })

    it('should have basic alert permissions (view + acknowledge only)', () => {
      expect(l1Perms.has(Permission.ALERTS_VIEW)).toBe(true)
      expect(l1Perms.has(Permission.ALERTS_ACKNOWLEDGE)).toBe(true)
      // L1 should NOT have investigate or escalate
      expect(l1Perms.has(Permission.ALERTS_INVESTIGATE)).toBe(false)
      expect(l1Perms.has(Permission.ALERTS_ESCALATE)).toBe(false)
    })

    it('should NOT have admin user permissions', () => {
      expect(l1Perms.has(Permission.ADMIN_USERS_VIEW)).toBe(false)
      expect(l1Perms.has(Permission.ADMIN_USERS_CREATE)).toBe(false)
      expect(l1Perms.has(Permission.ADMIN_USERS_DELETE)).toBe(false)
    })

    it('should NOT have admin tenant permissions', () => {
      expect(l1Perms.has(Permission.ADMIN_TENANTS_VIEW)).toBe(false)
      expect(l1Perms.has(Permission.ADMIN_TENANTS_CREATE)).toBe(false)
    })
  })

  /* ---------------------------------------------------------------- */
  /* EXECUTIVE_READONLY permissions                                     */
  /* ---------------------------------------------------------------- */

  describe('EXECUTIVE_READONLY', () => {
    const execPerms = new Set(DEFAULT_PERMISSIONS[UserRole.EXECUTIVE_READONLY])

    it('should only have view permissions plus profile/settings', () => {
      // View permissions it should have
      expect(execPerms.has(Permission.DASHBOARD_VIEW)).toBe(true)
      expect(execPerms.has(Permission.ALERTS_VIEW)).toBe(true)
      expect(execPerms.has(Permission.CASES_VIEW)).toBe(true)
      expect(execPerms.has(Permission.INCIDENTS_VIEW)).toBe(true)
      expect(execPerms.has(Permission.REPORTS_VIEW)).toBe(true)
      expect(execPerms.has(Permission.REPORTS_EXPORT)).toBe(true)
      expect(execPerms.has(Permission.COMPLIANCE_VIEW)).toBe(true)
      expect(execPerms.has(Permission.INTEL_VIEW)).toBe(true)
      expect(execPerms.has(Permission.NOTIFICATIONS_VIEW)).toBe(true)

      // Profile & settings
      expect(execPerms.has(Permission.PROFILE_VIEW)).toBe(true)
      expect(execPerms.has(Permission.PROFILE_UPDATE)).toBe(true)
      expect(execPerms.has(Permission.SETTINGS_VIEW)).toBe(true)
      expect(execPerms.has(Permission.SETTINGS_UPDATE)).toBe(true)
    })

    it('should NOT have any create/update/delete permissions on core modules', () => {
      expect(execPerms.has(Permission.ALERTS_INVESTIGATE)).toBe(false)
      expect(execPerms.has(Permission.ALERTS_ACKNOWLEDGE)).toBe(false)
      expect(execPerms.has(Permission.ALERTS_CLOSE)).toBe(false)
      expect(execPerms.has(Permission.CASES_CREATE)).toBe(false)
      expect(execPerms.has(Permission.CASES_UPDATE)).toBe(false)
      expect(execPerms.has(Permission.CASES_DELETE)).toBe(false)
      expect(execPerms.has(Permission.INCIDENTS_CREATE)).toBe(false)
      expect(execPerms.has(Permission.INCIDENTS_UPDATE)).toBe(false)
      expect(execPerms.has(Permission.INCIDENTS_DELETE)).toBe(false)
    })

    it('should NOT have hunt, connectors, or admin permissions', () => {
      expect(execPerms.has(Permission.HUNT_VIEW)).toBe(false)
      expect(execPerms.has(Permission.CONNECTORS_VIEW)).toBe(false)
      expect(execPerms.has(Permission.ADMIN_USERS_VIEW)).toBe(false)
      expect(execPerms.has(Permission.ADMIN_TENANTS_VIEW)).toBe(false)
    })

    it('should NOT have role settings permissions', () => {
      expect(execPerms.has(Permission.ROLE_SETTINGS_VIEW)).toBe(false)
      expect(execPerms.has(Permission.ROLE_SETTINGS_UPDATE)).toBe(false)
    })
  })

  /* ---------------------------------------------------------------- */
  /* All roles have DASHBOARD_VIEW                                      */
  /* ---------------------------------------------------------------- */

  describe('All roles have DASHBOARD_VIEW', () => {
    it.each(CONFIGURABLE_ROLES)('%s should have DASHBOARD_VIEW', role => {
      const perms = DEFAULT_PERMISSIONS[role] ?? []
      expect(perms).toContain(Permission.DASHBOARD_VIEW)
    })
  })

  /* ---------------------------------------------------------------- */
  /* All roles have PROFILE_VIEW and SETTINGS_VIEW                      */
  /* ---------------------------------------------------------------- */

  describe('All roles have profile and settings access', () => {
    it.each(CONFIGURABLE_ROLES)('%s should have PROFILE_VIEW', role => {
      const perms = DEFAULT_PERMISSIONS[role] ?? []
      expect(perms).toContain(Permission.PROFILE_VIEW)
    })

    it.each(CONFIGURABLE_ROLES)('%s should have SETTINGS_VIEW', role => {
      const perms = DEFAULT_PERMISSIONS[role] ?? []
      expect(perms).toContain(Permission.SETTINGS_VIEW)
    })
  })

  /* ---------------------------------------------------------------- */
  /* CONFIGURABLE_ROLES excludes GLOBAL_ADMIN                           */
  /* ---------------------------------------------------------------- */

  it('should not include GLOBAL_ADMIN in CONFIGURABLE_ROLES', () => {
    expect(CONFIGURABLE_ROLES).not.toContain(UserRole.GLOBAL_ADMIN)
  })

  it('should include all non-GLOBAL_ADMIN roles in CONFIGURABLE_ROLES', () => {
    const expectedRoles = [
      UserRole.PLATFORM_OPERATOR,
      UserRole.TENANT_ADMIN,
      UserRole.DETECTION_ENGINEER,
      UserRole.INCIDENT_RESPONDER,
      UserRole.THREAT_INTEL_ANALYST,
      UserRole.SOAR_ENGINEER,
      UserRole.THREAT_HUNTER,
      UserRole.SOC_ANALYST_L2,
      UserRole.SOC_ANALYST_L1,
      UserRole.EXECUTIVE_READONLY,
      UserRole.AUDITOR_READONLY,
    ]

    for (const role of expectedRoles) {
      expect(CONFIGURABLE_ROLES).toContain(role)
    }
  })

  /* ---------------------------------------------------------------- */
  /* No role has duplicate permissions                                  */
  /* ---------------------------------------------------------------- */

  describe('No duplicate permissions within any role', () => {
    it.each(CONFIGURABLE_ROLES)('%s should have no duplicate permissions', role => {
      const perms = DEFAULT_PERMISSIONS[role] ?? []
      const uniquePerms = new Set(perms)
      expect(uniquePerms.size).toBe(perms.length)
    })
  })

  /* ---------------------------------------------------------------- */
  /* All default permissions are valid enum values                      */
  /* ---------------------------------------------------------------- */

  describe('All default permission values are valid Permission enum members', () => {
    const allPermissionSet = new Set<string>(ALL_PERMISSIONS)

    it.each(CONFIGURABLE_ROLES)('%s should only contain valid Permission values', role => {
      const perms = DEFAULT_PERMISSIONS[role] ?? []
      for (const perm of perms) {
        expect(allPermissionSet.has(perm)).toBe(true)
      }
    })
  })
})
