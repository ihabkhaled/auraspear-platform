import { CardVariant, Severity as SeverityEnum } from '../../common/enums'
import { nowMs, toIso } from '../../common/utils/date-time.utility'
import type {
  WorkspaceSummaryCard,
  WorkspaceRecentItem,
  WorkspaceEntity,
} from './types/connector-workspace.types'
import type { Severity } from '../../common/enums'

/* ---------------------------------------------------------------- */
/* GRAYLOG MAPPING UTILITIES                                         */
/* ---------------------------------------------------------------- */

export function mapGraylogPriority(priority: number): Severity {
  if (priority >= 4) return SeverityEnum.CRITICAL
  if (priority >= 3) return SeverityEnum.HIGH
  if (priority >= 2) return SeverityEnum.MEDIUM
  if (priority >= 1) return SeverityEnum.LOW
  return SeverityEnum.INFO
}

export function extractGraylogEventRecord(rawEvent: unknown): Record<string, unknown> {
  const wrapper = rawEvent as Record<string, unknown>
  const event = (wrapper.event ?? wrapper) as Record<string, unknown>
  return event
}

export function mapGraylogEventToRecentItem(rawEvent: unknown): WorkspaceRecentItem {
  const event = extractGraylogEventRecord(rawEvent)
  return {
    id: (event.id ?? '') as string,
    title: (event.message ?? 'Event') as string,
    timestamp: (event.timestamp ?? '') as string,
    severity: mapGraylogPriority((event.priority ?? 2) as number),
    type: 'event',
  }
}

export function mapGraylogOverviewEvent(rawEvent: unknown): WorkspaceRecentItem {
  const event = extractGraylogEventRecord(rawEvent)
  return {
    id: (event.id ?? String(Math.random())) as string,
    title: (event.message ?? event.key ?? 'Event') as string,
    timestamp: (event.timestamp ?? '') as string,
    severity: mapGraylogPriority((event.priority ?? 2) as number),
    type: 'event',
    metadata: {
      source: event.source,
      eventDefinitionId: event.event_definition_id,
    },
  }
}

export function mapGraylogDefinitionToEntity(definition: unknown): WorkspaceEntity {
  const d = definition as Record<string, unknown>
  return {
    id: (d.id ?? '') as string,
    name: (d.title ?? 'Untitled') as string,
    status: (d.state ?? 'unknown') as string,
    type: 'event-definition',
    metadata: { priority: d.priority },
  }
}

export function buildGraylogDefinitionOverviewEntity(definition: unknown): WorkspaceEntity {
  const d = definition as Record<string, unknown>
  return {
    id: (d.id ?? '') as string,
    name: (d.title ?? 'Untitled') as string,
    status: (d.state ?? 'unknown') as string,
    type: 'event-definition',
    metadata: { priority: d.priority, description: d.description },
  }
}

/* ---------------------------------------------------------------- */
/* WAZUH MAPPING UTILITIES                                           */
/* ---------------------------------------------------------------- */

export function mapWazuhLevel(level: number): Severity {
  if (level >= 12) return SeverityEnum.CRITICAL
  if (level >= 8) return SeverityEnum.HIGH
  if (level >= 5) return SeverityEnum.MEDIUM
  if (level >= 3) return SeverityEnum.LOW
  return SeverityEnum.INFO
}

export function alertVariant(total: number): CardVariant {
  if (total > 100) return CardVariant.ERROR
  if (total > 0) return CardVariant.WARNING
  return CardVariant.SUCCESS
}

export function extractWazuhHitFields(hit: unknown): {
  id: string
  source: Record<string, unknown>
  rule: Record<string, unknown>
} {
  const h = hit as Record<string, unknown>
  const source = (h._source ?? h) as Record<string, unknown>
  const rule = (source.rule ?? {}) as Record<string, unknown>
  return {
    id: (h._id ?? '') as string,
    source,
    rule,
  }
}

export function mapWazuhHitToRecentItem(hit: unknown): WorkspaceRecentItem {
  const { id, source, rule } = extractWazuhHitFields(hit)
  return {
    id: id || String(Math.random()),
    title: (rule.description ?? source.full_log ?? 'Alert') as string,
    description: (rule.groups as string[] | undefined)?.join(', '),
    timestamp: (source.timestamp ?? source['@timestamp'] ?? '') as string,
    severity: mapWazuhLevel((rule.level ?? 0) as number),
    type: 'alert',
    metadata: {
      ruleId: rule.id,
      ruleLevel: rule.level,
      agentName: (source.agent as Record<string, unknown>)?.name,
    },
  }
}

