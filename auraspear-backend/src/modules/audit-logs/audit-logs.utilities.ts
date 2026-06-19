import { AUDIT_LOGS_SORT_FIELDS } from './audit-logs.constants'
import { toDay } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type { CreateAuditLogData } from './audit-logs.types'
import type { SearchAuditLogsDto } from './dto/search-audit-logs.dto'
import type { Prisma } from '@prisma/client'

export function buildAuditLogsWhereClause(
  tenantId: string,
  query: SearchAuditLogsDto
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = { tenantId }

  if (query.actor) {
    where.actor = { contains: query.actor, mode: 'insensitive' }
  }

  if (query.action) {
    where.action = query.action
  }

  if (query.resource) {
    where.resource = query.resource
  }

  if (query.from || query.to) {
    const dateFilter: Prisma.DateTimeFilter = {}

    if (query.from) {
      dateFilter.gte = toDay(query.from).toDate()
    }

    if (query.to) {
      dateFilter.lte = toDay(query.to).toDate()
    }

    where.createdAt = dateFilter
  }

  return where
}

export function buildAuditLogsOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.AuditLogOrderByWithRelationInput {
  return buildOrderBy(AUDIT_LOGS_SORT_FIELDS, 'createdAt', sortBy, sortOrder)
}

export function buildAuditLogCreateInput(
  data: CreateAuditLogData
): Prisma.AuditLogUncheckedCreateInput {
  return {
    tenantId: data.tenantId,
    actor: data.actor,
    role: data.role,
    action: data.action,
    resource: data.resource,
    resourceId: data.resourceId ?? null,
    details: data.details ?? null,
    ipAddress: data.ipAddress ?? null,
  }
}
