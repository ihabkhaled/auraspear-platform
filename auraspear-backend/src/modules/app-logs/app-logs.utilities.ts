import { APP_LOGS_SORT_FIELDS } from './app-logs.constants'
import { toDay } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type { SearchAppLogsDto } from './dto/search-app-logs.dto'
import type { Prisma } from '@prisma/client'

export function buildAppLogsWhereClause(
  dto: SearchAppLogsDto,
  scopedTenantId?: string
): Prisma.ApplicationLogWhereInput {
  const where: Prisma.ApplicationLogWhereInput = {}

  if (scopedTenantId) {
    where.tenantId = scopedTenantId
  } else if (dto.tenantId) {
    where.tenantId = dto.tenantId
  }

  applyLevelFilter(where, dto.level)
  applyStringContainsFilter(where, 'feature', dto.feature)
  applyStringContainsFilter(where, 'action', dto.action)
  applyStringContainsFilter(where, 'functionName', dto.functionName)
  applyStringContainsFilter(where, 'actorEmail', dto.actorEmail)
  applyExactFilter(where, 'actorUserId', dto.actorUserId)
  applyExactFilter(where, 'requestId', dto.requestId)
  applyExactFilter(where, 'sourceType', dto.sourceType)
  applyExactFilter(where, 'outcome', dto.outcome)

  if (dto.query) {
    where.message = { contains: dto.query, mode: 'insensitive' }
  }

  applyDateRangeFilter(where, dto.from, dto.to)

  return where
}

function applyLevelFilter(where: Prisma.ApplicationLogWhereInput, level?: string): void {
  if (!level) return

  const levels = level
    .split(',')
    .map(l => l.trim())
    .filter(Boolean)

  if (levels.length === 1) {
    where.level = levels[0]
  } else if (levels.length > 1) {
    where.level = { in: levels }
  }
}

function applyStringContainsFilter(
  where: Prisma.ApplicationLogWhereInput,
  field: keyof Prisma.ApplicationLogWhereInput,
  value?: string
): void {
  if (!value) return

  const filterMap = new Map<string, unknown>()
  filterMap.set(field, { contains: value, mode: 'insensitive' })
  Object.assign(where, Object.fromEntries(filterMap))
}

function applyExactFilter(
  where: Prisma.ApplicationLogWhereInput,
  field: keyof Prisma.ApplicationLogWhereInput,
  value?: string
): void {
  if (!value) return

  const filterMap = new Map<string, unknown>()
  filterMap.set(field, value)
  Object.assign(where, Object.fromEntries(filterMap))
}

function applyDateRangeFilter(
  where: Prisma.ApplicationLogWhereInput,
  from?: string,
  to?: string
): void {
  if (!from && !to) return

  const dateFilter: Prisma.DateTimeFilter = {}

  if (from) {
    dateFilter.gte = toDay(from).toDate()
  }

  if (to) {
    dateFilter.lte = toDay(to).toDate()
  }

  where.createdAt = dateFilter
}

export function buildAppLogsOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.ApplicationLogOrderByWithRelationInput {
  return buildOrderBy(APP_LOGS_SORT_FIELDS, 'createdAt', sortBy, sortOrder)
}
