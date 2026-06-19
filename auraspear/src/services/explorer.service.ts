import api from '@/lib/api'
import type {
  ApiResponse,
  ExplorerOverview,
  GraylogSearchParams,
  GraylogLogEntry,
  GraylogEventDefinition,
  GrafanaDashboardSearchParams,
  GrafanaDashboard,
  InfluxDBQueryParams,
  InfluxDBQueryResult,
  InfluxDBBucket,
  MispExplorerSearchParams,
  LogstashLogSearchParams,
  LogstashPipelineLog,
  VelociraptorEndpointSearchParams,
  VelociraptorEndpoint,
  VelociraptorHuntSearchParams,
  VelociraptorHunt,
  VelociraptorVQLResult,
  ShuffleWorkflowSearchParams,
  ShuffleWorkflow,
  SyncJobSearchParams,
  SyncJob,
  TriggerSyncInput,
} from '@/types'

export const explorerService = {
  // ── Overview ──────────────────────────────────────────────────────
  getOverview: () =>
    api.get<ApiResponse<ExplorerOverview>>('/data-explorer/overview').then(r => r.data),

  // ── Graylog ───────────────────────────────────────────────────────
  searchGraylogLogs: (params?: GraylogSearchParams) =>
    api
      .get<ApiResponse<GraylogLogEntry[]>>('/data-explorer/graylog/logs', { params })
      .then(r => r.data),

  getGraylogEventDefinitions: () =>
    api
      .get<ApiResponse<GraylogEventDefinition[]>>('/data-explorer/graylog/event-definitions')
      .then(r => r.data),

  // ── Grafana ───────────────────────────────────────────────────────
  getGrafanaDashboards: (params?: GrafanaDashboardSearchParams) =>
    api
      .get<ApiResponse<GrafanaDashboard[]>>('/data-explorer/grafana/dashboards', { params })
      .then(r => r.data),

  syncGrafana: () =>
    api.post<ApiResponse<{ synced: number }>>('/data-explorer/grafana/sync').then(r => r.data),

  // ── InfluxDB ──────────────────────────────────────────────────────
  queryInfluxDB: (params: InfluxDBQueryParams) =>
    api
      .get<ApiResponse<InfluxDBQueryResult>>('/data-explorer/influxdb/query', { params })
      .then(r => r.data),

  getInfluxDBBuckets: () =>
    api.get<ApiResponse<InfluxDBBucket[]>>('/data-explorer/influxdb/buckets').then(r => r.data),

  // ── MISP ──────────────────────────────────────────────────────────
  searchMispEvents: (params?: MispExplorerSearchParams) =>
    api.get<ApiResponse<unknown[]>>('/data-explorer/misp/events', { params }).then(r => r.data),

  getMispEventDetail: (eventId: string) =>
    api.get<ApiResponse<unknown>>(`/data-explorer/misp/events/${eventId}`).then(r => r.data),

  // ── Logstash ────────────────────────────────────────────────────────
  getLogstashLogs: (params?: LogstashLogSearchParams) =>
    api
      .get<ApiResponse<LogstashPipelineLog[]>>('/data-explorer/logstash/logs', { params })
      .then(r => r.data),

  syncLogstash: () =>
    api.post<ApiResponse<{ synced: number }>>('/data-explorer/logstash/sync').then(r => r.data),

  // ── Velociraptor ──────────────────────────────────────────────────
  getVelociraptorEndpoints: (params?: VelociraptorEndpointSearchParams) =>
    api
      .get<ApiResponse<VelociraptorEndpoint[]>>('/data-explorer/velociraptor/endpoints', {
        params,
      })
      .then(r => r.data),

  getVelociraptorHunts: (params?: VelociraptorHuntSearchParams) =>
    api
      .get<ApiResponse<VelociraptorHunt[]>>('/data-explorer/velociraptor/hunts', { params })
      .then(r => r.data),

  runVelociraptorVQL: (vql: string) =>
    api
      .post<ApiResponse<VelociraptorVQLResult>>('/data-explorer/velociraptor/vql', { vql })
      .then(r => r.data),

  syncVelociraptor: () =>
    api
      .post<ApiResponse<{ endpoints: number; hunts: number }>>('/data-explorer/velociraptor/sync')
      .then(r => r.data),

  // ── Shuffle ───────────────────────────────────────────────────────
  getShuffleWorkflows: (params?: ShuffleWorkflowSearchParams) =>
    api
      .get<ApiResponse<ShuffleWorkflow[]>>('/data-explorer/shuffle/workflows', { params })
      .then(r => r.data),

  syncShuffle: () =>
    api.post<ApiResponse<{ synced: number }>>('/data-explorer/shuffle/sync').then(r => r.data),

  // ── Sync Jobs ─────────────────────────────────────────────────────
  getSyncJobs: (params?: SyncJobSearchParams) =>
    api.get<ApiResponse<SyncJob[]>>('/data-explorer/sync-jobs', { params }).then(r => r.data),

  triggerSync: (input: TriggerSyncInput) =>
    api
      .post<ApiResponse<{ jobId: string }>>('/data-explorer/sync-jobs/trigger', input)
      .then(r => r.data),
}
