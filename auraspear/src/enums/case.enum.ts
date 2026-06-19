export enum CaseStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
}

export enum CaseSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum CaseTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum CaseTimelineEntryType {
  NOTE = 'note',
  ALERT = 'alert',
  STATUS = 'status',
  ACTION = 'action',
}

export enum CaseArtifactType {
  IP = 'ip',
  HASH = 'hash',
  DOMAIN = 'domain',
  URL = 'url',
}

export enum CommentPartType {
  TEXT = 'text',
  MENTION = 'mention',
}
