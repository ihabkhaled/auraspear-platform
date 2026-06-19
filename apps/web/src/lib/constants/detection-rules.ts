import { DetectionRuleSeverity, DetectionRuleStatus, DetectionRuleType } from '@/enums'

export const DETECTION_RULE_TYPE_LABEL_KEYS: Record<DetectionRuleType, string> = {
  [DetectionRuleType.THRESHOLD]: 'typeThreshold',
  [DetectionRuleType.ANOMALY]: 'typeAnomaly',
  [DetectionRuleType.CHAIN]: 'typeChain',
  [DetectionRuleType.SCHEDULED]: 'typeScheduled',
}

export const DETECTION_RULE_SEVERITY_LABEL_KEYS: Record<DetectionRuleSeverity, string> = {
  [DetectionRuleSeverity.CRITICAL]: 'severityCritical',
  [DetectionRuleSeverity.HIGH]: 'severityHigh',
  [DetectionRuleSeverity.MEDIUM]: 'severityMedium',
  [DetectionRuleSeverity.LOW]: 'severityLow',
  [DetectionRuleSeverity.INFO]: 'severityInfo',
}

export const DETECTION_RULE_SEVERITY_CLASSES: Record<DetectionRuleSeverity, string> = {
  [DetectionRuleSeverity.CRITICAL]: 'bg-severity-critical text-white',
  [DetectionRuleSeverity.HIGH]: 'bg-severity-high text-white',
  [DetectionRuleSeverity.MEDIUM]: 'bg-severity-medium text-white',
  [DetectionRuleSeverity.LOW]: 'bg-severity-low text-white',
  [DetectionRuleSeverity.INFO]: 'bg-severity-info text-white',
}

export const DETECTION_RULE_STATUS_LABEL_KEYS: Record<DetectionRuleStatus, string> = {
  [DetectionRuleStatus.ACTIVE]: 'statusActive',
  [DetectionRuleStatus.TESTING]: 'statusTesting',
  [DetectionRuleStatus.DISABLED]: 'statusDisabled',
}

export const DETECTION_RULE_STATUS_CLASSES: Record<DetectionRuleStatus, string> = {
  [DetectionRuleStatus.ACTIVE]: 'bg-status-success text-white',
  [DetectionRuleStatus.TESTING]: 'bg-status-warning text-white',
  [DetectionRuleStatus.DISABLED]: 'bg-muted text-muted-foreground',
}
