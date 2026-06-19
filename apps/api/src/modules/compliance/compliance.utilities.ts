import { FRAMEWORK_SORT_FIELDS } from './compliance.constants'
import { ComplianceControlStatus } from '../../common/enums'
import { nowDate } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type {
  ComplianceFrameworkRecord,
  ComplianceControlRecord,
  ComplianceStats,
  ControlCountEntry,
  ControlEntity,
  FrameworkWithTenant,
  GroupedControlEntry,
} from './compliance.types'
import type { UpdateControlDto } from './dto/update-control.dto'
import type { UpdateFrameworkDto } from './dto/update-framework.dto'
import type { Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* QUERY BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildFrameworkListWhere(
  tenantId: string,
  standard?: string,
  query?: string
): Prisma.ComplianceFrameworkWhereInput {
  const where: Prisma.ComplianceFrameworkWhereInput = { tenantId }

  if (standard) {
    where.standard = standard as Prisma.ComplianceFrameworkWhereInput['standard']
  }

  if (query && query.trim().length > 0) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildFrameworkOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.ComplianceFrameworkOrderByWithRelationInput {
  return buildOrderBy(
    FRAMEWORK_SORT_FIELDS,
    'createdAt',
    sortBy,
    sortOrder
  ) as Prisma.ComplianceFrameworkOrderByWithRelationInput
}

/* ---------------------------------------------------------------- */
/* UPDATE DATA BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildFrameworkUpdateData(dto: UpdateFrameworkDto): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (dto.name !== undefined) data['name'] = dto.name
  if (dto.description !== undefined) data['description'] = dto.description
  if (dto.standard !== undefined) data['standard'] = dto.standard
  if (dto.version !== undefined) data['version'] = dto.version

  return data
}

export function buildControlUpdateData(
  dto: UpdateControlDto,
  userEmail: string
): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (dto.controlNumber !== undefined) data['controlNumber'] = dto.controlNumber
  if (dto.title !== undefined) data['title'] = dto.title
  if (dto.description !== undefined) data['description'] = dto.description
  if (dto.status !== undefined) {
    data['status'] = dto.status
    data['assessedAt'] = nowDate()
    data['assessedBy'] = userEmail
  }
  if (dto.evidence !== undefined) data['evidence'] = dto.evidence

  return data
}

/* ---------------------------------------------------------------- */
/* RECORD MAPPING                                                    */
/* ---------------------------------------------------------------- */

export function buildFrameworkRecord(
  framework: FrameworkWithTenant,
  controlStats?: { total: number; passed: number; failed: number }
): ComplianceFrameworkRecord {
  const totalControls = controlStats?.total ?? 0
  const passedControls = controlStats?.passed ?? 0
  const failedControls = controlStats?.failed ?? 0
  const complianceScore = totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 0

  return {
    id: framework.id,
    tenantId: framework.tenantId,
    name: framework.name,
    description: framework.description,
    standard: framework.standard,
    version: framework.version,
    totalControls,
    passedControls,
    failedControls,
    complianceScore,
    tenantName: framework.tenant.name,
    createdAt: framework.createdAt,
    updatedAt: framework.updatedAt,
  }
}

export function buildControlRecord(
  control: ControlEntity,
  assessedByName: string | null
): ComplianceControlRecord {
  return {
    id: control.id,
    frameworkId: control.frameworkId,
    controlNumber: control.controlNumber,
    title: control.title,
    description: control.description,
    status: control.status,
    evidence: control.evidence,
    assessedAt: control.assessedAt,
    assessedBy: control.assessedBy,
    assessedByName,
    createdAt: control.createdAt,
    updatedAt: control.updatedAt,
  }
}

/* ---------------------------------------------------------------- */
/* STATS BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildComplianceStats(
  totalFrameworks: number,
  controlCounts: ControlCountEntry[]
): ComplianceStats {
  let passedControls = 0
  let failedControls = 0
  let notAssessedControls = 0
  let partiallyMetControls = 0
  let totalControls = 0

  for (const c of controlCounts) {
    totalControls += c._count.id
    switch (c.status) {
      case ComplianceControlStatus.PASSED:
        passedControls = c._count.id
        break
      case ComplianceControlStatus.FAILED:
        failedControls = c._count.id
        break
      case ComplianceControlStatus.NOT_ASSESSED:
        notAssessedControls = c._count.id
        break
      case ComplianceControlStatus.PARTIALLY_MET:
        partiallyMetControls = c._count.id
        break
    }
  }

  const overallComplianceScore =
    totalControls > 0 ? Math.round((passedControls / totalControls) * 100) : 0

  return {
    totalFrameworks,
    overallComplianceScore,
    passedControls,
    failedControls,
    notAssessedControls,
    partiallyMetControls,
  }
}

/* ---------------------------------------------------------------- */
/* CONTROL STATS BATCH                                               */
/* ---------------------------------------------------------------- */

export function buildControlStatsBatchMap(
  controls: GroupedControlEntry[]
): Map<string, { total: number; passed: number; failed: number }> {
  const map = new Map<string, { total: number; passed: number; failed: number }>()

  for (const c of controls) {
    const existing = map.get(c.frameworkId) ?? { total: 0, passed: 0, failed: 0 }
    existing.total += c._count.id
    if (c.status === ComplianceControlStatus.PASSED) {
      existing.passed += c._count.id
    } else if (c.status === ComplianceControlStatus.FAILED) {
      existing.failed += c._count.id
    }
    map.set(c.frameworkId, existing)
  }

  return map
}
