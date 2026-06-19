import { describe, it, expect } from 'vitest'
import { Permission } from '@/enums'
import {
  hasPermission,
  hasAnyPermission,
  requirePermission,
  PermissionError,
  filterAccessibleItemsByRoute,
  getFirstAccessibleRoute,
} from '@/lib/permissions'

// ─── hasPermission ──────────────────────────────────────────────

describe('hasPermission', () => {
  const permissions = [Permission.ALERTS_VIEW, Permission.ALERTS_INVESTIGATE, Permission.CASES_VIEW]

  it('returns true when the permission exists in the array', () => {
    expect(hasPermission(permissions, Permission.ALERTS_VIEW)).toBe(true)
    expect(hasPermission(permissions, Permission.ALERTS_INVESTIGATE)).toBe(true)
    expect(hasPermission(permissions, Permission.CASES_VIEW)).toBe(true)
  })

  it('returns false when the permission is missing', () => {
    expect(hasPermission(permissions, Permission.ALERTS_CLOSE)).toBe(false)
    expect(hasPermission(permissions, Permission.ADMIN_USERS_VIEW)).toBe(false)
    expect(hasPermission(permissions, Permission.HUNT_EXECUTE)).toBe(false)
  })

  it('returns false for an empty permissions array', () => {
    expect(hasPermission([], Permission.ALERTS_VIEW)).toBe(false)
  })

  it('works with a single-element array', () => {
    expect(hasPermission([Permission.DASHBOARD_VIEW], Permission.DASHBOARD_VIEW)).toBe(true)
    expect(hasPermission([Permission.DASHBOARD_VIEW], Permission.ALERTS_VIEW)).toBe(false)
  })
})

// ─── hasAnyPermission ───────────────────────────────────────────

describe('hasAnyPermission', () => {
  const permissions = [Permission.ALERTS_VIEW, Permission.ALERTS_ACKNOWLEDGE, Permission.CASES_VIEW]

  it('returns true when at least one required permission matches', () => {
    expect(hasAnyPermission(permissions, [Permission.ALERTS_VIEW, Permission.HUNT_CREATE])).toBe(
      true
    )
  })

  it('returns true when all required permissions match', () => {
    expect(hasAnyPermission(permissions, [Permission.ALERTS_VIEW, Permission.CASES_VIEW])).toBe(
      true
    )
  })

  it('returns false when none of the required permissions match', () => {
    expect(
      hasAnyPermission(permissions, [Permission.HUNT_CREATE, Permission.ADMIN_USERS_DELETE])
    ).toBe(false)
  })

  it('returns false when the required array is empty', () => {
    expect(hasAnyPermission(permissions, [])).toBe(false)
  })

  it('returns false when the permissions array is empty', () => {
    expect(hasAnyPermission([], [Permission.ALERTS_VIEW])).toBe(false)
  })

  it('returns false when both arrays are empty', () => {
    expect(hasAnyPermission([], [])).toBe(false)
  })
})

// ─── requirePermission ──────────────────────────────────────────

describe('requirePermission', () => {
  const permissions = [Permission.ALERTS_VIEW, Permission.CASES_CREATE]

  it('does not throw when the permission is present', () => {
    expect(() => requirePermission(permissions, Permission.ALERTS_VIEW)).not.toThrow()
    expect(() => requirePermission(permissions, Permission.CASES_CREATE)).not.toThrow()
  })

  it('throws PermissionError when the permission is missing', () => {
    expect(() => requirePermission(permissions, Permission.ALERTS_CLOSE)).toThrow(PermissionError)
  })

  it('thrown error has correct name', () => {
    try {
      requirePermission(permissions, Permission.HUNT_EXECUTE)
      expect.fail('should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(PermissionError)
      expect((error as PermissionError).name).toBe('PermissionError')
    }
  })

  it('thrown error has correct messageKey', () => {
    try {
      requirePermission(permissions, Permission.ADMIN_USERS_VIEW)
      expect.fail('should have thrown')
    } catch (error) {
      expect((error as PermissionError).messageKey).toBe('errors.auth.insufficientPermissions')
    }
  })

  it('thrown error message includes the required permission', () => {
    try {
      requirePermission(permissions, Permission.CONNECTORS_DELETE)
      expect.fail('should have thrown')
    } catch (error) {
      expect((error as Error).message).toContain(Permission.CONNECTORS_DELETE)
    }
  })

  it('throws when permissions array is empty', () => {
    expect(() => requirePermission([], Permission.ALERTS_VIEW)).toThrow(PermissionError)
  })
})

// ─── PermissionError ────────────────────────────────────────────

describe('PermissionError', () => {
  it('is an instance of Error', () => {
    const error = new PermissionError(Permission.ALERTS_VIEW)
    expect(error).toBeInstanceOf(Error)
  })

  it('has name set to PermissionError', () => {
    const error = new PermissionError(Permission.ALERTS_VIEW)
    expect(error.name).toBe('PermissionError')
  })

  it('has the standard messageKey for i18n', () => {
    const error = new PermissionError(Permission.CASES_DELETE)
    expect(error.messageKey).toBe('errors.auth.insufficientPermissions')
  })

  it('includes the required permission in the error message', () => {
    const error = new PermissionError(Permission.HUNT_EXECUTE)
    expect(error.message).toContain(Permission.HUNT_EXECUTE)
  })
})

describe('filterAccessibleItemsByRoute', () => {
  const items = [
    { key: 'dashboard', href: '/dashboard' },
    { key: 'alerts', href: '/alerts?timeRange=7d' },
    { key: 'attackPaths', href: '/attack-paths' },
    { key: 'pipelineHealth', href: '/system-health' },
    { key: 'alwaysVisible', href: undefined },
  ]

  it('keeps only routes the current permission set can access', () => {
    const result = filterAccessibleItemsByRoute(
      [Permission.DASHBOARD_VIEW, Permission.ALERTS_VIEW],
      items,
      item => item.href
    )

    expect(result).toEqual([
      { key: 'dashboard', href: '/dashboard' },
      { key: 'alerts', href: '/alerts?timeRange=7d' },
      { key: 'alwaysVisible', href: undefined },
    ])
  })

  it('supports module routes that use the same permission as their destination page', () => {
    const result = filterAccessibleItemsByRoute(
      [Permission.ATTACK_PATHS_VIEW, Permission.SYSTEM_HEALTH_VIEW],
      items,
      item => item.href
    )

    expect(result).toEqual([
      { key: 'attackPaths', href: '/attack-paths' },
      { key: 'pipelineHealth', href: '/system-health' },
      { key: 'alwaysVisible', href: undefined },
    ])
  })
})

describe('getFirstAccessibleRoute', () => {
  it('returns the first mapped route the permission set can access', () => {
    expect(getFirstAccessibleRoute([Permission.DASHBOARD_VIEW, Permission.ALERTS_VIEW])).toBe(
      '/dashboard'
    )
  })

  it('returns null when the permission set cannot access any mapped route', () => {
    expect(getFirstAccessibleRoute([])).toBeNull()
  })
})
