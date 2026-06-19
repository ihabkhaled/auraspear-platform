import type { PaginationMeta } from '../../common/interfaces/pagination.interface'
import type {
  ConnectorSyncJob,
  GrafanaDashboard,
  LogstashPipelineLog,
  ShuffleWorkflow,
  VelociraptorEndpoint,
  VelociraptorHunt,
} from '@prisma/client'

export interface ConnectorOverviewItem {
  type: string
  enabled: boolean
  configured: boolean
  lastSyncAt: string | null
}

export interface SyncJobsSummaryGroup {
  count: number
  connectors: string[]
}

export interface SyncJobsSummary {
  running: SyncJobsSummaryGroup
  completed: SyncJobsSummaryGroup
  failed: SyncJobsSummaryGroup
}

export interface ExplorerOverview {
  connectors: ConnectorOverviewItem[]
  syncJobsSummary: SyncJobsSummary
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

export type PaginatedUnknownResult = PaginatedResult<unknown>

export type PaginatedGrafanaDashboards = PaginatedResult<GrafanaDashboard>

export type PaginatedVelociraptorEndpoints = PaginatedResult<VelociraptorEndpoint>

export type PaginatedVelociraptorHunts = PaginatedResult<VelociraptorHunt>

export type PaginatedLogstashLogs = PaginatedResult<LogstashPipelineLog>

export type PaginatedShuffleWorkflows = PaginatedResult<ShuffleWorkflow>

export type PaginatedSyncJobs = PaginatedResult<ConnectorSyncJob>

export interface VQLResult {
  rows: unknown[]
  columns: string[]
}

export interface InfluxDBQueryResult {
  data: string
  bucket: string
}

export interface SyncResult {
  synced: number
}

export interface VelociraptorSyncResult {
  endpoints: number
  hunts: number
}

export interface TriggerSyncResult {
  jobId: string
}
