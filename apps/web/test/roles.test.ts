import { describe, it, expect } from 'vitest'
import { Permission, UserRole } from '@/enums'
import { ROUTE_PERMISSION_MAP } from '@/lib/constants/route-permissions'
import { canAccessRouteByPermission } from '@/lib/permissions'
import { ROLE_HIERARCHY, hasRole } from '@/lib/roles'

// ─── ROLE_HIERARCHY ──────────────────────────────────────────────

describe('ROLE_HIERARCHY', () => {
  it('should have GLOBAL_ADMIN at index 0 (most privileged)', () => {
    expect(ROLE_HIERARCHY[0]).toBe(UserRole.GLOBAL_ADMIN)
  })

  it('should have AUDITOR_READONLY at last index (least privileged)', () => {
    expect(ROLE_HIERARCHY[ROLE_HIERARCHY.length - 1]).toBe(UserRole.AUDITOR_READONLY)
  })

  it('should contain all UserRole enum values', () => {
    const allRoles = Object.values(UserRole)
    for (const role of allRoles) {
      expect(ROLE_HIERARCHY).toContain(role)
    }
  })

  it('should have no duplicate entries', () => {
    const unique = new Set(ROLE_HIERARCHY)
    expect(unique.size).toBe(ROLE_HIERARCHY.length)
  })

  it('should order TENANT_ADMIN above SOC_ANALYST_L2', () => {
    const adminIdx = ROLE_HIERARCHY.indexOf(UserRole.TENANT_ADMIN)
    const l2Idx = ROLE_HIERARCHY.indexOf(UserRole.SOC_ANALYST_L2)
    expect(adminIdx).toBeLessThan(l2Idx)
  })
})

// ─── hasRole ─────────────────────────────────────────────────────

describe('hasRole', () => {
  it('should return true when user role matches required role exactly', () => {
    expect(hasRole(UserRole.SOC_ANALYST_L1, UserRole.SOC_ANALYST_L1)).toBe(true)
  })

  it('should return true when user role is more privileged than required', () => {
    expect(hasRole(UserRole.GLOBAL_ADMIN, UserRole.SOC_ANALYST_L1)).toBe(true)
    expect(hasRole(UserRole.TENANT_ADMIN, UserRole.SOC_ANALYST_L2)).toBe(true)
    expect(hasRole(UserRole.GLOBAL_ADMIN, UserRole.EXECUTIVE_READONLY)).toBe(true)
  })

  it('should return false when user role is less privileged than required', () => {
    expect(hasRole(UserRole.SOC_ANALYST_L1, UserRole.TENANT_ADMIN)).toBe(false)
    expect(hasRole(UserRole.EXECUTIVE_READONLY, UserRole.SOC_ANALYST_L1)).toBe(false)
    expect(hasRole(UserRole.SOC_ANALYST_L2, UserRole.TENANT_ADMIN)).toBe(false)
  })

  it('should return false for unknown roles', () => {
    expect(hasRole('UNKNOWN_ROLE' as UserRole, UserRole.SOC_ANALYST_L1)).toBe(false)
    expect(hasRole(UserRole.SOC_ANALYST_L1, 'UNKNOWN_ROLE' as UserRole)).toBe(false)
  })

  it('GLOBAL_ADMIN should have access to every role level', () => {
    for (const role of ROLE_HIERARCHY) {
      expect(hasRole(UserRole.GLOBAL_ADMIN, role)).toBe(true)
    }
  })

  it('EXECUTIVE_READONLY should only have access to EXECUTIVE_READONLY and AUDITOR_READONLY', () => {
    expect(hasRole(UserRole.EXECUTIVE_READONLY, UserRole.EXECUTIVE_READONLY)).toBe(true)
    expect(hasRole(UserRole.EXECUTIVE_READONLY, UserRole.AUDITOR_READONLY)).toBe(true)
    expect(hasRole(UserRole.EXECUTIVE_READONLY, UserRole.SOC_ANALYST_L1)).toBe(false)
    expect(hasRole(UserRole.EXECUTIVE_READONLY, UserRole.TENANT_ADMIN)).toBe(false)
  })

  it('AUDITOR_READONLY should only have access to AUDITOR_READONLY', () => {
    expect(hasRole(UserRole.AUDITOR_READONLY, UserRole.AUDITOR_READONLY)).toBe(true)
    expect(hasRole(UserRole.AUDITOR_READONLY, UserRole.EXECUTIVE_READONLY)).toBe(false)
    expect(hasRole(UserRole.AUDITOR_READONLY, UserRole.SOC_ANALYST_L1)).toBe(false)
    expect(hasRole(UserRole.AUDITOR_READONLY, UserRole.TENANT_ADMIN)).toBe(false)
  })
})

