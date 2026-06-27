export const JOB_LOCK_PREFIX = 'job:lock:'
export const JOB_LOCK_TTL_SECONDS = 300
export const BASE_RETRY_DELAY_MS = 30_000
export const MAX_RETRY_DELAY_MS = 15 * 60_000
export const STALE_RUNNING_WINDOW_MS = 30 * 60_000
export const POLL_INTERVAL_MS = 10_000
export const STALE_RECOVERY_INTERVAL_MS = 5 * 60_000
export const SCHEDULE_INTERVAL_MS = 5 * 60_000

/** Page size when scanning active rules for scheduling (PERF-02). */
export const SCHEDULER_RULE_PAGE_SIZE = 200

/** Max concurrent enqueue calls per batch chunk (rule 36). */
export const SCHEDULER_ENQUEUE_BATCH_SIZE = 200
