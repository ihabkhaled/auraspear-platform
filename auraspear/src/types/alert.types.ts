import type {
  AlertAiStatus,
  AlertSeverity,
  AlertStatus,
  AlertTimelineEventType,
  SortOrder,
  TimeRange,
} from '@/enums'

export interface Alert {
  id: string
  externalId: string | null
  title: string
  timestamp: string
  severity: AlertSeverity
  status: AlertStatus
  source: string
  ruleName: string
  ruleId: string
  description: string
  agentName: string
  agentId: string
  sourceIp: string
  destinationIp: string
  mitreTactics: string[]
  mitreTechniques: string[]
  rawEvent: Record<string, unknown> | null
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  resolution: string | null
  closedBy: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  tenantId: string
}

export interface AlertSearchParams {
  page?: number
  limit?: number
  severity?: string
  status?: string
  query?: string
  timeRange?: TimeRange
  agentName?: string
  ruleGroup?: string
  source?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface AIInvestigation {
  result: string
  reasoning: string[]
  confidence: number
  model: string
  tokensUsed: {
    input: number
    output: number
  }
}

export interface SeverityCount {
  severity: AlertSeverity
  count: number
}

export interface AlertColumnTranslations {
  alerts: (key: string) => string
  common: (key: string) => string
}

export interface GetAlertColumnsOptions {
  onView?: ((alert: Alert) => void) | undefined
  onInvestigate?: ((alert: Alert) => void) | undefined
  onCreateCase?: ((alert: Alert) => void) | undefined
  onCopyId?: ((id: string) => void) | undefined
}

export interface AlertDetailDrawerProps {
  alert: Alert | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onInvestigate?: ((alert: Alert) => void) | undefined
  isInvestigating?: boolean | undefined
  onCreateCase?: ((alert: Alert) => void) | undefined
  onEscalateToIncident?: ((alert: Alert) => void) | undefined
  onClose?: ((alert: Alert) => void) | undefined
  triageProps?: AiTriageExternalProps | undefined
  aiResult?: AlertAiResult | null | undefined
  aiResultLoading?: boolean | undefined
  onRunAiTriage?: (() => void) | undefined
}

export interface AlertFilterSidebarProps {
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
  selectedSeverities: AlertSeverity[]
  onSeverityChange: (severities: AlertSeverity[]) => void
  severityCounts: SeverityCount[]
  agentFilter: string
  onAgentFilterChange: (value: string) => void
  ruleGroup: string
  onRuleGroupChange: (value: string) => void
}

export interface AlertRowActionsProps {
  alert: Alert
  onView?: ((alert: Alert) => void) | undefined
  onInvestigate?: ((alert: Alert) => void) | undefined
  onCreateCase?: ((alert: Alert) => void) | undefined
  onCopyId?: ((id: string) => void) | undefined
}

export interface AIInvestigationModalProps {
  investigation: AIInvestigation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface AiTriageResult {
  result: string
  reasoning: string[]
  confidence: number
  model: string
  provider: string
  tokensUsed: {
    input: number
    output: number
  }
}

export interface AiTriagePanelProps {
  alertId: string
  canTriage: boolean
  results: Record<string, AiTriageResult>
  activeTask: string | null
  isLoading: boolean
  onSummarize: () => void
  onExplainSeverity: () => void
  onFalsePositiveScore: () => void
  onNextAction: () => void
  tCommon: (key: string) => string
  t: (key: string) => string
}

export interface AiTriageExternalProps {
  canTriage: boolean
  results: Record<string, AiTriageResult>
  activeTask: string | null
  isLoading: boolean
  onSummarize: () => void
  onExplainSeverity: () => void
  onFalsePositiveScore: () => void
  onNextAction: () => void
  tCommon: (key: string) => string
}

export interface ParsedKQLQuery {
  query?: string
  severity?: string
  status?: string
  agentName?: string
  ruleGroup?: string
  source?: string
}

export interface KQLSearchBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onSavedSearches?: () => void
}

export interface BulkActionResult {
  succeeded: number
  failed: number
  errors: string[]
}

export interface BulkCloseInput {
  ids: string[]
  resolution: string
}

export interface AlertTimelineEvent {
  id: string
  type: AlertTimelineEventType
  timestamp: string
  actor: string | null
  detail: string | null
}

export interface AlertBulkActionBarProps {
  selectedCount: number
  onAcknowledge?: (() => void) | undefined
  onClose?: (() => void) | undefined
  onClear: () => void
  isAcknowledging: boolean
  isClosing: boolean
}

export interface AlertTimelineProps {
  alert: Alert
}

export interface EscalateToIncidentDialogProps {
  alert: Alert | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface EscalateFormValues {
  title: string
  description: string
  severity: string
  category: string
}

export interface AlertAiResult {
  aiSummary: string | null
  aiConfidence: number | null
  aiSeveritySuggestion: string | null
  aiEscalationSuggestion: string | null
  aiLastRunAt: string | null
  aiStatus: AlertAiStatus | null
}

export interface AlertAiResultPanelProps {
  aiResult: AlertAiResult | null
  isLoading: boolean
  onRunTriage?: (() => void) | undefined
  t: (key: string) => string
}
