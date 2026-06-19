import { ALERT_SORT_FIELDS, VALID_SEVERITIES, VALID_STATUSES } from './alerts.constants'
import { AlertStatus, SortOrder } from '../../common/enums'
import { daysAgo, nowDate, toDay, toIso } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type { WazuhUpsertOp } from './alerts.types'
import type { SearchAlertsDto } from './dto/search-alerts.dto'
import type { AlertSeverity, AlertStatus as PrismaAlertStatus, Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* SEARCH WHERE CLAUSE                                               */
/* ---------------------------------------------------------------- */

export function buildAlertSearchWhere(
  tenantId: string,
  query: SearchAlertsDto
): Prisma.AlertWhereInput {
  const where: Prisma.AlertWhereInput = { tenantId }

  applySeverityFilter(where, query.severity)
  applyBasicFilters(where, query)
  applyTimeFilter(where, query)

  if (query.query && query.query !== '*') {
    applyKqlQuery(query.query, where)
  }

  return where
}

function applySeverityFilter(where: Prisma.AlertWhereInput, severity: string | undefined): void {
  if (!severity) return

  const severities = severity
    .split(',')
    .map(s => s.trim())
    .filter(s => VALID_SEVERITIES.has(s))

  if (severities.length === 1) {
    where.severity = severities[0] as AlertSeverity
  } else if (severities.length > 1) {
    where.severity = { in: severities as AlertSeverity[] }
  }
}

function applyBasicFilters(where: Prisma.AlertWhereInput, query: SearchAlertsDto): void {
  if (query.status && VALID_STATUSES.has(query.status)) {
    where.status = query.status as unknown as PrismaAlertStatus
  }
  if (query.source) {
    where.source = query.source
  }
  if (query.agentName) {
    where.agentName = { contains: query.agentName, mode: 'insensitive' }
  }
  if (query.ruleGroup) {
    where.ruleName = { contains: query.ruleGroup, mode: 'insensitive' }
  }
}

/* ---------------------------------------------------------------- */
/* TIME FILTER                                                       */
/* ---------------------------------------------------------------- */

function applyTimeFilter(where: Prisma.AlertWhereInput, query: SearchAlertsDto): void {
  if (query.timeRange) {
    let from: Date
    switch (query.timeRange) {
      case '24h':
        from = daysAgo(1)
        break
      case '7d':
        from = daysAgo(7)
        break
      case '30d':
        from = daysAgo(30)
        break
      default:
        from = nowDate()
        break
    }
    where.timestamp = { gte: from }
  } else if (query.from ?? query.to) {
    where.timestamp = {}
    if (query.from) {
      where.timestamp.gte = toDay(query.from).toDate()
    }
    if (query.to) {
      where.timestamp.lte = toDay(query.to).toDate()
    }
  }
}

/* ---------------------------------------------------------------- */
/* ORDER BY                                                          */
/* ---------------------------------------------------------------- */

export function buildAlertOrderBy(
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): Prisma.AlertOrderByWithRelationInput {
  return buildOrderBy(
    ALERT_SORT_FIELDS,
    'timestamp',
    sortBy,
    sortOrder
  ) as Prisma.AlertOrderByWithRelationInput
}

/* ---------------------------------------------------------------- */
/* WAZUH LEVEL → SEVERITY MAPPING                                    */
/* ---------------------------------------------------------------- */

export function mapWazuhLevel(
  level: number | undefined
): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (!level) return 'info'
  if (level >= 12) return 'critical'
  if (level >= 8) return 'high'
  if (level >= 5) return 'medium'
  if (level >= 3) return 'low'
  return 'info'
}

/* ---------------------------------------------------------------- */
/* WAZUH HIT → UPSERT OP MAPPING                                    */
/* ---------------------------------------------------------------- */

export function buildWazuhUpsertOps(hits: unknown[]): WazuhUpsertOp[] {
  const fallback = nowDate()
  return hits.map(rawHit => mapSingleWazuhHit(rawHit, fallback))
}

