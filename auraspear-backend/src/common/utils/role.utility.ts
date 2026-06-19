import { ROLE_HIERARCHY } from '../interfaces/authenticated-request.interface'
import type { UserRole } from '../interfaces/authenticated-request.interface'

/**
 * Check if `userRole` has at least the privilege of `requiredRole`.
 * Returns true if user's role is equal or higher in hierarchy.
 */
export function hasRoleAtLeast(userRole: UserRole, requiredRole: UserRole): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole)
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole)

  if (userIndex === -1 || requiredIndex === -1) {
    return false
  }

  return userIndex <= requiredIndex
}
