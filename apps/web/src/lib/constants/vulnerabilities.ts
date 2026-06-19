import { PatchStatus, VulnerabilitySeverity } from '@/enums'

export const VULN_SEVERITY_LABEL_KEYS: Record<VulnerabilitySeverity, string> = {
  [VulnerabilitySeverity.CRITICAL]: 'severityCritical',
  [VulnerabilitySeverity.HIGH]: 'severityHigh',
  [VulnerabilitySeverity.MEDIUM]: 'severityMedium',
  [VulnerabilitySeverity.LOW]: 'severityLow',
  [VulnerabilitySeverity.INFO]: 'severityInfo',
}

export const PATCH_STATUS_LABEL_KEYS: Record<PatchStatus, string> = {
  [PatchStatus.PATCH_PENDING]: 'patchPending',
  [PatchStatus.PATCHING]: 'patching',
  [PatchStatus.MITIGATED]: 'mitigated',
  [PatchStatus.SCHEDULED]: 'scheduled',
  [PatchStatus.NOT_APPLICABLE]: 'notApplicable',
}

export const PATCH_STATUS_CLASSES: Record<PatchStatus, string> = {
  [PatchStatus.PATCH_PENDING]: 'bg-status-warning text-white',
  [PatchStatus.PATCHING]: 'bg-status-info text-white',
  [PatchStatus.MITIGATED]: 'bg-status-success text-white',
  [PatchStatus.SCHEDULED]: 'bg-muted text-muted-foreground',
  [PatchStatus.NOT_APPLICABLE]: 'bg-muted text-muted-foreground',
}

export const CVSS_COLOR_THRESHOLDS = [
  { min: 9, className: 'bg-severity-critical text-white' },
  { min: 7, className: 'bg-severity-high text-white' },
  { min: 4, className: 'bg-severity-medium text-white' },
  { min: 0, className: 'bg-severity-low text-white' },
] as const

export const CVSS_DEFAULT_CLASS = 'bg-severity-low text-white'
