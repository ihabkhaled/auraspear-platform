import { CONFIGURABLE_ROLES, DEFAULT_PERMISSIONS } from './constants/default-permissions'
import { TENANT_ADMIN_PROTECTED_PERMISSIONS } from './constants/role-settings.constants'
import { ALL_PERMISSIONS } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { UserRole as UserRoleEnum } from '../../common/interfaces/authenticated-request.interface'
import {
  USERS_CONTROL_ASSIGNABLE_ROLES,
  USERS_CONTROL_PERMISSION_KEYS,
} from '../users-control/users-control.constants'
import type { UserRole } from '@prisma/client'

export function normalizePermissions(permissions: string[]): string[] {
  return [...permissions].sort((left, right) => left.localeCompare(right))
}

export function toPermissionMatrixMap(matrix: Record<string, string[]>): Map<string, string[]> {
  return new Map(Object.entries(matrix))
}

export function getImpactedRoles(
  currentMatrix: Record<string, string[]>,
  nextMatrix: Record<string, string[]>
): UserRole[] {
  const impactedRoles: UserRole[] = []
  const currentMatrixMap = toPermissionMatrixMap(currentMatrix)
  const nextMatrixMap = toPermissionMatrixMap(nextMatrix)

  for (const role of CONFIGURABLE_ROLES) {
    const currentPermissions = JSON.stringify(
      normalizePermissions(currentMatrixMap.get(role) ?? [])
    )
    const nextPermissions = JSON.stringify(normalizePermissions(nextMatrixMap.get(role) ?? []))

    if (currentPermissions !== nextPermissions) {
      impactedRoles.push(role as UserRole)
    }
  }

  return impactedRoles
}

export function buildDefaultAllowedPermissionEntries(): Array<{
  role: UserRole
  permissionKey: string
  allowed: boolean
}> {
  const entries: Array<{ role: UserRole; permissionKey: string; allowed: boolean }> = []

  for (const role of CONFIGURABLE_ROLES) {
    const permissions = (Reflect.get(DEFAULT_PERMISSIONS, role) as string[] | undefined) ?? []

    for (const permissionKey of permissions) {
      entries.push({
        role: role as UserRole,
        permissionKey,
        allowed: true,
      })
    }
  }

  return entries
}

export function assertProtectedRoleSettingsPermissionsUnchanged(
  currentMatrix: Record<string, string[]>,
  matrix: Record<string, string[]>,
  actorRole: string
): void {
  if (actorRole !== UserRoleEnum.TENANT_ADMIN) {
    return
  }

  const currentMatrixMap = toPermissionMatrixMap(currentMatrix)
  const requestedMatrixMap = toPermissionMatrixMap(matrix)

  for (const role of CONFIGURABLE_ROLES) {
    const currentPermissions = new Set(currentMatrixMap.get(role) ?? [])
    const requestedPermissions = new Set(requestedMatrixMap.get(role) ?? [])

    for (const permission of TENANT_ADMIN_PROTECTED_PERMISSIONS) {
      if (currentPermissions.has(permission) !== requestedPermissions.has(permission)) {
        throw new BusinessException(
          403,
          'Tenant admins cannot modify role settings permissions',
          'errors.auth.insufficientPermissions'
        )
      }
    }
  }
}

export function assertResetAllowed(actorRole: string): void {
  if (actorRole === UserRoleEnum.TENANT_ADMIN) {
    throw new BusinessException(
      403,
      'Tenant admins cannot reset role settings defaults',
      'errors.auth.insufficientPermissions'
    )
  }
}

export function assertUsersControlPermissionsRestrictedToAllowedRoles(
  matrix: Record<string, string[]>
): void {
  const requestedMatrixMap = toPermissionMatrixMap(matrix)
  const allowedRoles = new Set<string>(USERS_CONTROL_ASSIGNABLE_ROLES)

  for (const role of CONFIGURABLE_ROLES) {
    if (allowedRoles.has(role)) {
      continue
    }

    const requestedPermissions = new Set(requestedMatrixMap.get(role) ?? [])
    for (const permission of USERS_CONTROL_PERMISSION_KEYS) {
      if (requestedPermissions.has(permission)) {
        throw new BusinessException(
          400,
          'Users control permissions are restricted to global administrators or tenant administrators',
          'errors.roleSettings.usersControlRestrictedRole'
        )
      }
    }
  }
}

export function assertNoEscalation(
  matrix: Record<string, string[]>,
  actorPermissions: string[]
): void {
  const actorPermissionSet = new Set(actorPermissions)
  const matrixEntries = Object.entries(matrix)

  for (const [, permissions] of matrixEntries) {
    for (const permission of permissions) {
      if (!actorPermissionSet.has(permission)) {
        throw new BusinessException(
          403,
          'Cannot grant a permission you do not have',
          'errors.roleSettings.escalationPrevented'
        )
      }
    }
  }
}

export function buildPermissionMatrixEntries(
  matrix: Record<string, string[]>
): Array<{ role: UserRole; permissionKey: string; allowed: boolean }> {
  const allPermissionValues = new Set<string>(ALL_PERMISSIONS)
  const entries: Array<{ role: UserRole; permissionKey: string; allowed: boolean }> = []
  const matrixMap = new Map(Object.entries(matrix))

  for (const role of CONFIGURABLE_ROLES) {
    const allowedPermissions = new Set(matrixMap.get(role) ?? [])

    for (const permission of allPermissionValues) {
      entries.push({
        role: role as UserRole,
        permissionKey: permission,
        allowed: allowedPermissions.has(permission),
      })
    }
  }

  return entries
}

export function buildPermissionMatrixFromRecords(
  records: Array<{ role: string; permissionKey: string }>
): Record<string, string[]> {
  const matrix = new Map<string, string[]>()

  for (const role of CONFIGURABLE_ROLES) {
    matrix.set(role, [])
  }

  for (const record of records) {
    const role = record.role as string
    const existing = matrix.get(role) ?? []
    existing.push(record.permissionKey)
    matrix.set(role, existing)
  }

  return Object.fromEntries(matrix)
}

export function buildSeedPermissionEntries(): Array<{
  role: UserRole
  permissionKey: string
  allowed: boolean
}> {
  const entries: Array<{ role: UserRole; permissionKey: string; allowed: boolean }> = []
  const allPermissionValues = ALL_PERMISSIONS
  const defaultPermissionsMap = new Map(Object.entries(DEFAULT_PERMISSIONS))

  for (const role of CONFIGURABLE_ROLES) {
    const allowedSet = new Set<string>(defaultPermissionsMap.get(role) ?? [])

    for (const permission of allPermissionValues) {
      entries.push({
        role: role as UserRole,
        permissionKey: permission,
        allowed: allowedSet.has(permission),
      })
    }
  }

  return entries
}
