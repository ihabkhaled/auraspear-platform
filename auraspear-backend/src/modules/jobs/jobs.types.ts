import type { Job, JobStatus as PrismaJobStatus, JobType as PrismaJobType } from '@prisma/client'

export enum JobHandlerType {
  DEFAULT = 'default',
}

export interface JobTypeCount {
  type: PrismaJobType
  count: number
}

export interface JobRuntimeStats {
  total: number
  pending: number
  running: number
  retrying: number
  failed: number
  completed: number
  cancelled: number
  delayed: number
  staleRunning: number
  typeBreakdown: JobTypeCount[]
}

export interface JobStatsInput {
  pending: number
  running: number
  retrying: number
  failed: number
  completed: number
  cancelled: number
  delayed: number
  staleRunning: number
  typeBreakdown: JobTypeCount[]
}

export interface EnqueueParameters {
  tenantId: string
  type: PrismaJobType
  payload?: Record<string, unknown>
  maxAttempts?: number
  idempotencyKey?: string
  scheduledAt?: Date
  createdBy?: string
}

export interface ListJobsOptions {
  type?: PrismaJobType
  status?: PrismaJobStatus
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: string
}

export type JobHandler = (job: Job) => Promise<Record<string, unknown>>
