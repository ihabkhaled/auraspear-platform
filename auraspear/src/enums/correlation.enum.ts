export enum RuleSource {
  SIGMA = 'sigma',
  CUSTOM = 'custom',
  AI_GENERATED = 'ai_generated',
}

export enum RuleSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum RuleStatus {
  ACTIVE = 'active',
  REVIEW = 'review',
  DISABLED = 'disabled',
}
