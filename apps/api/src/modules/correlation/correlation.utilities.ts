import { RULE_SORT_FIELDS } from './correlation.constants'
import { toIso } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type {
  CorrelationEvent,
  CorrelationRuleInput,
  CorrelationStats,
  RuleRecord,
} from './correlation.types'
import type { UpdateRuleDto } from './dto/update-rule.dto'
import type { Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* QUERY BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildRuleListWhere(
  tenantId: string,
  source?: string,
  severity?: string,
  status?: string,
  query?: string
): Prisma.CorrelationRuleWhereInput {
  const where: Prisma.CorrelationRuleWhereInput = { tenantId }

  if (source) {
    const sources = source.split(',').map(s => s.trim())
    where.source = { in: sources as Prisma.EnumRuleSourceFilter['in'] }
  }

  if (severity) {
    const severities = severity.split(',').map(s => s.trim())
    where.severity = { in: severities as Prisma.EnumRuleSeverityFilter['in'] }
  }

  if (status) {
    const statuses = status.split(',').map(s => s.trim())
    where.status = { in: statuses as Prisma.EnumRuleStatusFilter['in'] }
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { ruleNumber: { contains: query, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildRuleOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.CorrelationRuleOrderByWithRelationInput {
  return buildOrderBy(
    RULE_SORT_FIELDS,
    'createdAt',
    sortBy,
    sortOrder
  ) as Prisma.CorrelationRuleOrderByWithRelationInput
}

/* ---------------------------------------------------------------- */
/* UPDATE DATA BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildRuleUpdateData(dto: UpdateRuleDto): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (dto.title !== undefined) data['title'] = dto.title
  if (dto.description !== undefined) data['description'] = dto.description
  if (dto.source !== undefined) data['source'] = dto.source
  if (dto.severity !== undefined) data['severity'] = dto.severity
  if (dto.status !== undefined) data['status'] = dto.status
  if (dto.yamlContent !== undefined) data['yamlContent'] = dto.yamlContent
  if (dto.conditions !== undefined) data['conditions'] = dto.conditions
  if (dto.mitreTactics !== undefined) data['mitreTactics'] = dto.mitreTactics
  if (dto.mitreTechniques !== undefined) data['mitreTechniques'] = dto.mitreTechniques

  return data
}

/* ---------------------------------------------------------------- */
/* RULE INPUT EXTRACTION                                             */
/* ---------------------------------------------------------------- */

/**
 * Extracts a CorrelationRuleInput from a RuleRecord for executor evaluation.
 * Reads eventTypes, threshold, timeWindowMinutes, and groupBy from the
 * rule's conditions JSON or provides sensible defaults.
 */
export function extractCorrelationRuleInput(rule: {
  id: string
  title: string
  conditions: unknown
}): CorrelationRuleInput {
  const conditions =
    typeof rule.conditions === 'object' && rule.conditions !== null
      ? (rule.conditions as Record<string, unknown>)
      : {}

  const rawEventTypes = Reflect.get(conditions, 'eventTypes')
  const eventTypes = Array.isArray(rawEventTypes)
    ? rawEventTypes.filter((t): t is string => typeof t === 'string')
    : []

  const rawThreshold = Reflect.get(conditions, 'threshold')
  const threshold = typeof rawThreshold === 'number' && rawThreshold > 0 ? rawThreshold : 1

  const rawTimeWindow = Reflect.get(conditions, 'timeWindowMinutes')
  const timeWindowMinutes =
    typeof rawTimeWindow === 'number' && rawTimeWindow > 0 ? rawTimeWindow : 60

  const rawGroupBy = Reflect.get(conditions, 'groupBy')
  const groupBy = typeof rawGroupBy === 'string' ? rawGroupBy : undefined

  return {
    id: rule.id,
    name: rule.title,
    eventTypes,
    threshold,
    timeWindowMinutes,
    groupBy,
  }
}

/* ---------------------------------------------------------------- */
/* STATS BUILDING                                                    */
/* ---------------------------------------------------------------- */

export function buildCorrelationStats(
  correlationRules: number,
  sigmaRules: number,
  fired24hResult: { _sum?: { hitCount?: number | null } | null },
  linkedResult: { _sum?: { linkedIncidents?: number | null } | null }
): CorrelationStats {
  return {
    correlationRules,
    sigmaRules,
    fired24h: fired24hResult._sum?.hitCount ?? 0,
    linkedToIncidents: linkedResult._sum?.linkedIncidents ?? 0,
  }
}

/* ---------------------------------------------------------------- */
/* RULE RECORD MAPPING                                               */
/* ---------------------------------------------------------------- */

export function buildRuleRecord(
  rule: { tenant: { name: string } } & Record<string, unknown>,
  createdByName: string | null
): RuleRecord {
  const { tenant, ...rest } = rule
  return {
    ...rest,
    createdByName,
    tenantName: tenant.name,
  } as RuleRecord
}

export function buildRuleRecordList(
  rules: Array<{ tenant: { name: string }; createdBy: string } & Record<string, unknown>>,
  creatorMap: Map<string, string>
): RuleRecord[] {
  return rules.map(rule => {
    const { tenant, ...rest } = rule
    return {
      ...rest,
      createdByName: creatorMap.get(rule.createdBy) ?? null,
      tenantName: tenant.name,
    } as RuleRecord
  })
}

export function buildCorrelationEvents(events: Record<string, unknown>[]): CorrelationEvent[] {
  return events.map(event => ({
    type:
      typeof Reflect.get(event, 'type') === 'string'
        ? (Reflect.get(event, 'type') as string)
        : 'unknown',
    timestamp:
      typeof Reflect.get(event, 'timestamp') === 'string'
        ? (Reflect.get(event, 'timestamp') as string)
        : toIso(),
    data: event,
  }))
}
