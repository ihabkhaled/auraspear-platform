import {
  StatusBgClass,
  StatusBorderClass,
  StatusTextClass,
  UserRole,
  UserSessionStatus,
  UserStatus,
  type UsersControlUserSortField,
} from '@/enums'
import {
  MEMBERSHIP_STATUS_DEFAULT_LABEL_KEY,
  MEMBERSHIP_STATUS_LABEL_KEYS,
  PRESENCE_LABEL_KEYS,
  USERS_CONTROL_SESSION_STATUS_LABEL_KEYS,
  USERS_CONTROL_SORT_FIELDS,
} from '@/lib/constants/users-control'
import { lookup } from '@/lib/utils'
import type { UsersControlUser } from '@/types'

export function isUsersControlSortField(value: string): value is UsersControlUserSortField {
  return USERS_CONTROL_SORT_FIELDS.has(value)
}

export function getUsersControlPresenceClass(isOnline: boolean): string {
  return isOnline
    ? `${StatusBorderClass.SUCCESS_30} ${StatusBgClass.SUCCESS_10} ${StatusTextClass.SUCCESS}`
    : `${StatusBorderClass.BORDER} ${StatusBgClass.MUTED} ${StatusTextClass.MUTED}`
}

export function getUsersControlPresenceLabelKey(isOnline: boolean): string {
  const key = isOnline ? 'online' : 'offline'
  return lookup(PRESENCE_LABEL_KEYS, key)
}

export function getUsersControlMembershipStatusClass(status: UserStatus | null): string {
  switch (status) {
    case UserStatus.ACTIVE:
      return `${StatusBorderClass.SUCCESS_30} ${StatusBgClass.SUCCESS_10} ${StatusTextClass.SUCCESS}`
    case UserStatus.SUSPENDED:
      return `${StatusBorderClass.WARNING_30} ${StatusBgClass.WARNING_10} ${StatusTextClass.WARNING}`
    case UserStatus.INACTIVE:
      return `${StatusBorderClass.ERROR_30} ${StatusBgClass.ERROR_10} ${StatusTextClass.ERROR}`
    default:
      return `${StatusBorderClass.BORDER} ${StatusBgClass.MUTED} ${StatusTextClass.MUTED}`
  }
}

export function getUsersControlMembershipStatusLabelKey(status: UserStatus | null): string {
  if (status === null) {
    return MEMBERSHIP_STATUS_DEFAULT_LABEL_KEY
  }
  return lookup(MEMBERSHIP_STATUS_LABEL_KEYS, status) ?? MEMBERSHIP_STATUS_DEFAULT_LABEL_KEY
}

export function getUsersControlSessionStatusClass(status: UserSessionStatus): string {
  switch (status) {
    case UserSessionStatus.ACTIVE:
      return `${StatusBorderClass.SUCCESS_30} ${StatusBgClass.SUCCESS_10} ${StatusTextClass.SUCCESS}`
    case UserSessionStatus.REVOKED:
      return `${StatusBorderClass.WARNING_30} ${StatusBgClass.WARNING_10} ${StatusTextClass.WARNING}`
    case UserSessionStatus.EXPIRED:
      return `${StatusBorderClass.ERROR_30} ${StatusBgClass.ERROR_10} ${StatusTextClass.ERROR}`
    default:
      return `${StatusBorderClass.BORDER} ${StatusBgClass.MUTED} ${StatusTextClass.MUTED}`
  }
}

export function getUsersControlSessionStatusLabelKey(status: UserSessionStatus): string {
  return (
    lookup(USERS_CONTROL_SESSION_STATUS_LABEL_KEYS, status) ??
    lookup(USERS_CONTROL_SESSION_STATUS_LABEL_KEYS, UserSessionStatus.EXPIRED)
  )
}

export function canManageUsersControlTarget(
  actorRole: UserRole | null | undefined,
  targetUser: UsersControlUser
): boolean {
  if (actorRole === UserRole.GLOBAL_ADMIN) {
    return true
  }

  if (actorRole !== UserRole.TENANT_ADMIN) {
    return false
  }

  return !targetUser.isProtected && !targetUser.hasGlobalAdminMembership
}

export function isUsersControlAssignableRole(
  role: UserRole,
  permission: string,
  protectedPermissions: ReadonlySet<string>
): boolean {
  if (!protectedPermissions.has(permission)) {
    return true
  }

  return role === UserRole.TENANT_ADMIN
}
