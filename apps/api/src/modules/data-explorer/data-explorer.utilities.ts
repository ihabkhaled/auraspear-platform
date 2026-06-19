import { ShuffleWorkflowValidity } from '../../common/enums'
import { nowDate, toIso, fromUnixToDate } from '../../common/utils/date-time.utility'
import type { Prisma } from '@prisma/client'

/* ---------------------------------------------------------------- */
/* OVERVIEW SUMMARY MAP                                              */
/* ---------------------------------------------------------------- */

export function buildSyncSummaryMap(
  syncSummary: Array<{ status: string; _count: number; connectorType: string }>
): Map<string, { count: number; connectors: string[] }> {
  const map = new Map<string, { count: number; connectors: string[] }>([
    ['running', { count: 0, connectors: [] }],
    ['completed', { count: 0, connectors: [] }],
    ['failed', { count: 0, connectors: [] }],
  ])
  for (const group of syncSummary) {
    const entry = map.get(group.status)
    if (entry) {
      entry.count += group._count
      if (!entry.connectors.includes(group.connectorType)) {
        entry.connectors.push(group.connectorType)
      }
    }
  }
  return map
}

export function mapConnectorOverview(
  connectors: Array<{
    type: string
    enabled: boolean
    lastTestOk: boolean | null
    lastSyncAt: Date | null
  }>
): Array<{ type: string; enabled: boolean; configured: boolean; lastSyncAt: string | null }> {
  return connectors.map(c => ({
    type: c.type,
    enabled: c.enabled,
    configured: c.lastTestOk === true,
    lastSyncAt: c.lastSyncAt ? toIso(c.lastSyncAt) : null,
  }))
}

/* ---------------------------------------------------------------- */
/* BATCH RESULT COUNTING                                             */
/* ---------------------------------------------------------------- */

export function countBatchResults(results: Array<PromiseSettledResult<unknown>>): {
  synced: number
  failed: number
} {
  let synced = 0
  let failed = 0
  for (const result of results) {
    if (result.status === 'fulfilled') {
      synced++
    } else {
      failed++
    }
  }
  return { synced, failed }
}

/* ---------------------------------------------------------------- */
/* WHERE CLAUSE BUILDERS                                             */
/* ---------------------------------------------------------------- */

export function buildGrafanaDashboardWhere(
  tenantId: string,
  dto: { search?: string; tag?: string; folder?: string; starred?: boolean }
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }
  if (dto.search) {
    where['title'] = { contains: dto.search, mode: 'insensitive' }
  }
  if (dto.tag) {
    where['tags'] = { has: dto.tag }
  }
  if (dto.folder) {
    where['folderTitle'] = { contains: dto.folder, mode: 'insensitive' }
  }
  if (dto.starred !== undefined) {
    where['isStarred'] = dto.starred
  }
  return where
}

export function buildVelociraptorEndpointWhere(
  tenantId: string,
  dto: { search?: string; os?: string; label?: string }
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }
  if (dto.search) {
    where['hostname'] = { contains: dto.search, mode: 'insensitive' }
  }
  if (dto.os) {
    where['os'] = { contains: dto.os, mode: 'insensitive' }
  }
  if (dto.label) {
    where['labels'] = { has: dto.label }
  }
  return where
}

export function buildVelociraptorHuntWhere(
  tenantId: string,
  dto: { search?: string; state?: string }
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }
  if (dto.search) {
    where['description'] = { contains: dto.search, mode: 'insensitive' }
  }
  if (dto.state) {
    where['state'] = dto.state
  }
  return where
}

export function buildLogstashLogWhere(
  tenantId: string,
  dto: { search?: string; level?: string; pipelineId?: string }
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }
  if (dto.search) {
    where['message'] = { contains: dto.search, mode: 'insensitive' }
  }
  if (dto.level) {
    where['level'] = dto.level
  }
  if (dto.pipelineId) {
    where['pipelineId'] = { contains: dto.pipelineId, mode: 'insensitive' }
  }
  return where
}

