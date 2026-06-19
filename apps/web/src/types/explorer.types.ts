import type { SyncJobStatus, ExplorerConnector } from '@/enums'

// ── Overview ─────────────────────────────────────────────────────────

export interface ExplorerOverview {
  connectors: ExplorerConnectorStatus[]
  syncJobsSummary: SyncJobsSummary
}

export interface ExplorerConnectorStatus {
  type: string
  enabled: boolean
  configured: boolean
  lastSyncAt: string | null
}

export interface SyncJobStatusDetail {
  count: number
  connectors: string[]
}

export interface SyncJobsSummary {
  running: SyncJobStatusDetail
  completed: SyncJobStatusDetail
  failed: SyncJobStatusDetail
}

// ── Sync Jobs ────────────────────────────────────────────────────────

export interface SyncJob {
  id: string
  tenantId: string
  connectorType: string
  status: SyncJobStatus
  recordsSynced: number
  recordsFailed: number
  errorMessage: string | null
  errorCode: string | null
  durationMs: number | null
  initiatedBy: string
  cursor: string | null
  startedAt: string
  completedAt: string | null
  createdAt: string
}

export interface SyncJobSearchParams {
  page?: number | undefined
  limit?: number | undefined
  connectorType?: ExplorerConnector | undefined
  status?: SyncJobStatus | undefined
  sortOrder?: string | undefined
}

export interface TriggerSyncInput {
  connectorType: ExplorerConnector
}

// ── Graylog ──────────────────────────────────────────────────────────

export interface GraylogLogEntry {
  id: string
  message: string
  source: string
  timestamp: string
  priority: number
  fields: Record<string, unknown>
}

export interface GraylogSearchParams {
  page?: number | undefined
  limit?: number | undefined
  query?: string | undefined
  timeRange?: number | undefined
  sortOrder?: string | undefined
}

export interface GraylogEventDefinition {
  id: string
  title: string
  description: string
  priority: number
  config: Record<string, unknown>
}

// ── Grafana ──────────────────────────────────────────────────────────

export interface GrafanaDashboard {
  id: string
  tenantId: string
  uid: string
  title: string
  folderTitle: string | null
  url: string
  tags: string[]
  type: string
  isStarred: boolean
  syncedAt: string
  createdAt: string
  updatedAt: string
}

export interface GrafanaDashboardSearchParams {
  page?: number | undefined
  limit?: number | undefined
  search?: string | undefined
  tag?: string | undefined
  folder?: string | undefined
  starred?: boolean | undefined
  sortBy?: string | undefined
  sortOrder?: string | undefined
}

// ── InfluxDB ─────────────────────────────────────────────────────────

export interface InfluxDBQueryParams {
  bucket: string
  measurement?: string | undefined
  range?: string | undefined
  limit?: number | undefined
}

export interface InfluxDBQueryResult {
  data: string
  bucket: string
}

export interface InfluxDBBucket {
  id: string
  name: string
  retentionRules: unknown[]
}

// ── MISP ─────────────────────────────────────────────────────────────

export interface MispEventRow {
  id: string
  info: string
  date: string
  threat_level_id: string
  Orgc?: { name: string }
  attribute_count: string
  [key: string]: unknown
}

export interface MispExplorerSearchParams {
  page?: number | undefined
  limit?: number | undefined
  search?: string | undefined
  value?: string | undefined
  type?: string | undefined
  category?: string | undefined
  sortOrder?: string | undefined
}

// ── Velociraptor ─────────────────────────────────────────────────────

export interface VelociraptorEndpoint {
  id: string
  tenantId: string
  clientId: string
  hostname: string
  os: string
  labels: string[]
  ipAddress: string
  lastSeenAt: string
  syncedAt: string
  createdAt: string
  updatedAt: string
}

export interface VelociraptorEndpointSearchParams {
  page?: number | undefined
  limit?: number | undefined
  search?: string | undefined
  os?: string | undefined
  label?: string | undefined
  sortBy?: string | undefined
  sortOrder?: string | undefined
}

export interface VelociraptorHunt {
  id: string
  tenantId: string
  huntId: string
  description: string | null
  creator: string | null
  state: string | null
  artifacts: string[]
  totalClients: number
  finishedClients: number
  startedAt: string | null
  syncedAt: string
  createdAt: string
  updatedAt: string
}

export interface VelociraptorHuntSearchParams {
  page?: number | undefined
  limit?: number | undefined
  search?: string | undefined
  state?: string | undefined
  sortBy?: string | undefined
  sortOrder?: string | undefined
}

export interface VelociraptorVQLResult {
  rows: unknown[]
  columns: string[]
}

// ── Logstash ────────────────────────────────────────────────────────

export interface LogstashPipelineLog {
  id: string
  tenantId: string
  pipelineId: string
  timestamp: string
  level: string
  message: string
  source: string
  eventsIn: number
  eventsOut: number
  eventsFiltered: number
  durationMs: number
  metadata: Record<string, unknown> | null
  syncedAt: string
  createdAt: string
  updatedAt: string
}

export interface LogstashLogSearchParams {
  page?: number | undefined
  limit?: number | undefined
  search?: string | undefined
  level?: string | undefined
  pipelineId?: string | undefined
  sortBy?: string | undefined
  sortOrder?: string | undefined
}

// ── Shuffle ──────────────────────────────────────────────────────────

export interface ShuffleWorkflow {
  id: string
  tenantId: string
  workflowId: string
  name: string
  description: string | null
  isValid: boolean
  triggerCount: number
  tags: string[]
  syncedAt: string
  createdAt: string
  updatedAt: string
}

export interface ShuffleWorkflowSearchParams {
  page?: number | undefined
  limit?: number | undefined
  search?: string | undefined
  status?: string | undefined
  sortBy?: string | undefined
  sortOrder?: string | undefined
}

// ── Explorer Component Props ────────────────────────────────────────

export interface ExplorerConnectorMeta {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  color: string
}

export interface ExplorerConnectorCardProps {
  connector: ExplorerConnectorStatus
  meta: ExplorerConnectorMeta
  onClick: () => void
  t: (key: string) => string
}

export interface ExplorerSyncSummaryCardsProps {
  summary: SyncJobsSummary
  t: (key: string) => string
}
