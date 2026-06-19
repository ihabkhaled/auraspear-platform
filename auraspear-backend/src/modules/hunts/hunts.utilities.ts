import { RANGE_MAP, SEVERITY_WEIGHTS } from './hunts.constants'
import { AlertSeverity, SortOrder } from '../../common/enums'
import { nowDate, toDay, toIso } from '../../common/utils/date-time.utility'
import { sanitizeEsQueryString } from '../../common/utils/es-sanitize.utility'
import type { HuntEventData } from './hunts.types'

/* ---------------------------------------------------------------- */
/* ES QUERY BUILDER                                                  */
/* ---------------------------------------------------------------- */

export function buildHuntEsQuery(
  sanitizedQuery: string,
  timeRange: string
): Record<string, unknown> {
  const now = nowDate()
  const rangeMs = RANGE_MAP.get(timeRange) ?? 24 * 60 * 60 * 1000
  const from = toDay(now).subtract(rangeMs, 'millisecond').toDate()

  return {
    query: {
      bool: {
        must: [
          {
            simple_query_string: {
              query: sanitizedQuery,
              fields: [
                'rule.description',
                'rule.groups',
                'full_log',
                'data.srcip',
                'data.dstuser',
                'data.srcuser',
                'agent.name',
                'decoder.name',
              ],
              default_operator: 'OR',
              minimum_should_match: '1',
              lenient: true,
            },
          },
        ],
        filter: [{ range: { timestamp: { gte: toIso(from), lte: toIso(now) } } }],
      },
    },
    sort: [{ timestamp: { order: SortOrder.DESC } }],
  }
}

/* ---------------------------------------------------------------- */
/* NESTED FIELD ACCESS                                               */
/* ---------------------------------------------------------------- */

export function getNestedValue(source: Record<string, unknown>, path: string): unknown {
  const sourceMap = new Map(Object.entries(source))
  if (sourceMap.has(path)) return sourceMap.get(path)

  const parts = path.split('.')
  let current: unknown = source
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    const currentMap = new Map(Object.entries(current as Record<string, unknown>))
    current = currentMap.get(part)
  }
  return current
}

