import { BadgeVariant, JobStatus, JobType } from '@/enums'

export const ALL_JOB_FILTER_VALUE = 'all'

export const JOB_STATUS_FILTER_OPTIONS = [
  JobStatus.PENDING,
  JobStatus.RUNNING,
  JobStatus.RETRYING,
  JobStatus.FAILED,
  JobStatus.COMPLETED,
  JobStatus.CANCELLED,
] as const

export const JOB_TYPE_FILTER_OPTIONS = [
  JobType.CONNECTOR_SYNC,
  JobType.DETECTION_RULE_EXECUTION,
  JobType.CORRELATION_RULE_EXECUTION,
  JobType.NORMALIZATION_PIPELINE,
  JobType.SOAR_PLAYBOOK,
  JobType.HUNT_EXECUTION,
  JobType.AI_AGENT_TASK,
  JobType.REPORT_GENERATION,
] as const

export const JOB_RETRYABLE_STATUSES = [JobStatus.FAILED, JobStatus.CANCELLED] as const

export const JOB_CANCELLABLE_STATUSES = [JobStatus.PENDING, JobStatus.RETRYING] as const

export const JOB_STATUS_BADGE_VARIANTS: Readonly<Record<JobStatus, BadgeVariant>> = {
  [JobStatus.PENDING]: BadgeVariant.SECONDARY,
  [JobStatus.RUNNING]: BadgeVariant.DEFAULT,
  [JobStatus.COMPLETED]: BadgeVariant.OUTLINE,
  [JobStatus.FAILED]: BadgeVariant.DESTRUCTIVE,
  [JobStatus.RETRYING]: BadgeVariant.SECONDARY,
  [JobStatus.CANCELLED]: BadgeVariant.SECONDARY,
}
