import { HuntSessionStatus } from '@prisma/client'
import { AlertSeverity } from '../../common/enums'

export const VALID_HUNT_TRANSITIONS = new Map<HuntSessionStatus, Set<HuntSessionStatus>>([
  [HuntSessionStatus.running, new Set([HuntSessionStatus.completed, HuntSessionStatus.error])],
])

export const RANGE_MAP = new Map<string, number>([
  ['1h', 60 * 60 * 1000],
  ['6h', 6 * 60 * 60 * 1000],
  ['12h', 12 * 60 * 60 * 1000],
  ['24h', 24 * 60 * 60 * 1000],
  ['7d', 7 * 24 * 60 * 60 * 1000],
  ['30d', 30 * 24 * 60 * 60 * 1000],
  ['90d', 90 * 24 * 60 * 60 * 1000],
])

export const SEVERITY_WEIGHTS: Record<string, number> = {
  [AlertSeverity.CRITICAL]: 10,
  [AlertSeverity.HIGH]: 7,
  [AlertSeverity.MEDIUM]: 4,
  [AlertSeverity.LOW]: 2,
  [AlertSeverity.INFO]: 1,
}
