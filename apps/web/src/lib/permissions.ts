import { type Permission } from '@/enums'
import { ROUTE_PERMISSION_MAP } from '@/lib/constants/route-permissions'
import { USERS_CONTROL_ROUTE } from '@/lib/constants/users-control'

const PERMISSION_FALLBACK_ROUTE_ORDER = [
  '/dashboard',
  '/alerts',
  '/incidents',
  '/cases',
  '/explorer',
  '/hunt',
  '/knowledge',
  '/intel',
  '/connectors',
  '/system-health',
  '/jobs',
  '/reports',
  '/compliance',
  '/admin/tenant',
  '/admin/system',
  '/admin/role-settings',
  USERS_CONTROL_ROUTE,
  '/profile',
  '/settings',
] as const

export class PermissionError extends Error {
  readonly messageKey = 'errors.auth.insufficientPermissions'

  constructor(requiredPermission: Permission) {
    super(`Insufficient permissions: requires ${requiredPermission}`)
    this.name = 'PermissionError'
  }
}

export function hasPermission(permissions: string[], required: Permission): boolean {
  return permissions.includes(required)
}

export function hasAnyPermission(permissions: string[], required: Permission[]): boolean {
  return required.some(p => permissions.includes(p))
}

export function requirePermission(permissions: string[], required: Permission): void {
  if (!permissions.includes(required)) {
    throw new PermissionError(required)
  }
}

export function filterAccessibleItemsByRoute<T>(
  permissions: string[],
  items: readonly T[],
  getRoute: (item: T) => string | null | undefined
): T[] {
  return items.filter(item => {
    const route = getRoute(item)
    if (!route) {
      return true
    }
    return canAccessRouteByPermission(permissions, route)
  })
}

/**
 * Check if a user with the given permissions can access the given pathname.
 * Uses the dynamic permission system instead of static role hierarchy.
 * Routes not listed in ROUTE_PERMISSION_MAP are accessible to all authenticated users.
 */
export function canAccessRouteByPermission(permissions: string[], pathname: string): boolean {
  for (const [route, requiredPermission] of ROUTE_PERMISSION_MAP) {
    if (pathname.startsWith(route)) {
      return permissions.includes(requiredPermission)
    }
  }
  return true
}

export function getFirstAccessibleRoute(permissions: string[]): string | null {
  for (const route of PERMISSION_FALLBACK_ROUTE_ORDER) {
    if (canAccessRouteByPermission(permissions, route)) {
      return route
    }
  }

  for (const [route] of ROUTE_PERMISSION_MAP) {
    if (canAccessRouteByPermission(permissions, route)) {
      return route
    }
  }

  return null
}