export function mapWazuhHitToSearchResult(hit: unknown): WorkspaceRecentItem {
  const { id, source, rule } = extractWazuhHitFields(hit)
  return {
    id,
    title: (rule.description ?? source.full_log ?? 'Result') as string,
    timestamp: (source.timestamp ?? '') as string,
    severity: mapWazuhLevel((rule.level ?? 0) as number),
    type: 'alert',
  }
}

export function mapWazuhHitToActivityItem(hit: unknown): WorkspaceRecentItem {
  const { id, source, rule } = extractWazuhHitFields(hit)
  return {
    id: id || String(Math.random()),
    title: (rule.description ?? source.full_log ?? 'Alert') as string,
    description: (rule.groups as string[] | undefined)?.join(', '),
    timestamp: (source.timestamp ?? source['@timestamp'] ?? '') as string,
    severity: mapWazuhLevel((rule.level ?? 0) as number),
    type: 'alert',
    metadata: {
      ruleId: rule.id,
      ruleLevel: rule.level,
    },
  }
}

export function mapWazuhAgentToEntity(agent: unknown): WorkspaceEntity {
  const a = agent as Record<string, unknown>
  return {
    id: (a.id ?? a.name ?? 'unknown') as string,
    name: (a.name ?? 'Unknown') as string,
    status: (a.status ?? 'unknown') as string,
    type: 'agent',
    lastSeen: (a.lastKeepAlive ?? '') as string,
    metadata: {
      os: (a.os as Record<string, unknown>)?.name,
      ip: a.ip,
      version: a.version,
      group: a.group,
    },
  }
}

export function mapWazuhAgentToOverviewEntity(agent: unknown): WorkspaceEntity {
  const a = agent as Record<string, unknown>
  return {
    id: (a.id ?? a.name ?? 'unknown') as string,
    name: (a.name ?? 'Unknown Agent') as string,
    status: (a.status ?? 'unknown') as string,
    type: 'agent',
    lastSeen: (a.lastKeepAlive ?? a.dateAdd ?? '') as string,
    metadata: {
      os: (a.os as Record<string, unknown>)?.name,
      ip: a.ip,
      version: a.version,
    },
  }
}

/* ---------------------------------------------------------------- */
/* MISP MAPPING UTILITIES                                            */
/* ---------------------------------------------------------------- */

export function mapMispThreatLevel(level: string): Severity {
  switch (level) {
    case '1':
      return SeverityEnum.CRITICAL
    case '2':
      return SeverityEnum.HIGH
    case '3':
      return SeverityEnum.MEDIUM
    case '4':
      return SeverityEnum.LOW
    default:
      return SeverityEnum.INFO
  }
}

export function extractMispEventRecord(event: unknown): Record<string, unknown> {
  const wrapper = event as Record<string, unknown>
  return wrapper.Event
    ? (wrapper.Event as Record<string, unknown>)
    : (wrapper as Record<string, unknown>)
}

export function mapMispEventToRecentItem(event: unknown): WorkspaceRecentItem {
  const e = extractMispEventRecord(event)
  return {
    id: (e.id ?? '') as string,
    title: (e.info ?? 'MISP Event') as string,
    timestamp: (e.date ?? '') as string,
    severity: mapMispThreatLevel((e.threat_level_id ?? '3') as string),
    type: 'event',
  }
}

export function mapMispEventToEntity(event: unknown): WorkspaceEntity {
  const e = extractMispEventRecord(event)
  return {
    id: (e.id ?? '') as string,
    name: (e.info ?? 'MISP Event') as string,
    status: (e.published ? 'published' : 'draft') as string,
    type: 'event',
    metadata: {
      threatLevel: e.threat_level_id,
      attributeCount: e.attribute_count,
    },
  }
}

export function mapMispOverviewEvent(event: unknown): {
  recentItem: WorkspaceRecentItem
  entity: WorkspaceEntity
  tags: Array<{ name: string }>
} {
  const e = extractMispEventRecord(event)

  const recentItem: WorkspaceRecentItem = {
    id: (e.id ?? '') as string,
    title: (e.info ?? 'MISP Event') as string,
    timestamp: (e.date ?? e.timestamp ?? '') as string,
    severity: mapMispThreatLevel((e.threat_level_id ?? '3') as string),
    type: 'event',
    metadata: {
      orgName: (e.Org as Record<string, unknown>)?.name ?? e.orgc_id,
      attributeCount: e.attribute_count,
    },
  }

  const entity: WorkspaceEntity = {
    id: (e.id ?? '') as string,
    name: (e.info ?? 'MISP Event') as string,
    status: (e.published ? 'published' : 'draft') as string,
    type: 'event',
    metadata: {
      threatLevel: e.threat_level_id,
      analysis: e.analysis,
    },
  }

  const rawTags = e.Tag as Array<Record<string, unknown>> | undefined
  const tags: Array<{ name: string }> = []
  if (rawTags) {
    for (const tag of rawTags) {
      tags.push({ name: (tag.name ?? '') as string })
    }
  }

  return { recentItem, entity, tags }
}

