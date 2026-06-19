import { JobStatus } from './enums/job.enums'
import {
  BASE_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
  SCHEDULE_INTERVAL_MS,
  STALE_RUNNING_WINDOW_MS,
} from './jobs.constants'
import { JobHandlerType } from './jobs.types'
import { nowMs, expiresInMs, subtractDuration, nowDate } from '../../common/utils/date-time.utility'
import type { JobStatsInput, JobRuntimeStats } from './jobs.types'
import type { Job } from '@prisma/client'

export async function placeholderJobHandler(job: Job): Promise<Record<string, unknown>> {
  return {
    handled: true,
    handlerType: JobHandlerType.DEFAULT,
    jobId: job.id,
  }
}

export function computeRetryScheduledAt(nextAttempt: number): Date {
  const exponent = Math.max(nextAttempt - 1, 0)
  const delayMs = Math.min(BASE_RETRY_DELAY_MS * 2 ** exponent, MAX_RETRY_DELAY_MS)
  return expiresInMs(delayMs)
}

export function shouldRetryJob(nextAttempt: number, maxAttempts: number): boolean {
  return nextAttempt < maxAttempts
}

export function getStaleRunningThreshold(): Date {
  return subtractDuration(nowDate(), STALE_RUNNING_WINDOW_MS, 'millisecond')
}

export function buildJobStats(params: JobStatsInput): JobRuntimeStats {
  const total =
    params.pending +
    params.running +
    params.retrying +
    params.failed +
    params.completed +
    params.cancelled

  return {
    total,
    pending: params.pending,
    running: params.running,
    retrying: params.retrying,
    failed: params.failed,
    completed: params.completed,
    cancelled: params.cancelled,
    delayed: params.delayed,
    staleRunning: params.staleRunning,
    typeBreakdown: params.typeBreakdown,
  }
}

export function isJobTerminal(status: JobStatus): boolean {
  return [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED].includes(status)
}

/**
 * Returns a time-window key (floored to the nearest schedule interval) for
 * idempotency keys, preventing duplicate jobs within the same window.
 */
export function getCurrentScheduleWindow(): string {
  const now = nowMs()
  const windowStart = Math.floor(now / SCHEDULE_INTERVAL_MS) * SCHEDULE_INTERVAL_MS
  return String(windowStart)
}

/**
 * Counts how many settled results were fulfilled vs rejected.
 */
export function countScheduleResults(results: PromiseSettledResult<unknown>[]): {
  enqueued: number
  rejectedIndices: number[]
} {
  let enqueued = 0
  const rejectedIndices: number[] = []

  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      enqueued += 1
    } else {
      rejectedIndices.push(index)
    }
  }

  return { enqueued, rejectedIndices }
}
