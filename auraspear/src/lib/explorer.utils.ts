import { AppLogLevel, BadgeVariant, SyncJobStatus } from '@/enums'

export function levelVariant(lvl: string): BadgeVariant {
  switch (lvl) {
    case AppLogLevel.ERROR:
      return BadgeVariant.DESTRUCTIVE
    case AppLogLevel.WARN:
      return BadgeVariant.OUTLINE
    case AppLogLevel.DEBUG:
      return BadgeVariant.SECONDARY
    default:
      return BadgeVariant.DEFAULT
  }
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case SyncJobStatus.RUNNING:
      return BadgeVariant.DEFAULT
    case SyncJobStatus.COMPLETED:
      return BadgeVariant.OUTLINE
    case SyncJobStatus.FAILED:
      return BadgeVariant.DESTRUCTIVE
    default:
      return BadgeVariant.SECONDARY
  }
}
