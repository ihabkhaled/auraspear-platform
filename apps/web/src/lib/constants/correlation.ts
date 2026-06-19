import { RuleSeverity, RuleSource, RuleStatus } from '@/enums'

export const SOURCE_TABS = ['all', 'sigma', 'custom', 'ai'] as const

export const RULE_SOURCE_LABEL_KEYS: Record<RuleSource, string> = {
  [RuleSource.SIGMA]: 'sourceSigma',
  [RuleSource.CUSTOM]: 'sourceCustom',
  [RuleSource.AI_GENERATED]: 'sourceAiGenerated',
}

export const RULE_SOURCE_CLASSES: Record<RuleSource, string> = {
  [RuleSource.SIGMA]: 'bg-purple-600 text-white',
  [RuleSource.CUSTOM]: 'bg-status-success text-white',
  [RuleSource.AI_GENERATED]: 'bg-status-warning text-white',
}

export const RULE_SEVERITY_LABEL_KEYS: Record<RuleSeverity, string> = {
  [RuleSeverity.CRITICAL]: 'severityCritical',
  [RuleSeverity.HIGH]: 'severityHigh',
  [RuleSeverity.MEDIUM]: 'severityMedium',
  [RuleSeverity.LOW]: 'severityLow',
  [RuleSeverity.INFO]: 'severityInfo',
}

export const RULE_SEVERITY_CLASSES: Record<RuleSeverity, string> = {
  [RuleSeverity.CRITICAL]: 'bg-severity-critical text-white',
  [RuleSeverity.HIGH]: 'bg-severity-high text-white',
  [RuleSeverity.MEDIUM]: 'bg-severity-medium text-white',
  [RuleSeverity.LOW]: 'bg-severity-low text-white',
  [RuleSeverity.INFO]: 'bg-severity-info text-white',
}

export const RULE_STATUS_LABEL_KEYS: Record<RuleStatus, string> = {
  [RuleStatus.ACTIVE]: 'statusActive',
  [RuleStatus.REVIEW]: 'statusReview',
  [RuleStatus.DISABLED]: 'statusDisabled',
}

export const RULE_STATUS_CLASSES: Record<RuleStatus, string> = {
  [RuleStatus.ACTIVE]: 'bg-status-success text-white',
  [RuleStatus.REVIEW]: 'bg-status-warning text-white',
  [RuleStatus.DISABLED]: 'bg-muted text-muted-foreground',
}

export const TAB_SOURCE_MAP: Record<string, RuleSource | undefined> = {
  all: undefined,
  sigma: RuleSource.SIGMA,
  custom: RuleSource.CUSTOM,
  ai: RuleSource.AI_GENERATED,
}
