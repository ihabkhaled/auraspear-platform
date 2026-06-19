import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { Vulnerability } from '@prisma/client'

export type VulnerabilityRecord = Vulnerability & {
  tenantName: string
}

export type PaginatedVulnerabilities = PaginatedResponse<VulnerabilityRecord>

export interface VulnerabilityStats {
  critical: number
  high: number
  medium: number
  patched30d: number
  exploitAvailable: number
}