export function buildShuffleWorkflowWhere(
  tenantId: string,
  dto: { search?: string; status?: string }
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }
  if (dto.search) {
    where['name'] = { contains: dto.search, mode: 'insensitive' }
  }
  if (dto.status === ShuffleWorkflowValidity.VALID) {
    where['isValid'] = true
  } else if (dto.status === ShuffleWorkflowValidity.INVALID) {
    where['isValid'] = false
  }
  return where
}

export function buildSyncJobWhere(
  tenantId: string,
  dto: { connectorType?: string; status?: string }
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId }
  if (dto.connectorType) {
    where['connectorType'] = dto.connectorType
  }
  if (dto.status) {
    where['status'] = dto.status
  }
  return where
}

/* ---------------------------------------------------------------- */
/* MISP SEARCH PARAMS                                                */
/* ---------------------------------------------------------------- */

export function buildMispSearchParameters(dto: {
  value?: string
  type?: string
  category?: string
}): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  if (dto.value) params['value'] = dto.value
  if (dto.type) params['type'] = dto.type
  if (dto.category) params['category'] = dto.category
  return params
}

export function isMispAttributeSearch(dto: {
  value?: string
  type?: string
  category?: string
}): boolean {
  return Boolean(dto.value ?? dto.type ?? dto.category)
}

/* ---------------------------------------------------------------- */
/* GRAFANA DASHBOARD MAPPING                                         */
/* ---------------------------------------------------------------- */

export function mapGrafanaDashboardUpsert(
  tenantId: string,
  dashboard: Record<string, unknown>
): {
  uid: string
  create: Prisma.GrafanaDashboardUncheckedCreateInput
  update: Prisma.GrafanaDashboardUncheckedUpdateInput
} {
  const uid = String(dashboard['uid'] ?? '')
  const data = {
    title: String(dashboard['title'] ?? 'Untitled'),
    folderTitle: dashboard['folderTitle'] ? String(dashboard['folderTitle']) : null,
    url: String(dashboard['url'] ?? ''),
    tags: Array.isArray(dashboard['tags']) ? (dashboard['tags'] as string[]) : [],
    type: String(dashboard['type'] ?? 'dash-db'),
    isStarred: Boolean(dashboard['isStarred']),
    syncedAt: nowDate(),
  }
  return {
    uid,
    create: { tenantId, uid, ...data },
    update: data,
  }
}

/* ---------------------------------------------------------------- */
/* VELOCIRAPTOR ENDPOINT MAPPING                                     */
/* ---------------------------------------------------------------- */

export function mapVelociraptorEndpointUpsert(
  tenantId: string,
  client: Record<string, unknown>
): {
  clientId: string
  create: Prisma.VelociraptorEndpointUncheckedCreateInput
  update: Prisma.VelociraptorEndpointUncheckedUpdateInput
} {
  const clientId = String(client['client_id'] ?? '')
  const osInfo = client['os_info'] as Record<string, unknown> | undefined
  const hostname = String(osInfo?.['fqdn'] ?? client['client_id'] ?? 'unknown')
  const os = String(osInfo?.['system'] ?? 'unknown')
  const labels = Array.isArray(client['labels']) ? (client['labels'] as string[]) : []
  const ipAddress = String(client['last_ip'] ?? '')
  const lastSeenAt = client['last_seen_at']
    ? fromUnixToDate(Number(client['last_seen_at']) / 1000)
    : nowDate()

  const data = { hostname, os, labels, ipAddress, lastSeenAt, syncedAt: nowDate() }
  return {
    clientId,
    create: { tenantId, clientId, ...data },
    update: data,
  }
}

/* ---------------------------------------------------------------- */
/* VELOCIRAPTOR HUNT MAPPING                                         */
/* ---------------------------------------------------------------- */

