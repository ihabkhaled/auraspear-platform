import { ALL_PERMISSIONS, Permission } from '../../src/common/enums/permission.enum'
import { UserRole } from '../../src/common/interfaces/authenticated-request.interface'
import {
  CONFIGURABLE_ROLES,
  DEFAULT_PERMISSIONS,
} from '../../src/modules/role-settings/constants/default-permissions'

/**
 * Route access validation tests.
 *
 * Verifies that every role's default permission set aligns with its
 * intended access level — no role has more access than it should,
 * and critical boundaries are enforced.
 */
describe('Route Access Validation', () => {
  /* ---------------------------------------------------------------- */
  /* GLOBAL_ADMIN should NOT appear in CONFIGURABLE_ROLES              */
  /* ---------------------------------------------------------------- */

  it('GLOBAL_ADMIN is excluded from configurable roles', () => {
    expect(CONFIGURABLE_ROLES).not.toContain(UserRole.GLOBAL_ADMIN)
  })

  /* ---------------------------------------------------------------- */
  /* All 11 configurable roles must be present                         */
  /* ---------------------------------------------------------------- */

  it('should have exactly 11 configurable roles', () => {
    expect(CONFIGURABLE_ROLES).toHaveLength(11)
  })

  it.each([
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
  ])('%s should be in CONFIGURABLE_ROLES', role => {
    expect(CONFIGURABLE_ROLES).toContain(role)
  })

  /* ---------------------------------------------------------------- */
  /* Every permission in the matrix must be a valid Permission enum     */
  /* ---------------------------------------------------------------- */

  describe('All default permissions are valid enum values', () => {
    const allPermissionSet = new Set<string>(ALL_PERMISSIONS)

    it.each(CONFIGURABLE_ROLES)('%s should only contain valid Permission values', role => {
      const perms = DEFAULT_PERMISSIONS[role] ?? []
      for (const perm of perms) {
        expect(allPermissionSet.has(perm)).toBe(true)
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /* No duplicate permissions within any role                          */
  /* ---------------------------------------------------------------- */

  describe('No duplicate permissions within any role', () => {
    it.each(CONFIGURABLE_ROLES)('%s should have no duplicate permissions', role => {
      const perms = DEFAULT_PERMISSIONS[role] ?? []
      const uniquePerms = new Set(perms)
      expect(uniquePerms.size).toBe(perms.length)
    })
  })

  /* ---------------------------------------------------------------- */
  /* Universal permissions: all roles must have these                   */
  /* ---------------------------------------------------------------- */

  const universalPermissions = [
    Permission.DASHBOARD_VIEW,
    Permission.PROFILE_VIEW,
    Permission.PROFILE_UPDATE,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_UPDATE,
    Permission.NOTIFICATIONS_VIEW,
  ]

  describe('Universal permissions present for all roles', () => {
    for (const perm of universalPermissions) {
      it.each(CONFIGURABLE_ROLES)(`%s should have ${perm}`, role => {
        const perms = DEFAULT_PERMISSIONS[role] ?? []
        expect(perms).toContain(perm)
      })
    }
  })

  /* ---------------------------------------------------------------- */
  /* Admin boundaries                                                   */
  /* ---------------------------------------------------------------- */

  describe('Admin boundary enforcement', () => {
    const nonAdminRoles = [
      UserRole.DETECTION_ENGINEER,
      UserRole.INCIDENT_RESPONDER,
      UserRole.THREAT_INTEL_ANALYST,
      UserRole.SOAR_ENGINEER,
      UserRole.THREAT_HUNTER,
      UserRole.SOC_ANALYST_L2,
      UserRole.SOC_ANALYST_L1,
      UserRole.EXECUTIVE_READONLY,
    ]

    it.each(nonAdminRoles)('%s should NOT have ADMIN_USERS_CREATE', role => {
      const perms = new Set(DEFAULT_PERMISSIONS[role] ?? [])
      expect(perms.has(Permission.ADMIN_USERS_CREATE)).toBe(false)
    })

    it.each(nonAdminRoles)('%s should NOT have ADMIN_USERS_DELETE', role => {
      const perms = new Set(DEFAULT_PERMISSIONS[role] ?? [])
      expect(perms.has(Permission.ADMIN_USERS_DELETE)).toBe(false)
    })

    it('TENANT_ADMIN should have full ADMIN_USERS permissions', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.TENANT_ADMIN])
      expect(perms.has(Permission.ADMIN_USERS_VIEW)).toBe(true)
      expect(perms.has(Permission.ADMIN_USERS_CREATE)).toBe(true)
      expect(perms.has(Permission.ADMIN_USERS_UPDATE)).toBe(true)
      expect(perms.has(Permission.ADMIN_USERS_DELETE)).toBe(true)
      expect(perms.has(Permission.ADMIN_USERS_BLOCK)).toBe(true)
      expect(perms.has(Permission.ADMIN_USERS_RESTORE)).toBe(true)
    })

    it('No configurable role should have ADMIN_TENANTS_CREATE/UPDATE/DELETE', () => {
      for (const role of CONFIGURABLE_ROLES) {
        const perms = new Set(DEFAULT_PERMISSIONS[role] ?? [])
        expect(perms.has(Permission.ADMIN_TENANTS_CREATE)).toBe(false)
        expect(perms.has(Permission.ADMIN_TENANTS_UPDATE)).toBe(false)
        expect(perms.has(Permission.ADMIN_TENANTS_DELETE)).toBe(false)
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /* Read-only roles must not have write permissions                    */
  /* ---------------------------------------------------------------- */

  describe('Read-only role boundaries', () => {
    const writeSuffixes = [
      '.create', '.update', '.delete', '.execute', '.toggle', '.sync',
      '.test', '.manage', '.assign', '.block', '.restore',
      '.addComment', '.deleteComment', '.addTask', '.updateTask',
      '.deleteTask', '.addArtifact', '.deleteArtifact', '.addTimeline',
      '.changeStatus', '.investigate', '.acknowledge', '.close', '.escalate',
    ]

    const writePermissions = ALL_PERMISSIONS.filter(p =>
      writeSuffixes.some(suffix => p.includes(suffix))
    )

    // Exclude profile.update and settings.update from write check — these are universal
    const filteredWritePerms = writePermissions.filter(
      p => p !== Permission.PROFILE_UPDATE && p !== Permission.SETTINGS_UPDATE
    )

    it('EXECUTIVE_READONLY should have no write permissions (except profile/settings)', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.EXECUTIVE_READONLY] ?? [])
      for (const writePerm of filteredWritePerms) {
        if (writePerm === Permission.REPORTS_EXPORT) continue // export is allowed
        expect(perms.has(writePerm as Permission)).toBe(false)
      }
    })

    it('AUDITOR_READONLY should have no write permissions (except profile/settings)', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.AUDITOR_READONLY] ?? [])
      for (const writePerm of filteredWritePerms) {
        if (writePerm === Permission.REPORTS_EXPORT) continue // export is allowed
        if (writePerm === Permission.EXPLORER_QUERY) continue // query is allowed for audit
        expect(perms.has(writePerm as Permission)).toBe(false)
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /* SOC Analyst hierarchy: L2 > L1                                    */
  /* ---------------------------------------------------------------- */

  describe('SOC Analyst hierarchy', () => {
    it('SOC_ANALYST_L2 should be a superset of SOC_ANALYST_L1 permissions', () => {
      const l1Perms = new Set(DEFAULT_PERMISSIONS[UserRole.SOC_ANALYST_L1] ?? [])
      const l2Perms = new Set(DEFAULT_PERMISSIONS[UserRole.SOC_ANALYST_L2] ?? [])

      for (const perm of l1Perms) {
        expect(l2Perms.has(perm)).toBe(true)
      }
    })

    it('SOC_ANALYST_L2 should have more permissions than L1', () => {
      const l1Count = (DEFAULT_PERMISSIONS[UserRole.SOC_ANALYST_L1] ?? []).length
      const l2Count = (DEFAULT_PERMISSIONS[UserRole.SOC_ANALYST_L2] ?? []).length
      expect(l2Count).toBeGreaterThan(l1Count)
    })

    it('SOC_ANALYST_L1 should NOT have alerts.investigate', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.SOC_ANALYST_L1] ?? [])
      expect(perms.has(Permission.ALERTS_INVESTIGATE)).toBe(false)
    })

    it('SOC_ANALYST_L2 should have alerts.investigate', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.SOC_ANALYST_L2] ?? [])
      expect(perms.has(Permission.ALERTS_INVESTIGATE)).toBe(true)
    })
  })

  /* ---------------------------------------------------------------- */
  /* Role-specific domain ownership                                    */
  /* ---------------------------------------------------------------- */

  describe('Role-specific domain ownership', () => {
    it('DETECTION_ENGINEER should have full detection rules + correlation CRUD', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.DETECTION_ENGINEER] ?? [])
      expect(perms.has(Permission.DETECTION_RULES_VIEW)).toBe(true)
      expect(perms.has(Permission.DETECTION_RULES_CREATE)).toBe(true)
      expect(perms.has(Permission.DETECTION_RULES_UPDATE)).toBe(true)
      expect(perms.has(Permission.DETECTION_RULES_DELETE)).toBe(true)
      expect(perms.has(Permission.DETECTION_RULES_TOGGLE)).toBe(true)
      expect(perms.has(Permission.CORRELATION_VIEW)).toBe(true)
      expect(perms.has(Permission.CORRELATION_CREATE)).toBe(true)
      expect(perms.has(Permission.CORRELATION_UPDATE)).toBe(true)
      expect(perms.has(Permission.CORRELATION_DELETE)).toBe(true)
      expect(perms.has(Permission.CORRELATION_TOGGLE)).toBe(true)
    })

    it('THREAT_HUNTER should have full hunt CRUD', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.THREAT_HUNTER] ?? [])
      expect(perms.has(Permission.HUNT_VIEW)).toBe(true)
      expect(perms.has(Permission.HUNT_CREATE)).toBe(true)
      expect(perms.has(Permission.HUNT_UPDATE)).toBe(true)
      expect(perms.has(Permission.HUNT_DELETE)).toBe(true)
      expect(perms.has(Permission.HUNT_EXECUTE)).toBe(true)
    })

    it('SOAR_ENGINEER should have full SOAR + AI agents CRUD', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.SOAR_ENGINEER] ?? [])
      expect(perms.has(Permission.SOAR_VIEW)).toBe(true)
      expect(perms.has(Permission.SOAR_CREATE)).toBe(true)
      expect(perms.has(Permission.SOAR_UPDATE)).toBe(true)
      expect(perms.has(Permission.SOAR_DELETE)).toBe(true)
      expect(perms.has(Permission.SOAR_EXECUTE)).toBe(true)
      expect(perms.has(Permission.AI_AGENTS_VIEW)).toBe(true)
      expect(perms.has(Permission.AI_AGENTS_CREATE)).toBe(true)
      expect(perms.has(Permission.AI_AGENTS_UPDATE)).toBe(true)
      expect(perms.has(Permission.AI_AGENTS_DELETE)).toBe(true)
    })

    it('INCIDENT_RESPONDER should have full cases + incidents CRUD', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.INCIDENT_RESPONDER] ?? [])
      expect(perms.has(Permission.CASES_VIEW)).toBe(true)
      expect(perms.has(Permission.CASES_CREATE)).toBe(true)
      expect(perms.has(Permission.CASES_UPDATE)).toBe(true)
      expect(perms.has(Permission.CASES_DELETE)).toBe(true)
      expect(perms.has(Permission.INCIDENTS_VIEW)).toBe(true)
      expect(perms.has(Permission.INCIDENTS_CREATE)).toBe(true)
      expect(perms.has(Permission.INCIDENTS_UPDATE)).toBe(true)
      expect(perms.has(Permission.INCIDENTS_DELETE)).toBe(true)
    })

    it('incident status changes should be granted only to operator roles that handle incidents', () => {
      const allowedRoles = new Set<string>([
        UserRole.TENANT_ADMIN,
        UserRole.INCIDENT_RESPONDER,
        UserRole.SOC_ANALYST_L2,
      ])

      for (const role of CONFIGURABLE_ROLES) {
        const permissions = new Set(DEFAULT_PERMISSIONS[role] ?? [])
        expect(permissions.has(Permission.INCIDENTS_CHANGE_STATUS)).toBe(allowedRoles.has(role))
      }
    })

    it('PLATFORM_OPERATOR should have full connectors CRUD but no SOC data write', () => {
      const perms = new Set(DEFAULT_PERMISSIONS[UserRole.PLATFORM_OPERATOR] ?? [])
      expect(perms.has(Permission.CONNECTORS_VIEW)).toBe(true)
      expect(perms.has(Permission.CONNECTORS_CREATE)).toBe(true)
      expect(perms.has(Permission.CONNECTORS_UPDATE)).toBe(true)
      expect(perms.has(Permission.CONNECTORS_DELETE)).toBe(true)
      expect(perms.has(Permission.CONNECTORS_TEST)).toBe(true)
      expect(perms.has(Permission.CONNECTORS_SYNC)).toBe(true)
      // No SOC data write
      expect(perms.has(Permission.ALERTS_INVESTIGATE)).toBe(false)
      expect(perms.has(Permission.CASES_CREATE)).toBe(false)
      expect(perms.has(Permission.INCIDENTS_CREATE)).toBe(false)
    })

    it('ROLE_SETTINGS_UPDATE should only be held by TENANT_ADMIN', () => {
      for (const role of CONFIGURABLE_ROLES) {
        const perms = new Set(DEFAULT_PERMISSIONS[role] ?? [])
        if (role === UserRole.TENANT_ADMIN) {
          expect(perms.has(Permission.ROLE_SETTINGS_UPDATE)).toBe(true)
        } else if (role === UserRole.AUDITOR_READONLY) {
          // Auditor can view but not update
          expect(perms.has(Permission.ROLE_SETTINGS_VIEW)).toBe(true)
          expect(perms.has(Permission.ROLE_SETTINGS_UPDATE)).toBe(false)
        } else {
          expect(perms.has(Permission.ROLE_SETTINGS_UPDATE)).toBe(false)
        }
      }
    })
  })

  /* ---------------------------------------------------------------- */
  /* Permission count sanity checks                                    */
  /* ---------------------------------------------------------------- */

  describe('Permission count sanity checks', () => {
    it('TENANT_ADMIN should have the most permissions (highest privilege configurable role)', () => {
      const tenantAdminCount = (DEFAULT_PERMISSIONS[UserRole.TENANT_ADMIN] ?? []).length
      for (const role of CONFIGURABLE_ROLES) {
        if (role === UserRole.TENANT_ADMIN) continue
        const roleCount = (DEFAULT_PERMISSIONS[role] ?? []).length
        expect(tenantAdminCount).toBeGreaterThanOrEqual(roleCount)
      }
    })

    it('EXECUTIVE_READONLY should have the fewest permissions', () => {
      const execCount = (DEFAULT_PERMISSIONS[UserRole.EXECUTIVE_READONLY] ?? []).length
      for (const role of CONFIGURABLE_ROLES) {
        if (role === UserRole.EXECUTIVE_READONLY) continue
        const roleCount = (DEFAULT_PERMISSIONS[role] ?? []).length
        expect(roleCount).toBeGreaterThanOrEqual(execCount)
      }
    })
  })
})