function mapSingleWazuhHit(rawHit: unknown, fallbackTimestamp: Date): WazuhUpsertOp {
  const hit = rawHit as Record<string, unknown>
  const source = (hit._source ?? hit) as Record<string, unknown>
  const externalId = (hit._id ?? source.id) as string

  const rule = source.rule as Record<string, unknown> | undefined
  const agent = source.agent as Record<string, unknown> | undefined
  const data = source.data as Record<string, unknown> | undefined
  const { mitreTactics, mitreTechniques } = extractMitreFromRule(rule)

  return {
    externalId,
    rule,
    agent: agent ?? null,
    data: data ?? null,
    source,
    severity: mapWazuhLevel(rule?.level as number | undefined),
    mitreTactics,
    mitreTechniques,
    timestamp: toDay((source.timestamp as string | undefined) ?? fallbackTimestamp).toDate(),
  }
}

function extractMitreFromRule(rule: Record<string, unknown> | undefined): {
  mitreTactics: string[]
  mitreTechniques: string[]
} {
  const mitreTechniques: string[] = []
  const mitreTactics: string[] = []
  const mitreInfo = rule?.mitre as Record<string, unknown> | undefined

  if (mitreInfo) {
    const ids = mitreInfo.id as string[] | undefined
    const tactics = mitreInfo.tactic as string[] | undefined
    if (ids) mitreTechniques.push(...ids)
    if (tactics) mitreTactics.push(...tactics)
  }

  return { mitreTactics, mitreTechniques }
}

/* ---------------------------------------------------------------- */
/* WAZUH ALERT CREATE / UPDATE INPUT                                 */
/* ---------------------------------------------------------------- */

export function buildWazuhAlertCreateInput(
  tenantId: string,
  op: WazuhUpsertOp
): {
  create: Prisma.AlertCreateInput
  update: Prisma.AlertUpdateInput
} {
  return {
    create: {
      externalId: op.externalId,
      ...extractWazuhAlertTextFields(op),
      severity: op.severity as AlertSeverity,
      status: AlertStatus.NEW_ALERT,
      source: 'wazuh',
      ...extractWazuhAlertNetworkFields(op),
      mitreTactics: op.mitreTactics,
      mitreTechniques: op.mitreTechniques,
      rawEvent: op.source as Prisma.InputJsonValue,
      timestamp: op.timestamp,
      tenant: { connect: { id: tenantId } },
    },
    update: {
      rawEvent: op.source as Prisma.InputJsonValue,
    },
  }
}

function extractWazuhAlertTextFields(op: WazuhUpsertOp): {
  title: string
  description: string
  ruleName: string | null
  ruleId: string | null
  agentName: string | null
} {
  const agentRecord = op.agent as Record<string, unknown> | null
  return {
    title: (op.rule?.description ?? op.source.rule_description ?? 'Wazuh Alert') as string,
    description: JSON.stringify(op.source),
    ruleName: (op.rule?.description ?? null) as string | null,
    ruleId: (op.rule?.id ?? null) as string | null,
    agentName: (agentRecord?.name as string | null) ?? null,
  }
}

function extractWazuhAlertNetworkFields(op: WazuhUpsertOp): {
  sourceIp: string | null
  destinationIp: string | null
} {
  const dataRecord = op.data as Record<string, unknown> | null
  return {
    sourceIp: (dataRecord?.srcip ?? op.source.src_ip ?? null) as string | null,
    destinationIp: (dataRecord?.dstip ?? op.source.dst_ip ?? null) as string | null,
  }
}

/* ---------------------------------------------------------------- */
/* INGESTION RESULT COUNTING                                         */
/* ---------------------------------------------------------------- */

export function countIngestedResults(results: Array<PromiseSettledResult<unknown>>): {
  ingested: number
  failures: string[]
} {
  let ingested = 0
  const failures: string[] = []

  for (const result of results) {
    if (result.status === 'fulfilled') {
      ingested++
    } else {
      failures.push((result.reason as Error).message)
    }
  }

  return { ingested, failures }
}

/* ---------------------------------------------------------------- */
/* WAZUH ES QUERY BUILDER                                            */
/* ---------------------------------------------------------------- */

