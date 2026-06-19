import { StatusBgClass, StatusBorderClass, StatusTextClass } from '@/enums'
import type { UserRole } from '@/enums'
import { ROLE_BADGE_CLASS_MAP } from '@/lib/constants/admin'
import { lookup } from '@/lib/utils'

export function getStatusDotClass(
  isActive: boolean,
  isBlocked: boolean,
  isDeleted: boolean
): string {
  if (isActive) return StatusBgClass.SUCCESS
  if (isBlocked) return StatusBgClass.WARNING
  if (isDeleted) return StatusBgClass.ERROR
  return StatusBgClass.NEUTRAL
}

const DEFAULT_ROLE_BADGE_CLASS = `${StatusBgClass.MUTED} ${StatusTextClass.MUTED} ${StatusBorderClass.BORDER}`

export function getRoleBadgeClass(role: UserRole): string {
  return lookup(ROLE_BADGE_CLASS_MAP, role) ?? DEFAULT_ROLE_BADGE_CLASS
}
