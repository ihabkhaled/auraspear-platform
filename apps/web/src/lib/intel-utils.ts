import { AlertSeverity, BadgeVariant } from '@/enums'
import {
  TAG_CLASS_APT,
  TAG_CLASS_DEFAULT,
  TAG_CLASS_TLP_AMBER,
  TAG_CLASS_TLP_GREEN,
  TAG_CLASS_TLP_RED,
  TAG_CLASS_TLP_WHITE,
} from '@/lib/constants/intel'

export function getThreatLevelVariant(level: string): BadgeVariant {
  switch (level.toLowerCase()) {
    case AlertSeverity.CRITICAL:
    case AlertSeverity.HIGH: {
      return BadgeVariant.DESTRUCTIVE
    }
    case AlertSeverity.MEDIUM: {
      return BadgeVariant.DEFAULT
    }
    case AlertSeverity.LOW: {
      return BadgeVariant.SECONDARY
    }
    default: {
      return BadgeVariant.OUTLINE
    }
  }
}

export function truncateInfo(info: string, maxLength = 60): string {
  if (info.length <= maxLength) return info
  return `${info.slice(0, maxLength)}...`
}

export function getTagClasses(name?: string | null): string {
  if (!name) return TAG_CLASS_DEFAULT
  const upper = name.toUpperCase()

  if (upper.startsWith('TLP:RED')) {
    return TAG_CLASS_TLP_RED
  }
  if (upper.startsWith('TLP:AMBER')) {
    return TAG_CLASS_TLP_AMBER
  }
  if (upper.startsWith('TLP:GREEN')) {
    return TAG_CLASS_TLP_GREEN
  }
  if (upper.startsWith('TLP:WHITE') || upper.startsWith('TLP:CLEAR')) {
    return TAG_CLASS_TLP_WHITE
  }
  if (upper.startsWith('APT-') || upper.startsWith('APT ')) {
    return TAG_CLASS_APT
  }
  return TAG_CLASS_DEFAULT
}
