import type { BadgeVariant, JobStatus, JobType } from '@/enums'
import {
  JOB_CANCELLABLE_STATUSES,
  JOB_RETRYABLE_STATUSES,
  JOB_STATUS_BADGE_VARIANTS,
  JOB_STATUS_FILTER_OPTIONS,
  JOB_TYPE_FILTER_OPTIONS,
} from '@/lib/constants/jobs'
import { lookup } from '@/lib/utils'

export function isJobStatus(value: string): value is JobStatus {
  for (const jobStatus of JOB_STATUS_FILTER_OPTIONS) {
    if (jobStatus === value) {
      return true
    }
  }

  return false
}

export function isJobType(value: string): value is JobType {
  for (const jobType of JOB_TYPE_FILTER_OPTIONS) {
    if (jobType === value) {
      return true
    }
  }

  return false
}

export function isRetryableJobStatus(status: JobStatus): boolean {
  for (const retryableStatus of JOB_RETRYABLE_STATUSES) {
    if (retryableStatus === status) {
      return true
    }
  }

  return false
}

export function isCancellableJobStatus(status: JobStatus): boolean {
  for (const cancellableStatus of JOB_CANCELLABLE_STATUSES) {
    if (cancellableStatus === status) {
      return true
    }
  }

  return false
}

export function getJobStatusBadgeVariant(status: JobStatus): BadgeVariant {
  return lookup(JOB_STATUS_BADGE_VARIANTS, status)
}
