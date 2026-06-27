import { AppLogLevel, StatusBgClass, StatusBorderClass, StatusTextClass } from '@/enums'
import type { UserRole } from '@/enums'
import { ROLE_BADGE_CLASS_MAP } from '@/lib/constants/admin'
import { lookup } from '@/lib/utils'

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z\d\s-]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
}

export function getLevelClasses(level: string): string {
  switch (level) {
    case AppLogLevel.ERROR:
      return `${StatusBgClass.ERROR} ${StatusTextClass.WHITE} ${StatusBorderClass.ERROR}`
    case AppLogLevel.WARN:
      return `${StatusBgClass.WARNING} ${StatusTextClass.WHITE} ${StatusBorderClass.WARNING}`
    case AppLogLevel.INFO:
      return `${StatusBgClass.INFO} ${StatusTextClass.WHITE} ${StatusBorderClass.INFO}`
    case AppLogLevel.DEBUG:
      return `${StatusBgClass.MUTED} ${StatusTextClass.MUTED} ${StatusBorderClass.BORDER}`
    default:
      return ''
  }
}

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
