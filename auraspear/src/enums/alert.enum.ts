export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum AlertStatus {
  NEW_ALERT = 'new_alert',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  FALSE_POSITIVE = 'false_positive',
}

export enum AlertTimelineEventType {
  CREATED = 'created',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  ESCALATED = 'escalated',
  INVESTIGATED = 'investigated',
}

export enum AlertAiStatus {
  COMPLETED = 'completed',
  RUNNING = 'running',
  FAILED = 'failed',
  PENDING = 'pending',
}
