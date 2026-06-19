import { z } from 'zod'
import { ConnectorType, SortOrder } from '../../../common/enums'

// ── Shared pagination ──────────────────────────────────────────────
export const ExplorerPaginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(500).optional(),
  sortBy: z.string().max(100).optional(),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
})

export type ExplorerPaginationDto = z.infer<typeof ExplorerPaginationSchema>

// ── Graylog log search ─────────────────────────────────────────────
export const GraylogSearchSchema = ExplorerPaginationSchema.extend({
  query: z.string().max(1000).default('*'),
  timeRange: z.coerce.number().int().min(60).max(604800).default(86400), // seconds (1min–7days)
})

export type GraylogSearchDto = z.infer<typeof GraylogSearchSchema>

// ── Grafana dashboard listing ──────────────────────────────────────
export const GrafanaDashboardQuerySchema = ExplorerPaginationSchema.extend({
  tag: z.string().max(200).optional(),
  folder: z.string().max(500).optional(),
  starred: z.coerce.boolean().optional(),
})

export type GrafanaDashboardQueryDto = z.infer<typeof GrafanaDashboardQuerySchema>

// ── InfluxDB metrics query ─────────────────────────────────────────
export const InfluxDBQuerySchema = z.object({
  bucket: z.string().min(1).max(255),
  measurement: z.string().max(500).optional(),
  range: z.string().max(50).default('-1h'), // Flux duration (e.g. -1h, -24h, -7d)
  limit: z.coerce.number().int().min(1).max(1000).default(100),
})

export type InfluxDBQueryDto = z.infer<typeof InfluxDBQuerySchema>

export const InfluxDBBucketsSchema = z.object({
  // No params needed — just a marker for validation
})

// ── MISP threat intel ──────────────────────────────────────────────
export const MispEventQuerySchema = ExplorerPaginationSchema.extend({
  value: z.string().max(1000).optional(), // attribute value search
  type: z.string().max(200).optional(), // attribute type filter
  category: z.string().max(200).optional(),
})

export type MispEventQueryDto = z.infer<typeof MispEventQuerySchema>

export const MispEventDetailSchema = z.object({
  eventId: z.string().min(1).max(100),
})

export type MispEventDetailDto = z.infer<typeof MispEventDetailSchema>

// ── Velociraptor ───────────────────────────────────────────────────
export const VelociraptorEndpointQuerySchema = ExplorerPaginationSchema.extend({
  os: z.string().max(100).optional(),
  label: z.string().max(200).optional(),
})

export type VelociraptorEndpointQueryDto = z.infer<typeof VelociraptorEndpointQuerySchema>

export const VelociraptorHuntQuerySchema = ExplorerPaginationSchema.extend({
  state: z.string().max(50).optional(),
})

export type VelociraptorHuntQueryDto = z.infer<typeof VelociraptorHuntQuerySchema>

export const VelociraptorVQLSchema = z.object({
  vql: z.string().min(1).max(5000),
})

export type VelociraptorVQLDto = z.infer<typeof VelociraptorVQLSchema>

// ── Logstash ───────────────────────────────────────────────────────
export const LogstashLogQuerySchema = ExplorerPaginationSchema.extend({
  level: z.string().max(50).optional(),
  pipelineId: z.string().max(255).optional(),
})

export type LogstashLogQueryDto = z.infer<typeof LogstashLogQuerySchema>

// ── Shuffle ────────────────────────────────────────────────────────
export const ShuffleWorkflowQuerySchema = ExplorerPaginationSchema.extend({
  status: z.string().max(50).optional(), // valid/invalid filter
})

export type ShuffleWorkflowQueryDto = z.infer<typeof ShuffleWorkflowQuerySchema>

// ── Sync Jobs ──────────────────────────────────────────────────────
export const SyncJobQuerySchema = ExplorerPaginationSchema.extend({
  connectorType: z.nativeEnum(ConnectorType).optional(),
  status: z.string().max(50).optional(),
})

export type SyncJobQueryDto = z.infer<typeof SyncJobQuerySchema>

export const TriggerSyncSchema = z.object({
  connectorType: z.nativeEnum(ConnectorType),
})

export type TriggerSyncDto = z.infer<typeof TriggerSyncSchema>