export function mapMispAttributeToSearchResult(attribute: unknown): WorkspaceRecentItem {
  const a = attribute as Record<string, unknown>
  return {
    id: (a.id ?? '') as string,
    title: `${a.type}: ${a.value}`,
    description: (a.comment ?? '') as string,
    timestamp: (a.timestamp ?? '') as string,
    severity: SeverityEnum.INFO,
    type: 'ioc',
    metadata: {
      category: a.category,
      toIds: a.to_ids,
      eventId: a.event_id,
    },
  }
}

/* ---------------------------------------------------------------- */
/* LOGSTASH MAPPING UTILITIES                                        */
/* ---------------------------------------------------------------- */

export function mapLogstashPipelineToEntity(name: string, pipelineValue: unknown): WorkspaceEntity {
  const pipeline = pipelineValue as Record<string, unknown> | undefined
  return {
    id: name,
    name,
    status: 'active',
    type: 'pipeline',
    metadata: {
      workers: pipeline?.workers,
      batchSize: pipeline?.batch_size,
      batchDelay: pipeline?.batch_delay,
    },
  }
}

export function mapLogstashPipelineToOverviewEntity(
  name: string,
  pipelineValue: unknown
): WorkspaceEntity {
  const pipeline = pipelineValue as Record<string, unknown> | undefined
  return {
    id: name,
    name,
    status: 'active',
    type: 'pipeline',
    metadata: {
      workers: pipeline?.workers,
      batchSize: pipeline?.batch_size,
    },
  }
}

export function buildLogstashPipelineStatsItem(
  name: string,
  statValue: unknown
): { item: WorkspaceRecentItem; eventsIn: number; eventsOut: number; eventsFiltered: number } {
  const stat = statValue as Record<string, unknown> | undefined
  const events = stat?.events as Record<string, unknown> | undefined

  const eventsIn = (events?.in ?? 0) as number
  const eventsOut = (events?.out ?? 0) as number
  const eventsFiltered = (events?.filtered ?? 0) as number

  const item: WorkspaceRecentItem = {
    id: name,
    title: `Pipeline: ${name}`,
    description: `In: ${eventsIn} | Out: ${eventsOut} | Filtered: ${eventsFiltered}`,
    timestamp: toIso(),
    severity: SeverityEnum.INFO,
    type: 'pipeline-stats',
    metadata: { eventsIn, eventsOut, eventsFiltered },
  }

  return { item, eventsIn, eventsOut, eventsFiltered }
}

export function buildLogstashStatsSummaryCards(
  totalEventsIn: number,
  totalEventsOut: number,
  totalEventsFiltered: number
): WorkspaceSummaryCard[] {
  const dropped = totalEventsIn - totalEventsOut - totalEventsFiltered
  return [
    {
      key: 'events-in',
      label: 'Events In (total)',
      value: totalEventsIn,
      icon: 'arrow-down',
      variant: CardVariant.INFO,
    },
    {
      key: 'events-out',
      label: 'Events Out (total)',
      value: totalEventsOut,
      icon: 'arrow-up',
      variant: CardVariant.INFO,
    },
    {
      key: 'events-dropped',
      label: 'Events Dropped (est.)',
      value: Math.max(0, dropped),
      icon: 'alert-circle',
      variant: dropped > 0 ? CardVariant.WARNING : CardVariant.SUCCESS,
    },
  ]
}

export function mapLogstashActivityItem(name: string, statValue: unknown): WorkspaceRecentItem {
  const stat = statValue as Record<string, unknown> | undefined
  const events = stat?.events as Record<string, unknown> | undefined

  return {
    id: name,
    title: `Pipeline: ${name}`,
    description: `In: ${events?.in ?? 0} | Out: ${events?.out ?? 0}`,
    timestamp: toIso(),
    severity: SeverityEnum.INFO,
    type: 'pipeline-stats',
  }
}

/* ---------------------------------------------------------------- */
/* SHUFFLE MAPPING UTILITIES                                         */
/* ---------------------------------------------------------------- */

