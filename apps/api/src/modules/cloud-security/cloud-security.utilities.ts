import { ACCOUNT_SORT_FIELDS, FINDING_SORT_FIELDS } from './cloud-security.constants'
import { buildOrderBy } from '../../common/utils/query.utility'
import type {
  AccountEntity,
  CloudAccountRecord,
  CloudFindingRecord,
  CloudSecurityStats,
  FindingEntity,
} from './cloud-security.types'
import type { UpdateAccountDto } from './dto/update-account.dto'

/* ---------------------------------------------------------------- */
/* QUERY BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildAccountListWhere(
  tenantId: string,
  provider?: string,
  status?: string
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }

  if (provider) {
    where['provider'] = provider
  }

  if (status) {
    where['status'] = status
  }

  return where
}

export function buildAccountOrderBy(sortBy?: string, sortOrder?: string): Record<string, string> {
  return buildOrderBy(ACCOUNT_SORT_FIELDS, 'createdAt', sortBy, sortOrder)
}

export function buildFindingListWhere(
  tenantId: string,
  severity?: string,
  status?: string,
  cloudAccountId?: string
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }

  if (severity) {
    where['severity'] = severity
  }

  if (status) {
    where['status'] = status
  }

  if (cloudAccountId) {
    where['cloudAccountId'] = cloudAccountId
  }

  return where
}

export function buildFindingOrderBy(sortBy?: string, sortOrder?: string): Record<string, string> {
  return buildOrderBy(FINDING_SORT_FIELDS, 'detectedAt', sortBy, sortOrder)
}

/* ---------------------------------------------------------------- */
/* UPDATE DATA BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildAccountUpdateData(dto: UpdateAccountDto): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (dto.provider !== undefined) data['provider'] = dto.provider
  if (dto.accountId !== undefined) data['accountId'] = dto.accountId
  if (dto.alias !== undefined) data['alias'] = dto.alias
  if (dto.region !== undefined) data['region'] = dto.region
  if (dto.status !== undefined) data['status'] = dto.status

  return data
}

/* ---------------------------------------------------------------- */
/* RECORD MAPPING                                                    */
/* ---------------------------------------------------------------- */

export function buildAccountRecord(account: AccountEntity): CloudAccountRecord {
  return {
    id: account.id,
    tenantId: account.tenantId,
    provider: account.provider,
    accountId: account.accountId,
    alias: account.alias,
    region: account.region,
    status: account.status,
    lastScanAt: account.lastScanAt,
    findingsCount: account.findingsCount,
    complianceScore: account.complianceScore,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  }
}

export function buildCloudSecurityStats(
  totalAccounts: number,
  connectedAccounts: number,
  disconnectedAccounts: number,
  errorAccounts: number,
  totalFindings: number,
  openFindings: number,
  resolvedFindings: number,
  suppressedFindings: number,
  criticalFindings: number,
  highFindings: number
): CloudSecurityStats {
  return {
    totalAccounts,
    connectedAccounts,
    disconnectedAccounts,
    errorAccounts,
    totalFindings,
    openFindings,
    resolvedFindings,
    suppressedFindings,
    criticalFindings,
    highFindings,
  }
}

export function buildFindingRecord(finding: FindingEntity): CloudFindingRecord {
  return {
    id: finding.id,
    tenantId: finding.tenantId,
    cloudAccountId: finding.cloudAccountId,
    title: finding.title,
    description: finding.description,
    severity: finding.severity,
    status: finding.status,
    resourceId: finding.resourceId,
    resourceType: finding.resourceType,
    remediationSteps: finding.remediationSteps,
    detectedAt: finding.detectedAt,
    resolvedAt: finding.resolvedAt,
    createdAt: finding.createdAt,
    updatedAt: finding.updatedAt,
  }
}