export function mapVelociraptorHuntUpsert(
  tenantId: string,
  row: unknown
): {
  huntId: string
  create: Prisma.VelociraptorHuntUncheckedCreateInput
  update: Prisma.VelociraptorHuntUncheckedUpdateInput
} {
  const hunt = row as Record<string, unknown>
  const huntId = String(hunt['hunt_id'] ?? '')
  const stats = (hunt['stats'] ?? {}) as Record<string, unknown>

  const data = {
    description: String(hunt['hunt_description'] ?? ''),
    state: String(hunt['state'] ?? 'PAUSED'),
    artifacts: Array.isArray(hunt['artifacts']) ? (hunt['artifacts'] as string[]) : [],
    totalClients: Number(stats['total_clients_scheduled'] ?? 0),
    finishedClients: Number(stats['total_clients_with_results'] ?? 0),
    syncedAt: nowDate(),
  }

  return {
    huntId,
    create: {
      tenantId,
      huntId,
      ...data,
      createdAt: hunt['create_time']
        ? fromUnixToDate(Number(hunt['create_time']) / 1000)
        : nowDate(),
    },
    update: data,
  }
}

/* ---------------------------------------------------------------- */
/* SHUFFLE WORKFLOW MAPPING                                          */
/* ---------------------------------------------------------------- */

export function mapShuffleWorkflowUpsert(
  tenantId: string,
  workflow: Record<string, unknown>
): {
  workflowId: string
  create: Prisma.ShuffleWorkflowUncheckedCreateInput
  update: Prisma.ShuffleWorkflowUncheckedUpdateInput
} {
  const workflowId = String(workflow['id'] ?? '')
  const data = {
    name: String(workflow['name'] ?? 'Unnamed'),
    description: workflow['description'] ? String(workflow['description']) : null,
    isValid: Boolean(workflow['is_valid']),
    triggerCount: Number((workflow['triggers'] as unknown[] | undefined)?.length ?? 0),
    tags: Array.isArray(workflow['tags']) ? (workflow['tags'] as string[]) : [],
    syncedAt: nowDate(),
  }
  return {
    workflowId,
    create: { tenantId, workflowId, ...data },
    update: data,
  }
}

/* ---------------------------------------------------------------- */
/* FLUX QUERY SANITIZATION                                           */
/* ---------------------------------------------------------------- */

export function sanitizeFluxString(value: string): string {
  // Escape backslashes FIRST, then double-quotes — otherwise \" becomes \\\\"
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')
}

export function sanitizeFluxDuration(value: string): string {
  if (/^-?\d+[smhdwy]$/.test(value)) return value
  return '-1h'
}

export function buildFluxQuery(
  bucket: string,
  range: string,
  measurement: string | undefined,
  limit: number
): string {
  return [
    `from(bucket: "${sanitizeFluxString(bucket)}")`,
    `  |> range(start: ${sanitizeFluxDuration(range)})`,
    measurement
      ? `  |> filter(fn: (r) => r._measurement == "${sanitizeFluxString(measurement)}")`
      : '',
    `  |> limit(n: ${limit})`,
  ]
    .filter(Boolean)
    .join('\n')
}

/* ---------------------------------------------------------------- */
/* LOGSTASH PIPELINE MAPPING                                         */
/* ---------------------------------------------------------------- */

export function mapLogstashPipelineEntry(
  tenantId: string,
  pipelineId: string,
  stats: unknown,
  logLevel: string
): Prisma.LogstashPipelineLogUncheckedCreateInput {
  const pipelineStat = stats as Record<string, unknown>
  const events = (pipelineStat['events'] ?? {}) as Record<string, unknown>
  return {
    tenantId,
    pipelineId,
    timestamp: nowDate(),
    level: logLevel,
    message: `Pipeline ${pipelineId} stats snapshot`,
    source: pipelineId,
    eventsIn: Number(events['in'] ?? 0),
    eventsOut: Number(events['out'] ?? 0),
    eventsFiltered: Number(events['filtered'] ?? 0),
    durationMs: Number(events['duration_in_millis'] ?? 0),
    metadata: JSON.parse(JSON.stringify(pipelineStat)),
    syncedAt: nowDate(),
  }
}
