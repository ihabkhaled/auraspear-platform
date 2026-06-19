import { Permission, UserRole } from '@/enums'
import {
  USERS_CONTROL_ADMIN_ROLES,
  USERS_CONTROL_PERMISSION_KEYS,
} from '@/lib/constants/users-control'
import type { PermissionGroup } from '@/types'

export const ROLE_SETTINGS_MODULE_KEY = 'roleSettings'
export const USERS_CONTROL_MODULE_KEY = 'usersControl'

const PROTECTED_ROLE_SETTINGS_PERMISSIONS = new Set<string>([
  Permission.ROLE_SETTINGS_VIEW,
  Permission.ROLE_SETTINGS_UPDATE,
  ...USERS_CONTROL_PERMISSION_KEYS,
])

export function isTenantAdminRole(role: UserRole | null | undefined): boolean {
  return role === UserRole.TENANT_ADMIN
}

export function filterRoleSettingsPermissionGroups(
  permissionGroups: PermissionGroup[],
  actorRole: UserRole | null | undefined
): PermissionGroup[] {
  if (!isTenantAdminRole(actorRole)) {
    return permissionGroups
  }

  return permissionGroups.filter(group => group.key !== ROLE_SETTINGS_MODULE_KEY)
}

export function canResetRoleSettings(
  actorRole: UserRole | null | undefined,
  canEditRoles: boolean
): boolean {
  return canEditRoles && !isTenantAdminRole(actorRole)
}

export function canToggleRoleSettingsPermission(
  actorRole: UserRole | null | undefined,
  permission: string
): boolean {
  if (!isTenantAdminRole(actorRole)) {
    return true
  }

  return !PROTECTED_ROLE_SETTINGS_PERMISSIONS.has(permission)
}

export function canAssignRoleSettingsPermission(role: string, permission: string): boolean {
  if (!USERS_CONTROL_PERMISSION_KEYS.has(permission)) {
    return true
  }

  return USERS_CONTROL_ADMIN_ROLES.includes(role as UserRole)
}

export function isRoleSettingsToggleDisabled(
  actorRole: UserRole | null | undefined,
  role: string,
  permission: string
): boolean {
  return (
    !canToggleRoleSettingsPermission(actorRole, permission) ||
    !canAssignRoleSettingsPermission(role, permission)
  )
}
