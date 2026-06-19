import { BadgeVariant, CaseStatus, type CaseTimelineEntryType } from '@/enums'
import { AVATAR_COLORS, TIMELINE_TYPE_COLORS } from '@/lib/constants/cases'
import { lookup } from '@/lib/utils'

const NON_OWNER_ROW_CLASS = 'opacity-50'
const DEFAULT_INITIAL = 'U'
const DEFAULT_TIMELINE_TYPE_COLOR = 'var(--muted-foreground)'

export const STATUS_VARIANT_MAP: Record<CaseStatus, BadgeVariant> = {
  [CaseStatus.OPEN]: BadgeVariant.DEFAULT,
  [CaseStatus.IN_PROGRESS]: BadgeVariant.SECONDARY,
  [CaseStatus.CLOSED]: BadgeVariant.OUTLINE,
}

export function getAvailableTransitions(status: CaseStatus): CaseStatus[] {
  switch (status) {
    case CaseStatus.OPEN:
      return [CaseStatus.IN_PROGRESS, CaseStatus.CLOSED]
    case CaseStatus.IN_PROGRESS:
      return [CaseStatus.CLOSED]
    case CaseStatus.CLOSED:
      return [CaseStatus.OPEN]
  }
}

export function getCaseRowClassName(
  row: { ownerUserId?: string | null },
  currentUserId: string | undefined,
  isAdmin: boolean | undefined
): string {
  if (currentUserId === undefined || isAdmin === true) {
    return ''
  }
  if (row.ownerUserId !== currentUserId) {
    return NON_OWNER_ROW_CLASS
  }
  return ''
}

export function getInitials(name?: string | null): string {
  if (!name) return DEFAULT_INITIAL
  return name
    .split(' ')
    .map(part => part.at(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS.at(index % AVATAR_COLORS.length) ?? AVATAR_COLORS.at(0) ?? ''
}

export function getTypeColor(type: CaseTimelineEntryType): string {
  return lookup(TIMELINE_TYPE_COLORS, type) ?? DEFAULT_TIMELINE_TYPE_COLOR
}

/**
 * Resolves a timeline description that may be either a plain-text string (legacy)
 * or a JSON-encoded translatable message with `key` + `params`.
 *
 * If the message is valid JSON with `key` and `params`, returns `t(key, params)`.
 * Otherwise returns the raw description string for backward compatibility.
 */
export function resolveTimelineDescription(
  description: string,
  t: (key: string, params?: Record<string, string>) => string
): string {
  try {
    const parsed: unknown = JSON.parse(description)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'key' in parsed &&
      typeof (parsed as { key: unknown }).key === 'string'
    ) {
      const { key, params } = parsed as { key: string; params?: Record<string, string> }
      return t(key, params)
    }
    return description
  } catch {
    return description
  }
}
