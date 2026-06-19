import { AttackPathSeverity, AttackPathStatus } from '@/enums'

export const ATTACK_PATH_SEVERITY_LABEL_KEYS: Record<AttackPathSeverity, string> = {
  [AttackPathSeverity.CRITICAL]: 'severityCritical',
  [AttackPathSeverity.HIGH]: 'severityHigh',
  [AttackPathSeverity.MEDIUM]: 'severityMedium',
  [AttackPathSeverity.LOW]: 'severityLow',
}

export const ATTACK_PATH_SEVERITY_CLASSES: Record<AttackPathSeverity, string> = {
  [AttackPathSeverity.CRITICAL]: 'bg-severity-critical text-white',
  [AttackPathSeverity.HIGH]: 'bg-severity-high text-white',
  [AttackPathSeverity.MEDIUM]: 'bg-severity-medium text-white',
  [AttackPathSeverity.LOW]: 'bg-severity-low text-white',
}

export const ATTACK_PATH_STATUS_LABEL_KEYS: Record<AttackPathStatus, string> = {
  [AttackPathStatus.ACTIVE]: 'statusActive',
  [AttackPathStatus.MITIGATED]: 'statusMitigated',
  [AttackPathStatus.RESOLVED]: 'statusResolved',
}

export const ATTACK_PATH_STATUS_CLASSES: Record<AttackPathStatus, string> = {
  [AttackPathStatus.ACTIVE]: 'bg-status-error text-white',
  [AttackPathStatus.MITIGATED]: 'bg-status-success text-white',
  [AttackPathStatus.RESOLVED]: 'bg-status-info text-white',
}

export const EMPTY_STAGE = {
  name: '',
  mitreId: '',
  description: '',
  assets: [] as string[],
}
