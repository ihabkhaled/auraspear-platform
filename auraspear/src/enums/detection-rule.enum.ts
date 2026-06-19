export enum DetectionRuleType {
  THRESHOLD = 'threshold',
  ANOMALY = 'anomaly',
  CHAIN = 'chain',
  SCHEDULED = 'scheduled',
}

export enum DetectionRuleSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum DetectionRuleStatus {
  ACTIVE = 'active',
  TESTING = 'testing',
  DISABLED = 'disabled',
}
