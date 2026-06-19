import { AlertStatus, CaseStatus, SyncJobStatus } from '../../common/enums'
import { JobStatus } from '../jobs/enums/job.enums'

export const DASHBOARD_DEFAULT_ALERT_TREND_DAYS = 7
export const DASHBOARD_DEFAULT_RECENT_ACTIVITY_LIMIT = 10
export const DASHBOARD_ANALYTICS_WINDOW_DAYS = 7
export const DASHBOARD_REPORTS_WINDOW_DAYS = 30
export const DASHBOARD_TOP_TECHNIQUES_LIMIT = 10
export const DASHBOARD_TOP_TARGETED_ASSETS_LIMIT = 10
export const DASHBOARD_TOP_DETECTION_RULES_LIMIT = 5
export const DASHBOARD_TOP_FAILING_CONNECTORS_LIMIT = 5
export const DASHBOARD_CASE_WARNING_DAYS = 7
export const DASHBOARD_CASE_CRITICAL_DAYS = 14
export const DASHBOARD_STALE_RUNNING_JOB_HOURS = 1

export const OPEN_CASE_STATUSES = [CaseStatus.OPEN, CaseStatus.IN_PROGRESS] as const
export const RESOLVED_ALERT_STATUSES = [AlertStatus.RESOLVED, AlertStatus.CLOSED] as const
export const QUEUED_JOB_STATUSES = [JobStatus.PENDING, JobStatus.RETRYING] as const
export const ACTIVE_SYNC_JOB_STATUSES = [SyncJobStatus.RUNNING] as const

export const AI_DASHBOARD_SERVICE_CLASS_NAME = 'AiDashboardService'
