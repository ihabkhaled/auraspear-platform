import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'

export interface CloudAccountRecord {
  id: string
  tenantId: string
  provider: string
  accountId: string
  alias: string | null
  region: string | null
  status: string
  lastScanAt: Date | null
  findingsCount: number
  complianceScore: number
  createdAt: Date
  updatedAt: Date
}

export type PaginatedAccounts = PaginatedResponse<CloudAccountRecord>

export interface CloudFindingRecord {
  id: string
  tenantId: string
  cloudAccountId: string
  title: string
  description: string | null
  severity: string
  status: string
  resourceId: string
  resourceType: string
  remediationSteps: string | null
  detectedAt: Date
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type PaginatedFindings = PaginatedResponse<CloudFindingRecord>

export interface AccountEntity {
  id: string
  tenantId: string
  provider: string
  accountId: string
  alias: string | null
  region: string | null
  status: string
  lastScanAt: Date | null
  findingsCount: number
  complianceScore: number
  createdAt: Date
  updatedAt: Date
}

export interface FindingEntity {
  id: string
  tenantId: string
  cloudAccountId: string
  title: string
  description: string | null
  severity: string
  status: string
  resourceId: string
  resourceType: string
  remediationSteps: string | null
  detectedAt: Date
  resolvedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CloudSecurityStats {
  totalAccounts: number
  connectedAccounts: number
  disconnectedAccounts: number
  errorAccounts: number
  totalFindings: number
  openFindings: number
  resolvedFindings: number
  suppressedFindings: number
  criticalFindings: number
  highFindings: number
}
