import { IOC_SORT_FIELDS, IOC_TYPE_GROUPS, MISP_SORT_FIELDS } from './intel.constants'
import { toDay, toIso } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type { IOCMatch } from './intel.types'
import type { Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* IOC STATS COMPUTATION                                             */
/* ---------------------------------------------------------------- */

export function computeIOCStats(
  iocCounts: Array<{ iocType: string; _count: { id: number } }>,
  threatActorOrgs: Array<{ organization: string }>
): {
  threatActors: number
  ipIOCs: number
  fileHashes: number
  activeDomains: number
  totalIOCs: number
} {
  const countByType = new Map<string, number>()
  let totalIOCs = 0
  for (const group of iocCounts) {
    countByType.set(group.iocType, group._count.id)
    totalIOCs += group._count.id
  }

  return {
    threatActors: threatActorOrgs.length,
    ipIOCs: (countByType.get('ip-src') ?? 0) + (countByType.get('ip-dst') ?? 0),
    fileHashes:
      (countByType.get('md5') ?? 0) +
      (countByType.get('sha1') ?? 0) +
      (countByType.get('sha256') ?? 0),
    activeDomains: (countByType.get('domain') ?? 0) + (countByType.get('hostname') ?? 0),
    totalIOCs,
  }
}

/* ---------------------------------------------------------------- */
/* IOC WHERE CLAUSE                                                  */
/* ---------------------------------------------------------------- */

export function buildIOCSearchWhere(
  tenantId: string,
  query?: string,
  type?: string,
  source?: string
): Prisma.IntelIOCWhereInput {
  const where: Prisma.IntelIOCWhereInput = { tenantId, active: true }

  if (query && query.trim().length > 0) {
    where.iocValue = { contains: query, mode: 'insensitive' }
  }
  if (type) {
    const expanded = expandIocTypeFilter(type)
    if (expanded.length === 1) {
      where.iocType = expanded[0]
    } else if (expanded.length > 1) {
      where.iocType = { in: expanded }
    }
  }
  if (source) {
    where.source = { contains: source, mode: 'insensitive' }
  }

  return where
}

/* ---------------------------------------------------------------- */
/* IOC TYPE EXPANSION                                                */
/* ---------------------------------------------------------------- */

export function expandIocTypeFilter(type: string): string[] {
  return IOC_TYPE_GROUPS.get(type) ?? [type]
}

/* ---------------------------------------------------------------- */
/* ORDER BY BUILDERS                                                 */
/* ---------------------------------------------------------------- */

export function buildIOCOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.IntelIOCOrderByWithRelationInput {
  return buildOrderBy(IOC_SORT_FIELDS, 'lastSeen', sortBy, sortOrder)
}

export function buildMispOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.IntelMispEventOrderByWithRelationInput {
  return buildOrderBy(MISP_SORT_FIELDS, 'date', sortBy, sortOrder)
}

/* ---------------------------------------------------------------- */
/* MISP EVENT UPSERT MAPPING                                         */
/* ---------------------------------------------------------------- */

export function mapThreatLevel(level: string | number | undefined): string {
  const parsed = Number(level)
  if (parsed === 1) return 'high'
  if (parsed === 2) return 'medium'
  if (parsed === 3) return 'low'
  return 'undefined'
}

export function mapAttributeSeverity(attribute: Record<string, unknown>): string {
  const toIds = attribute['to_ids'] as boolean | undefined
  const category = String(attribute['category'] ?? '').toLowerCase()

  if (toIds && (category.includes('payload') || category.includes('artifacts'))) {
    return 'critical'
  }
  if (toIds) return 'high'
  if (category.includes('network') || category.includes('external')) return 'medium'
  return 'low'
}

export function buildEventUpserts(
  tenantId: string,
  rawEvents: unknown[]
): Array<Prisma.IntelMispEventUpsertArgs> {
  const upserts: Array<Prisma.IntelMispEventUpsertArgs> = []

  for (const rawEvent of rawEvents) {
    const event = rawEvent as Record<string, unknown>
    const mispEventId = String(event['id'] ?? event['event_id'] ?? '')
    if (!mispEventId) continue

    const tags = (event['Tag'] ?? event['tags'] ?? []) as unknown[]
    const orgInfo = event['Orgc'] as Record<string, unknown> | undefined
    const organization = String(
      orgInfo?.['name'] ?? event['org'] ?? event['orgc_name'] ?? 'Unknown'
    )
    const threatLevel = mapThreatLevel(event['threat_level_id'] as string | number | undefined)
    const info = String(event['info'] ?? '')
    const date = toDay(String(event['date'] ?? toIso())).toDate()
    const attributeCount = Number(event['attribute_count'] ?? 0)
    const published = Boolean(event['published'])

    const data = {
      organization,
      threatLevel,
      info,
      date,
      tags: tags as Prisma.InputJsonValue,
      attributeCount,
      published,
    }
    upserts.push({
      where: { tenantId_mispEventId: { tenantId, mispEventId } },
      create: { tenantId, mispEventId, ...data },
      update: data,
    })
  }

  return upserts
}

export function buildIOCUpserts(
  tenantId: string,
  rawAttributes: unknown[]
): Array<Prisma.IntelIOCUpsertArgs> {
  const upserts: Array<Prisma.IntelIOCUpsertArgs> = []

  for (const rawAttribute of rawAttributes) {
    const attribute = rawAttribute as Record<string, unknown>
    const iocValue = String(attribute['value'] ?? '')
    const iocType = String(attribute['type'] ?? 'unknown')
    if (!iocValue) continue

    const attributeTags = (attribute['Tag'] ?? []) as Array<Record<string, unknown>>
    const tagNames = attributeTags.map(tag => String(tag['name'] ?? '')).filter(Boolean)
    const eventId = attribute['event_id'] as string | undefined
    const source = eventId ? `MISP-${eventId}` : 'MISP'
    const severity = mapAttributeSeverity(attribute)
    const firstSeen = toDay(
      String(attribute['first_seen'] ?? attribute['timestamp'] ?? toIso())
    ).toDate()
    const lastSeen = toDay(
      String(attribute['last_seen'] ?? attribute['timestamp'] ?? toIso())
    ).toDate()

    upserts.push({
      where: { tenantId_iocValue_iocType: { tenantId, iocValue, iocType } },
      create: {
        tenantId,
        iocValue,
        iocType,
        source,
        severity,
        hitCount: 0,
        firstSeen,
        lastSeen,
        tags: tagNames,
        active: true,
      },
      update: { source, severity, lastSeen, tags: tagNames },
    })
  }

  return upserts
}

/* ---------------------------------------------------------------- */
/* IOC MATCHING                                                      */
/* ---------------------------------------------------------------- */

export function collectAlertIPs(
  alerts: Array<{ sourceIp: string | null; destinationIp: string | null }>
): string[] {
  const ipSet = new Set<string>()
  for (const alert of alerts) {
    if (alert.sourceIp) ipSet.add(alert.sourceIp)
    if (alert.destinationIp) ipSet.add(alert.destinationIp)
  }
  return [...ipSet]
}

export function buildIOCLookupMap(
  matchingIOCs: Array<{ iocValue: string; iocType: string; source: string; severity: string }>
): Map<string, IOCMatch[]> {
  const map = new Map<string, IOCMatch[]>()
  for (const ioc of matchingIOCs) {
    const existing = map.get(ioc.iocValue) ?? []
    existing.push({
      iocValue: ioc.iocValue,
      iocType: ioc.iocType,
      source: ioc.source,
      severity: ioc.severity,
    })
    map.set(ioc.iocValue, existing)
  }
  return map
}

export function matchAlertsToIOCs(
  alertIds: string[],
  alerts: Array<{ id: string; sourceIp: string | null; destinationIp: string | null }>,
  iocByValue: Map<string, IOCMatch[]>
): Array<{ alertId: string; matchedIOCs: IOCMatch[]; matchCount: number }> {
  return alertIds.map(alertId => {
    const alert = alerts.find(a => a.id === alertId)
    if (!alert) return { alertId, matchedIOCs: [], matchCount: 0 }

    const matched: IOCMatch[] = []
    if (alert.sourceIp && iocByValue.has(alert.sourceIp)) {
      matched.push(...(iocByValue.get(alert.sourceIp) ?? []))
    }
    if (alert.destinationIp && iocByValue.has(alert.destinationIp)) {
      matched.push(...(iocByValue.get(alert.destinationIp) ?? []))
    }

    const seen = new Set<string>()
    const deduped = matched.filter(entry => {
      const key = `${entry.iocValue}:${entry.iocType}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return { alertId, matchedIOCs: deduped, matchCount: deduped.length }
  })
}

/* ---------------------------------------------------------------- */
/* SYNC RESULT COUNTING                                              */
/* ---------------------------------------------------------------- */

export function countFulfilled(results: Array<PromiseSettledResult<unknown>>): number {
  let count = 0
  for (const r of results) {
    if (r.status === 'fulfilled') count++
  }
  return count
}

export function countRejected(results: Array<PromiseSettledResult<unknown>>): number {
  let count = 0
  for (const r of results) {
    if (r.status === 'rejected') count++
  }
  return count
}

/* ---------------------------------------------------------------- */
/* AI CONTEXT BUILDING                                               */
/* ---------------------------------------------------------------- */

export function buildIocEnrichContext(ioc: {
  iocType: string
  iocValue: string
  source: string | null
  tags: string[]
  firstSeen: Date | null
  lastSeen: Date | null
  active: boolean
}): Record<string, unknown> {
  return {
    iocType: ioc.iocType,
    iocValue: ioc.iocValue,
    source: ioc.source ?? '',
    tags: ioc.tags ?? [],
    firstSeen: ioc.firstSeen ? toIso(ioc.firstSeen) : '',
    lastSeen: ioc.lastSeen ? toIso(ioc.lastSeen) : '',
    active: ioc.active,
  }
}

export function buildAdvisoryContext(
  iocs: Array<{
    iocType: string
    iocValue: string
    source: string | null
    tags: string[]
    firstSeen: Date | null
    lastSeen: Date | null
  }>
): Record<string, unknown> {
  return {
    iocs: iocs.map(ioc => ({
      iocType: ioc.iocType,
      iocValue: ioc.iocValue,
      source: ioc.source ?? '',
      tags: ioc.tags ?? [],
      firstSeen: ioc.firstSeen ? toIso(ioc.firstSeen) : '',
      lastSeen: ioc.lastSeen ? toIso(ioc.lastSeen) : '',
    })),
  }
}
