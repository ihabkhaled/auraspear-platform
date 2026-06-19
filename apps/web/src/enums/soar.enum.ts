export enum SoarPlaybookStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

export enum SoarTriggerType {
  MANUAL = 'manual',
  ALERT = 'alert',
  INCIDENT = 'incident',
  SCHEDULED = 'scheduled',
}

export enum SoarExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}