export function extractNestedField(
  source: Record<string, unknown> | undefined,
  paths: string[]
): string | null {
  if (!source) return null
  for (const path of paths) {
    const value = getNestedValue(source, path)
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

/* ---------------------------------------------------------------- */
/* SEVERITY EXTRACTION                                               */
/* ---------------------------------------------------------------- */

export function extractSeverity(source: Record<string, unknown> | undefined): string {
  if (!source) return AlertSeverity.INFO

  const ruleLevel = getNestedValue(source, 'rule.level') as number | undefined
  if (ruleLevel !== undefined) {
    if (ruleLevel >= 12) return AlertSeverity.CRITICAL
    if (ruleLevel >= 8) return AlertSeverity.HIGH
    if (ruleLevel >= 5) return AlertSeverity.MEDIUM
    if (ruleLevel >= 3) return AlertSeverity.LOW
    return AlertSeverity.INFO
  }

  return (source.severity as string) ?? AlertSeverity.INFO
}

/* ---------------------------------------------------------------- */
/* DESCRIPTION EXTRACTION                                            */
/* ---------------------------------------------------------------- */

export function extractDescription(source: Record<string, unknown> | undefined): string {
  if (!source) return 'No description available'

  const ruleDescription = extractNestedField(source, ['rule.description'])
  if (ruleDescription) return ruleDescription

  const fullLog = extractNestedField(source, ['full_log'])
  if (fullLog) return fullLog.slice(0, 500)

  const message = extractNestedField(source, ['message'])
  if (message) return message.slice(0, 500)

  return 'No description available'
}

/* ---------------------------------------------------------------- */
/* HIT → EVENT DATA MAPPING                                          */
/* ---------------------------------------------------------------- */

export function mapHitsToEventData(hits: unknown[], sessionId: string): HuntEventData[] {
  return hits.map((hit: unknown) => {
    const source = (hit as Record<string, unknown>)['_source'] as
      | Record<string, unknown>
      | undefined
    const id = (hit as Record<string, unknown>)['_id'] as string | undefined

    return {
      huntSessionId: sessionId,
      timestamp: source?.timestamp ? toDay(source.timestamp as string).toDate() : nowDate(),
      severity: extractSeverity(source),
      eventId: id ?? 'unknown',
      sourceIp: extractNestedField(source, ['src_ip', 'data.srcip', 'agent.ip']),
      user: extractNestedField(source, ['data.dstuser', 'data.srcuser']),
      description: extractDescription(source),
    }
  })
}

/* ---------------------------------------------------------------- */
/* MITRE EXTRACTION                                                  */
/* ---------------------------------------------------------------- */

export function extractMitreFromHits(hits: unknown[]): {
  mitreTactics: string[]
  mitreTechniques: string[]
} {
  const tacticSet = new Set<string>()
  const techniqueSet = new Set<string>()

  for (const hit of hits) {
    const source = (hit as Record<string, unknown>)['_source'] as
      | Record<string, unknown>
      | undefined
    if (!source) continue
    const rule = source['rule'] as Record<string, unknown> | undefined
    if (!rule) continue
    const mitre = rule['mitre'] as Record<string, unknown> | undefined
    if (!mitre) continue
    const tactics = mitre['tactic'] as string[] | undefined
    const techniques = mitre['id'] as string[] | undefined
    if (tactics) {
      for (const t of tactics) {
        tacticSet.add(t)
      }
    }
    if (techniques) {
      for (const t of techniques) {
        techniqueSet.add(t)
      }
    }
  }

  return { mitreTactics: [...tacticSet], mitreTechniques: [...techniqueSet] }
}

/* ---------------------------------------------------------------- */
/* UNIQUE IP COUNT                                                   */
/* ---------------------------------------------------------------- */

export function countUniqueIps(events: HuntEventData[]): number {
  const ipSet = new Set<string>()
  for (const event of events) {
    if (event.sourceIp) {
      ipSet.add(event.sourceIp)
    }
  }
  return ipSet.size
}

/* ---------------------------------------------------------------- */
/* THREAT SCORE                                                      */
/* ---------------------------------------------------------------- */

export function computeThreatScore(
  events: Array<{ severity: string }>,
  uniqueIpCount: number,
  mitreTechCount: number
): number {
  if (events.length === 0) return 0

  let totalWeight = 0
  let hasCritical = false
  for (const event of events) {
    const weight = SEVERITY_WEIGHTS[event.severity] ?? 1
    totalWeight += weight
    if (event.severity === AlertSeverity.CRITICAL) {
      hasCritical = true
    }
  }

  let volumeBonus = 0
  if (events.length >= 100) {
    volumeBonus = 10
  } else if (events.length >= 10) {
    volumeBonus = 5
  }

  const avgWeight = totalWeight / events.length
  const score = Math.floor(
    avgWeight * 12 +
      Math.min(uniqueIpCount, 10) * 2 +
      Math.min(mitreTechCount, 5) * 4 +
      volumeBonus +
      (hasCritical ? 15 : 0)
  )

  return Math.min(100, score)
}

/* ---------------------------------------------------------------- */
/* REASONING BUILDER                                                 */
/* ---------------------------------------------------------------- */

export function buildHuntReasoning(
  timeRange: string,
  total: number,
  uniqueIpCount: number,
  mitreTechniques: string[],
  threatScore: number
): string[] {
  return [
    'Querying Wazuh Indexer for matching events',
    `Filtering events within ${timeRange} time range`,
    'Executed query against wazuh-alerts-* index',
    `Found ${total} matching events`,
    `Identified ${uniqueIpCount} unique source IPs`,
    mitreTechniques.length > 0
      ? `Mapped to ${mitreTechniques.length} MITRE ATT&CK techniques: ${mitreTechniques.join(', ')}`
      : 'No MITRE ATT&CK techniques identified in results',
    `Computed threat score: ${threatScore}/100`,
  ]
}

/* ---------------------------------------------------------------- */
/* HUNT ANALYSIS GENERATION                                          */
/* ---------------------------------------------------------------- */

export function generateHuntAnalysis(
  query: string,
  eventsFound: number,
  uniqueIps: number,
  techniques: string[],
  events: Array<{ severity: string; sourceIp: string | null; description: string }>
): string {
  const safeQuery = query.replaceAll(/[<>"'&]/g, '')
  const severityBreakdown = buildSeverityBreakdown(events)
  const topIps = buildTopIps(events)
  const uniqueDescriptions = buildUniqueDescriptions(events)
  const threatScore = computeThreatScore(events, uniqueIps, techniques.length)

  return `## Threat Hunt Analysis: "${safeQuery}"

**Summary:** Found **${eventsFound} events** across **${uniqueIps} unique source IP(s)** with a threat score of **${threatScore}/100**.

**Severity Breakdown:**
${severityBreakdown || '- No events found'}

**Top Source IPs:**
${topIps || '- No source IPs identified'}

**Event Types Detected:**
${uniqueDescriptions || '- No descriptions available'}

${techniques.length > 0 ? `**MITRE ATT&CK Coverage:** ${techniques.join(', ')}` : '**MITRE ATT&CK Coverage:** No techniques mapped from results'}

**Recommended Actions:**
1. ${eventsFound > 20 ? 'High event volume detected — prioritize triage of critical and high severity events' : 'Review all matching events for indicators of compromise'}
2. ${uniqueIps > 3 ? `Investigate the ${uniqueIps} unique source IPs for malicious activity` : 'Check source IPs against threat intelligence feeds'}
3. ${techniques.length > 0 ? `Map findings to MITRE ATT&CK techniques: ${techniques.join(', ')}` : 'Manually map findings to MITRE ATT&CK framework for coverage analysis'}
4. Cross-reference with related alerts and cases for correlation
5. Document findings and escalate if true positive indicators are confirmed`
}

function buildSeverityBreakdown(events: Array<{ severity: string }>): string {
  const counts: Record<string, number> = {}
  for (const event of events) {
    counts[event.severity] = (counts[event.severity] ?? 0) + 1
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([severity, count]) => `- **${severity.toUpperCase()}**: ${count} event(s)`)
    .join('\n')
}

function buildTopIps(events: Array<{ sourceIp: string | null }>): string {
  const ipCounts: Record<string, number> = {}
  for (const event of events) {
    if (event.sourceIp) {
      ipCounts[event.sourceIp] = (ipCounts[event.sourceIp] ?? 0) + 1
    }
  }
  return Object.entries(ipCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([ip, count]) => `- \`${ip}\` — ${count} event(s)`)
    .join('\n')
}

function buildUniqueDescriptions(events: Array<{ description: string }>): string {
  return [...new Set(events.map(e => e.description))]
    .slice(0, 5)
    .map(desc => `- ${desc}`)
    .join('\n')
}

/* ---------------------------------------------------------------- */
/* QUERY SANITIZATION                                                */
/* ---------------------------------------------------------------- */

/**
 * Sanitize a user-supplied ES query string.
 * Delegates to the shared utility in `common/utils/es-sanitize.utility.ts`.
 */
export function sanitizeEsQuery(query: string): string {
  return sanitizeEsQueryString(query)
}
