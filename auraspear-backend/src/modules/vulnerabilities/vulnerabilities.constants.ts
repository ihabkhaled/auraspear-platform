import { PatchStatus, VulnerabilitySeverity } from '../../common/enums'

export const VALID_SEVERITIES = new Set<string>(Object.values(VulnerabilitySeverity))

export const VALID_PATCH_STATUSES = new Set<string>(Object.values(PatchStatus))

export const VULNERABILITY_SORT_FIELDS: Record<string, string> = {
  cvssScore: 'cvssScore',
  severity: 'severity',
  affectedHosts: 'affectedHosts',
  cveId: 'cveId',
  createdAt: 'createdAt',
}