export function buildWazuhIngestionQuery(): Record<string, unknown> {
  const now = nowDate()
  const oneDayAgo = toDay(now).subtract(1, 'day').toDate()

  return {
    size: 500,
    query: {
      bool: {
        must: [{ range: { timestamp: { gte: toIso(oneDayAgo), lte: toIso(now) } } }],
      },
    },
    sort: [{ timestamp: { order: SortOrder.DESC } }],
  }
}

/* ---------------------------------------------------------------- */
/* KQL QUERY PARSING                                                 */
/* ---------------------------------------------------------------- */

function applyKqlQuery(rawQuery: string, where: Prisma.AlertWhereInput): void {
  const { freeTextParts } = parseKqlFieldMatches(rawQuery, where)
  const freeText = freeTextParts.join(' ').trim()

  if (freeText) {
    applyFreeTextSearch(where, freeText)
  }
}

function parseKqlFieldMatches(
  rawQuery: string,
  where: Prisma.AlertWhereInput
): { freeTextParts: string[] } {
  const kqlPattern = /(\w[\w.]*):(?:"([^"]+)"|(\S+))/g
  const freeTextParts: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = kqlPattern.exec(rawQuery)) !== null) {
    const textBefore = rawQuery
      .slice(lastIndex, match.index)
      .replaceAll(/\b(?:AND|OR|NOT)\b/gi, '')
      .trim()
    if (textBefore) freeTextParts.push(textBefore)
    lastIndex = match.index + match[0].length

    const field = (match[1] ?? match[3] ?? '').toLowerCase()
    const value = match[2] ?? match[4] ?? ''
    applyKqlField(field, value, where)
  }

  const remaining = rawQuery
    .slice(lastIndex)
    .replaceAll(/\b(?:AND|OR|NOT)\b/gi, '')
    .trim()
  if (remaining) freeTextParts.push(remaining)

  return { freeTextParts }
}

function applyFreeTextSearch(where: Prisma.AlertWhereInput, freeText: string): void {
  where.OR = [
    { title: { contains: freeText, mode: 'insensitive' } },
    { description: { contains: freeText, mode: 'insensitive' } },
    { sourceIp: { contains: freeText } },
    { destinationIp: { contains: freeText } },
    { agentName: { contains: freeText, mode: 'insensitive' } },
    { ruleName: { contains: freeText, mode: 'insensitive' } },
  ]
}

function applyKqlField(field: string, value: string, where: Prisma.AlertWhereInput): void {
  applyKqlValidatedField(field, value, where)
  applyKqlDirectField(field, value, where)
}

function applyKqlValidatedField(field: string, value: string, where: Prisma.AlertWhereInput): void {
  if (field === 'severity' && VALID_SEVERITIES.has(value)) {
    where.severity = value as AlertSeverity
  }
  if (field === 'status' && VALID_STATUSES.has(value)) {
    where.status = value as PrismaAlertStatus
  }
}

function applyKqlDirectField(field: string, value: string, where: Prisma.AlertWhereInput): void {
  const containsInsensitiveFields = new Map<string, keyof Prisma.AlertWhereInput>([
    ['agent', 'agentName'],
    ['agent.name', 'agentName'],
    ['rule', 'ruleName'],
    ['rule.name', 'ruleName'],
    ['rulename', 'ruleName'],
  ])
  const containsCaseSensitiveFields = new Map<string, keyof Prisma.AlertWhereInput>([
    ['sourceip', 'sourceIp'],
    ['source.ip', 'sourceIp'],
    ['destip', 'destinationIp'],
    ['dest.ip', 'destinationIp'],
    ['destination.ip', 'destinationIp'],
  ])

  if (field === 'source') {
    where.source = value
    return
  }

  const insensitiveTarget = containsInsensitiveFields.get(field)
  if (insensitiveTarget) {
    Object.assign(where, { [insensitiveTarget]: { contains: value, mode: 'insensitive' } })
    return
  }

  const sensitiveTarget = containsCaseSensitiveFields.get(field)
  if (sensitiveTarget) {
    Object.assign(where, { [sensitiveTarget]: { contains: value } })
  }
}