// ─── canAccessRouteByPermission ─────────────────────────────────

describe('canAccessRouteByPermission', () => {
  const ALL_PERMISSIONS = Object.values(Permission)

  describe('user with all permissions', () => {
    it('should access all mapped routes', () => {
      for (const [route] of ROUTE_PERMISSION_MAP) {
        expect(canAccessRouteByPermission(ALL_PERMISSIONS, route)).toBe(true)
      }
    })
  })

  describe('user with no permissions', () => {
    it('should NOT access any mapped routes', () => {
      for (const [route] of ROUTE_PERMISSION_MAP) {
        expect(canAccessRouteByPermission([], route)).toBe(false)
      }
    })

    it('should access unlisted routes', () => {
      expect(canAccessRouteByPermission([], '/unknown-route')).toBe(true)
    })
  })

  describe('user with only ALERTS_VIEW', () => {
    const perms = [Permission.ALERTS_VIEW]

    it('should access /alerts', () => {
      expect(canAccessRouteByPermission(perms, '/alerts')).toBe(true)
    })

    it('should access /alerts/123 (sub-route)', () => {
      expect(canAccessRouteByPermission(perms, '/alerts/123')).toBe(true)
    })

    it('should NOT access /cases', () => {
      expect(canAccessRouteByPermission(perms, '/cases')).toBe(false)
    })

    it('should NOT access /hunt', () => {
      expect(canAccessRouteByPermission(perms, '/hunt')).toBe(false)
    })

    it('should NOT access /admin/system', () => {
      expect(canAccessRouteByPermission(perms, '/admin/system')).toBe(false)
    })
  })

  describe('user with dashboard + profile + settings permissions', () => {
    const perms = [Permission.DASHBOARD_VIEW, Permission.PROFILE_VIEW, Permission.SETTINGS_VIEW]

    it('should access /dashboard', () => {
      expect(canAccessRouteByPermission(perms, '/dashboard')).toBe(true)
    })

    it('should access /profile', () => {
      expect(canAccessRouteByPermission(perms, '/profile')).toBe(true)
    })

    it('should access /settings', () => {
      expect(canAccessRouteByPermission(perms, '/settings')).toBe(true)
    })

    it('should NOT access /alerts', () => {
      expect(canAccessRouteByPermission(perms, '/alerts')).toBe(false)
    })

    it('should NOT access /admin/tenant', () => {
      expect(canAccessRouteByPermission(perms, '/admin/tenant')).toBe(false)
    })
  })

  describe('admin route permissions', () => {
    it('/admin/system requires ADMIN_TENANTS_VIEW', () => {
      expect(canAccessRouteByPermission([Permission.ADMIN_TENANTS_VIEW], '/admin/system')).toBe(
        true
      )
      expect(canAccessRouteByPermission([Permission.ADMIN_USERS_VIEW], '/admin/system')).toBe(false)
    })

    it('/admin/tenant requires ADMIN_USERS_VIEW', () => {
      expect(canAccessRouteByPermission([Permission.ADMIN_USERS_VIEW], '/admin/tenant')).toBe(true)
      expect(canAccessRouteByPermission([Permission.ALERTS_VIEW], '/admin/tenant')).toBe(false)
    })

    it('/admin/role-settings requires ROLE_SETTINGS_VIEW', () => {
      expect(
        canAccessRouteByPermission([Permission.ROLE_SETTINGS_VIEW], '/admin/role-settings')
      ).toBe(true)
      expect(
        canAccessRouteByPermission([Permission.ADMIN_USERS_VIEW], '/admin/role-settings')
      ).toBe(false)
    })

    it('/admin/users-control requires USERS_CONTROL_VIEW', () => {
      expect(
        canAccessRouteByPermission([Permission.USERS_CONTROL_VIEW], '/admin/users-control')
      ).toBe(true)
      expect(
        canAccessRouteByPermission([Permission.ROLE_SETTINGS_VIEW], '/admin/users-control')
      ).toBe(false)
    })
  })

  describe('sub-routes', () => {
    it('should match sub-routes via startsWith', () => {
      expect(canAccessRouteByPermission([Permission.ALERTS_VIEW], '/alerts/123')).toBe(true)
      expect(canAccessRouteByPermission([], '/alerts/123')).toBe(false)
    })
  })

  describe('unlisted routes', () => {
    it('should allow access to routes not in ROUTE_PERMISSION_MAP', () => {
      expect(canAccessRouteByPermission([], '/unknown-route')).toBe(true)
    })
  })
})

