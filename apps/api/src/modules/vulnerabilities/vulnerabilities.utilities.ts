import {
  VALID_PATCH_STATUSES,
  VALID_SEVERITIES,
  VULNERABILITY_SORT_FIELDS,
} from './vulnerabilities.constants'
import { PatchStatus } from '../../common/enums'
import { nowDate } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type { UpdateVulnerabilityDto } from './dto/update-vulnerability.dto'
import type { VulnerabilityRecord, VulnerabilityStats } from './vulnerabilities.types'
import type {
  Prisma,
  VulnerabilitySeverity as PrismaVulnerabilitySeverity,
  PatchStatus as PrismaPatchStatus,
} from '@prisma/client'

/* ---------------------------------------------------------------- */
/* QUERY BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildVulnerabilityListWhere(
  tenantId: string,
  severity?: string,
  patchStatus?: string,
  exploitAvailable?: string,
  query?: string
): Prisma.VulnerabilityWhereInput {
  const where: Prisma.VulnerabilityWhereInput = { tenantId }

  if (severity) {
    const severities = severity
      .split(',')
      .map(s => s.trim())
      .filter(s => VALID_SEVERITIES.has(s))
    if (severities.length === 1) {
      where.severity = severities[0] as PrismaVulnerabilitySeverity
    } else if (severities.length > 1) {
      where.severity = { in: severities as PrismaVulnerabilitySeverity[] }
    }
  }

  if (patchStatus) {
    const statuses = patchStatus
      .split(',')
      .map(s => s.trim())
      .filter(s => VALID_PATCH_STATUSES.has(s))
    if (statuses.length === 1) {
      where.patchStatus = statuses[0] as PrismaPatchStatus
    } else if (statuses.length > 1) {
      where.patchStatus = { in: statuses as PrismaPatchStatus[] }
    }
  }

  if (exploitAvailable === 'true' || exploitAvailable === 'false') {
    where.exploitAvailable = exploitAvailable === 'true'
  }

  if (query) {
    where.OR = [
      { cveId: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { affectedSoftware: { contains: query, mode: 'insensitive' } },
      { remediation: { contains: query, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildVulnerabilityOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Prisma.VulnerabilityOrderByWithRelationInput {
  return buildOrderBy(
    VULNERABILITY_SORT_FIELDS,
    'cvssScore',
    sortBy,
    sortOrder
  ) as Prisma.VulnerabilityOrderByWithRelationInput
}

/* ---------------------------------------------------------------- */
/* UPDATE DATA BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildVulnerabilityUpdateData(
  dto: UpdateVulnerabilityDto,
  existingPatchStatus: string
): Prisma.VulnerabilityUpdateInput {
  const updateData: Prisma.VulnerabilityUpdateInput = {}

  if (dto.cveId !== undefined) {
    updateData.cveId = dto.cveId
  }
  if (dto.cvssScore !== undefined) {
    updateData.cvssScore = dto.cvssScore
  }
  if (dto.severity !== undefined) {
    updateData.severity = dto.severity as PrismaVulnerabilitySeverity
  }
  if (dto.description !== undefined) {
    updateData.description = dto.description
  }
  if (dto.affectedHosts !== undefined) {
    updateData.affectedHosts = dto.affectedHosts
  }
  if (dto.exploitAvailable !== undefined) {
    updateData.exploitAvailable = dto.exploitAvailable
  }
  if (dto.patchStatus !== undefined) {
    updateData.patchStatus = dto.patchStatus as PrismaPatchStatus
    if (
      dto.patchStatus === PatchStatus.MITIGATED &&
      existingPatchStatus !== PatchStatus.MITIGATED
    ) {
      updateData.patchedAt = nowDate()
    }
  }
  if (dto.affectedSoftware !== undefined) {
    updateData.affectedSoftware = dto.affectedSoftware
  }
  if (dto.remediation !== undefined) {
    updateData.remediation = dto.remediation
  }

  return updateData
}

/* ---------------------------------------------------------------- */
/* STATS BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildVulnerabilityStats(
  criticalCount: number,
  highCount: number,
  mediumCount: number,
  patched30dCount: number,
  exploitCount: number
): VulnerabilityStats {
  return {
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    patched30d: patched30dCount,
    exploitAvailable: exploitCount,
  }
}

/* ---------------------------------------------------------------- */
/* RECORD MAPPING                                                    */
/* ---------------------------------------------------------------- */

export function buildVulnerabilityRecord(
  vulnerability: { tenant: { name: string } } & Record<string, unknown>
): VulnerabilityRecord {
  const { tenant, ...rest } = vulnerability
  return {
    ...rest,
    tenantName: tenant.name,
  } as VulnerabilityRecord
}

export function buildVulnerabilityRecordList(
  data: Array<{ tenant: { name: string } } & Record<string, unknown>>
): VulnerabilityRecord[] {
  return data.map(vulnerability => buildVulnerabilityRecord(vulnerability))
}
