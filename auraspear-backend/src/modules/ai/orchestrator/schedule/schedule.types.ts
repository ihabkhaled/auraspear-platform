import type { Prisma } from '@prisma/client'

export interface ScheduleRunResult {
  scheduleId: string
  jobId: string
  status: string
}

export interface FindDueSchedulesOptions {
  limit?: number
}

export interface FindAllForTenantOptions {
  module?: string
  isEnabled?: boolean
}

export type ScheduleRecord = Prisma.AiAgentScheduleGetPayload<Record<string, never>>

export interface ScheduleListItem {
  id: string
  tenantId: string | null
  agentId: string
  seedKey: string
  module: string
  cronExpression: string
  timezone: string
  isEnabled: boolean
  isPaused: boolean
  executionMode: string
  riskMode: string
  approvalMode: string
  maxConcurrency: number
  providerPreference: string | null
  modelPreference: string | null
  isSystemDefault: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  lastStatus: string | null
  lastDurationMs: number | null
  failureStreak: number
  successStreak: number
  createdAt: string
  updatedAt: string
}

export interface ScheduleDetail extends ScheduleListItem {
  allowOverlap: boolean
  dedupeWindowSeconds: number
  scopeJson: unknown
  disabledReason: string | null
  createdBy: string | null
  updatedBy: string | null
}