export function mapShuffleWorkflowToEntity(workflow: unknown): WorkspaceEntity {
  const w = workflow as Record<string, unknown>
  return {
    id: (w.id ?? '') as string,
    name: (w.name ?? 'Untitled') as string,
    status: w.is_valid ? 'active' : 'inactive',
    type: 'workflow',
    metadata: { actions: (w.actions as unknown[])?.length ?? 0 },
  }
}

export function mapShuffleWorkflowToOverviewEntity(workflow: unknown): WorkspaceEntity {
  const w = workflow as Record<string, unknown>
  return {
    id: (w.id ?? '') as string,
    name: (w.name ?? 'Untitled') as string,
    status: w.is_valid ? 'active' : 'inactive',
    type: 'workflow',
    metadata: {
      actions: (w.actions as unknown[])?.length ?? 0,
      triggers: (w.triggers as unknown[])?.length ?? 0,
    },
  }
}

export function mapShuffleWorkflowToRecentItem(workflow: unknown): WorkspaceRecentItem {
  const w = workflow as Record<string, unknown>
  return {
    id: (w.id ?? '') as string,
    title: (w.name ?? 'Workflow') as string,
    timestamp: (w.edited ?? '') as string,
    severity: SeverityEnum.INFO,
    type: 'workflow',
  }
}

export function mapShuffleWorkflowToOverviewRecentItem(workflow: unknown): WorkspaceRecentItem {
  const w = workflow as Record<string, unknown>
  return {
    id: (w.id ?? '') as string,
    title: (w.name ?? 'Workflow') as string,
    description: w.is_valid ? 'Active' : 'Inactive',
    timestamp: (w.edited ?? w.created ?? '') as string,
    severity: w.is_valid ? SeverityEnum.INFO : SeverityEnum.LOW,
    type: 'workflow',
  }
}

/* ---------------------------------------------------------------- */
/* VELOCIRAPTOR MAPPING UTILITIES                                     */
/* ---------------------------------------------------------------- */

export function mapVelociraptorClientToEntity(client: unknown): WorkspaceEntity {
  const cl = client as Record<string, unknown>
  const info = (cl.os_info ?? {}) as Record<string, unknown>
  return {
    id: (cl.client_id ?? '') as string,
    name: (info.fqdn ?? info.hostname ?? cl.client_id ?? 'Unknown') as string,
    status: cl.last_seen_at ? 'seen' : 'unknown',
    type: 'client',
    lastSeen: cl.last_seen_at ? toIso(Number(cl.last_seen_at) / 1000) : undefined,
    metadata: { os: info.system, clientId: cl.client_id },
  }
}

export function mapVelociraptorClientToOverviewEntity(client: unknown): WorkspaceEntity {
  const cl = client as Record<string, unknown>
  const info = (cl.os_info ?? {}) as Record<string, unknown>
  return {
    id: (cl.client_id ?? '') as string,
    name: (info.fqdn ?? info.hostname ?? cl.client_id ?? 'Unknown') as string,
    status: cl.last_seen_at ? 'seen' : 'unknown',
    type: 'client',
    lastSeen: cl.last_seen_at ? toIso(Number(cl.last_seen_at) / 1000) : undefined,
    metadata: { os: info.system, release: info.release, clientId: cl.client_id },
  }
}

export function mapVelociraptorClientToRecentItem(client: unknown): WorkspaceRecentItem {
  const cl = client as Record<string, unknown>
  const info = (cl.os_info ?? {}) as Record<string, unknown>
  return {
    id: (cl.client_id ?? '') as string,
    title: `Client: ${(info.fqdn ?? info.hostname ?? cl.client_id) as string}`,
    timestamp: cl.last_seen_at ? toIso(Number(cl.last_seen_at) / 1000) : '',
    severity: SeverityEnum.INFO,
    type: 'client-activity',
  }
}

export function isVelociraptorClientOnline(client: unknown): boolean {
  const cl = client as Record<string, unknown>
  return Boolean(cl.last_seen_at) && nowMs() - Number(cl.last_seen_at) < 300_000_000
}

export function sortVelociraptorClientsByLastSeen(clients: unknown[]): unknown[] {
  return [...clients].sort((a, b) => {
    const aTime = Number((a as Record<string, unknown>).last_seen_at ?? 0)
    const bTime = Number((b as Record<string, unknown>).last_seen_at ?? 0)
    return bTime - aTime
  })
}

/* ---------------------------------------------------------------- */
/* SHARED UTILITIES                                                  */
/* ---------------------------------------------------------------- */

export function buildErrorSummaryCard(
  key: string,
  label: string,
  icon: string
): WorkspaceSummaryCard {
  return {
    key,
    label,
    value: 'N/A',
    icon,
    variant: CardVariant.ERROR,
  }
}

export function paginateArray<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}