// ─── Impersonation role hierarchy checks ─────────────────────────

describe('Impersonation role hierarchy (client-side)', () => {
  /**
   * Mirrors the check in TenantUserTable: callerIndex < targetIndex
   * (strictly more privileged) to determine if impersonate button shows.
   */
  function canImpersonate(callerRole: UserRole, targetRole: UserRole): boolean {
    const callerIndex = ROLE_HIERARCHY.indexOf(callerRole)
    const targetIndex = ROLE_HIERARCHY.indexOf(targetRole)
    if (callerIndex === -1 || targetIndex === -1) {
      return false
    }
    return callerIndex < targetIndex
  }

  it('GLOBAL_ADMIN can impersonate TENANT_ADMIN', () => {
    expect(canImpersonate(UserRole.GLOBAL_ADMIN, UserRole.TENANT_ADMIN)).toBe(true)
  })

  it('GLOBAL_ADMIN can impersonate SOC_ANALYST_L1', () => {
    expect(canImpersonate(UserRole.GLOBAL_ADMIN, UserRole.SOC_ANALYST_L1)).toBe(true)
  })

  it('GLOBAL_ADMIN can impersonate EXECUTIVE_READONLY', () => {
    expect(canImpersonate(UserRole.GLOBAL_ADMIN, UserRole.EXECUTIVE_READONLY)).toBe(true)
  })

  it('TENANT_ADMIN can impersonate SOC_ANALYST_L2', () => {
    expect(canImpersonate(UserRole.TENANT_ADMIN, UserRole.SOC_ANALYST_L2)).toBe(true)
  })

  it('TENANT_ADMIN cannot impersonate GLOBAL_ADMIN', () => {
    expect(canImpersonate(UserRole.TENANT_ADMIN, UserRole.GLOBAL_ADMIN)).toBe(false)
  })

  it('TENANT_ADMIN cannot impersonate another TENANT_ADMIN', () => {
    expect(canImpersonate(UserRole.TENANT_ADMIN, UserRole.TENANT_ADMIN)).toBe(false)
  })

  it('SOC_ANALYST_L1 cannot impersonate anyone above or at same level', () => {
    expect(canImpersonate(UserRole.SOC_ANALYST_L1, UserRole.GLOBAL_ADMIN)).toBe(false)
    expect(canImpersonate(UserRole.SOC_ANALYST_L1, UserRole.TENANT_ADMIN)).toBe(false)
    expect(canImpersonate(UserRole.SOC_ANALYST_L1, UserRole.SOC_ANALYST_L1)).toBe(false)
  })

  it('SOC_ANALYST_L1 can impersonate EXECUTIVE_READONLY', () => {
    expect(canImpersonate(UserRole.SOC_ANALYST_L1, UserRole.EXECUTIVE_READONLY)).toBe(true)
  })

  it('SOC_ANALYST_L1 can impersonate AUDITOR_READONLY', () => {
    expect(canImpersonate(UserRole.SOC_ANALYST_L1, UserRole.AUDITOR_READONLY)).toBe(true)
  })

  it('EXECUTIVE_READONLY can impersonate AUDITOR_READONLY', () => {
    expect(canImpersonate(UserRole.EXECUTIVE_READONLY, UserRole.AUDITOR_READONLY)).toBe(true)
  })

  it('EXECUTIVE_READONLY cannot impersonate anyone above or at same level', () => {
    expect(canImpersonate(UserRole.EXECUTIVE_READONLY, UserRole.EXECUTIVE_READONLY)).toBe(false)
    expect(canImpersonate(UserRole.EXECUTIVE_READONLY, UserRole.SOC_ANALYST_L1)).toBe(false)
    expect(canImpersonate(UserRole.EXECUTIVE_READONLY, UserRole.GLOBAL_ADMIN)).toBe(false)
  })

  it('AUDITOR_READONLY cannot impersonate anyone', () => {
    for (const role of ROLE_HIERARCHY) {
      expect(canImpersonate(UserRole.AUDITOR_READONLY, role)).toBe(false)
    }
  })
})
