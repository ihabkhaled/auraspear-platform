import {
  type ApprovalStatus,
  type AiAgentId,
  type OsintAuthType,
  type OsintSourceType,
} from '@/enums'
import type { EmbeddedUser } from './common.types'
import type { AvailableAiConnector } from './llm-connector.types'

export interface TenantAgentConfig {
  agentId: string
  displayName: string
  description: string
  isEnabled: boolean
  providerMode: string
  model: string | null
  temperature: number
  maxTokensPerCall: number
  systemPrompt: string | null
  promptSuffix: string | null
  indexPatterns: string[]
  tokensPerHour: number
  tokensPerDay: number
  tokensPerMonth: number
  tokensUsedHour: number
  tokensUsedDay: number
  tokensUsedMonth: number
  maxConcurrentRuns: number
  triggerMode: string
  triggerConfig: Record<string, unknown>
  osintSources: unknown[]
  outputFormat: string
  presentationSkills: string[]
  hasCustomConfig: boolean
  lastResetHour: string | null
  lastResetDay: string | null
  lastResetMonth: string | null
}

export interface UpdateAgentConfigInput {
  isEnabled?: boolean
  providerMode?: string
  model?: string | null
  temperature?: number
  maxTokensPerCall?: number
  systemPrompt?: string | null
  promptSuffix?: string | null
  indexPatterns?: string[]
  tokensPerHour?: number
  tokensPerDay?: number
  tokensPerMonth?: number
  maxConcurrentRuns?: number
  triggerMode?: string
  triggerConfig?: Record<string, unknown>
  outputFormat?: string
  presentationSkills?: string[]
}

export interface OsintSourceConfig {
  id: string
  tenantId: string
  sourceType: OsintSourceType
  name: string
  isEnabled: boolean
  hasApiKey: boolean
  baseUrl: string | null
  authType: OsintAuthType
  headerName: string | null
  queryParamName: string | null
  responsePath: string | null
  requestMethod: string
  timeout: number
  lastTestAt: string | null
  lastTestOk: boolean | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateOsintSourceInput {
  sourceType: OsintSourceType
  name: string
  isEnabled?: boolean
  apiKey?: string
  baseUrl?: string
  authType: OsintAuthType
  headerName?: string
  queryParamName?: string
  responsePath?: string
  requestMethod?: string
  timeout?: number
}

export interface UpdateOsintSourceInput {
  name?: string
  isEnabled?: boolean
  apiKey?: string
  baseUrl?: string
  authType?: OsintAuthType
  headerName?: string
  queryParamName?: string
  responsePath?: string
  requestMethod?: string
  timeout?: number
}

export interface ApprovalRequest {
  id: string
  tenantId: string
  agentId: AiAgentId
  agentName: string
  actionType: string
  riskLevel: string
  description: string
  requestedBy: string
  requestedByName: string
  status: ApprovalStatus
  resolvedBy: string | null
  resolvedByName: string | null
  resolvedAt: string | null
  comment: string | null
  expiresAt: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface ResolveApprovalInput {
  status: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED
  comment?: string | null
}

export interface AgentCardProps {
  config: TenantAgentConfig
  onEdit: (config: TenantAgentConfig) => void
  onToggle: (agentId: string, enabled: boolean) => void
  availableConnectors: AvailableAiConnector[]
  t: (key: string) => string
}

export interface OsintSourceCardProps {
  source: OsintSourceConfig
  onEdit: (source: OsintSourceConfig) => void
  onDelete: (source: OsintSourceConfig) => void
  onTest: (sourceId: string) => void
  onToggle: (sourceId: string, enabled: boolean) => void
  testLoading: boolean
  t: (key: string) => string
}

export interface ApprovalCardProps {
  approval: ApprovalRequest
  onResolve: (id: string, data: ResolveApprovalInput) => void
  resolveLoading: boolean
  t: (key: string) => string
}

export interface AgentConfigEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: TenantAgentConfig | null
  onSubmit: (agentId: string, data: UpdateAgentConfigInput) => void
  loading: boolean
  availableConnectors: AvailableAiConnector[]
  t: (key: string) => string
}

export interface OsintQueryInput {
  sourceId: string
  iocType: string
  iocValue: string
}

export interface OsintEnrichInput {
  iocType: string
  iocValue: string
  sourceIds: string[]
}

export interface OsintQueryResult {
  sourceId: string
  sourceName: string
  sourceType: string
  success: boolean
  data: unknown
  rawResponse?: unknown
  error: string | null
  statusCode?: number | null
  messageKey?: string | null
  responseTimeMs: number
  queriedAt: string
}

export interface OsintEnrichmentResult {
  iocType: string
  iocValue: string
  results: OsintQueryResult[]
  totalSources: number
  successCount: number
  failureCount: number
  enrichedAt: string
}

export interface BuiltinOsintSourceDefaults {
  baseUrl: string
  authType: OsintAuthType
  headerName: string
  queryParamName: string
  responsePath: string
  requestMethod: string
  supportedIocTypes: string[]
  rateLimitHint: string
}

export interface OsintSourceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: OsintSourceConfig | null
  onSubmit: (data: CreateOsintSourceInput | UpdateOsintSourceInput) => void
  loading: boolean
  t: (key: string) => string
}

export interface OsintEnrichButtonProps {
  iocType: string
  iocValue: string
  t: (key: string) => string
}

export interface OsintFileUploadButtonProps {
  t: (key: string) => string
}

export interface OsintResultCardProps {
  result: OsintQueryResult
  t: (key: string) => string
  fetchedData?: unknown
  isFetchingAnalysis?: boolean
  onFetchAnalysis?: (analysisUrl: string, sourceId: string) => void
}

export interface AiPromptTemplate {
  id: string
  tenantId: string
  taskType: string
  version: number
  name: string
  content: string
  isActive: boolean
  createdBy: string
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAiPromptInput {
  taskType: string
  name: string
  content: string
}

export interface UpdateAiPromptInput {
  name?: string
  content?: string
}

export interface AiFeatureConfig {
  id: string
  tenantId: string
  featureKey: string
  enabled: boolean
  preferredProvider: string | null
  maxTokens: number
  approvalLevel: string
  monthlyTokenBudget: number | null
  createdAt: string
  updatedAt: string
}

export interface UpdateAiFeatureConfigInput {
  enabled?: boolean
  preferredProvider?: string | null
  maxTokens?: number
  approvalLevel?: string
  monthlyTokenBudget?: number | null
}

export interface PromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prompt: AiPromptTemplate | null
  onSubmit: (data: CreateAiPromptInput | UpdateAiPromptInput) => void
  loading: boolean
  t: (key: string) => string
}

export interface FeatureEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feature: AiFeatureConfig | null
  onSubmit: (featureKey: string, data: UpdateAiFeatureConfigInput) => void
  loading: boolean
  t: (key: string) => string
}

export interface PromptTableProps {
  prompts: AiPromptTemplate[]
  loading: boolean
  onEdit: (prompt: AiPromptTemplate) => void
  onActivate: (id: string) => void
  onDelete: (prompt: AiPromptTemplate) => void
  t: (key: string) => string
}

export interface FeatureTableProps {
  features: AiFeatureConfig[]
  loading: boolean
  onEdit: (feature: AiFeatureConfig) => void
  onToggle?: (featureKey: string, enabled: boolean) => void
  availableConnectors?: Array<{ key: string; label: string }>
  t: (key: string) => string
}

export interface DispatchAgentTaskInput {
  actionType: string
  payload: Record<string, unknown>
  targetId?: string
  targetType?: string
}

export interface AgentExecutionHistoryItem {
  id: string
  agentId: string
  actionType: string
  status: string
  startedAt: string
  completedAt?: string
  durationMs?: number
  tokensUsed?: number
  error?: string
}

export interface OrchestratorStats {
  totalDispatches24h: number
  successCount24h: number
  failureCount24h: number
  pendingApprovals: number
  activeAgents: number
  totalAgents: number
}

export interface AiAutomationBadgeProps {
  agentId: string
  agentName: string
  automationMode: string
  isEnabled: boolean
  t: (key: string) => string
}

export interface OrchestratorStatsBarProps {
  stats: OrchestratorStats
  t: (key: string) => string
}

export interface AiAutomationBadgeData {
  isEnabled: boolean
  automationMode: string
  agentName: string
  isLoading: boolean
}

export interface AiExecutionFinding {
  id: string
  tenantId: string
  sessionId: string
  agentId: string
  sourceModule: string
  sourceEntityId: string | null
  findingType: string
  title: string
  summary: string
  confidenceScore: number | null
  severity: string | null
  evidenceJson: unknown
  recommendedAction: string | null
  status: string
  appliedAt: string | null
  createdAt: string
}

export interface AiChatThread {
  id: string
  tenantId: string
  userId: string
  connectorId: string | null
  title: string | null
  model: string | null
  provider: string | null
  outputFormat: string
  temperature: number
  maxTokens: number
  systemPrompt: string | null
  messageCount: number
  totalTokensUsed: number
  lastActivityAt: string
  isArchived: boolean
  createdAt: string
  updatedAt: string
  user?: EmbeddedUser
}

export interface AiChatMessage {
  id: string
  threadId: string
  tenantId: string
  role: string
  content: string
  requestedModel: string | null
  requestedProvider: string | null
  model: string | null
  provider: string | null
  fallbackModel: string | null
  fallbackReason: string | null
  status: string
  inputTokens: number
  outputTokens: number
  durationMs: number | null
  sequenceNum: number
  createdAt: string
}

export interface AiJobRunSummary {
  id: string
  tenantId: string
  jobId: string
  scheduleId: string | null
  jobKey: string
  agentId: string | null
  triggerType: string
  status: string
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  providerKey: string | null
  modelKey: string | null
  tokensUsed: number
  findingsCount: number
  writebacksCount: number
  sourceModule: string | null
  sourceEntityId: string | null
  summaryText: string | null
  confidenceScore: number | null
  errorMessage: string | null
  createdAt: string
}

export interface AiFindingsPanelProps {
  sourceModule: string
  sourceEntityId: string
  t: (key: string) => string
}

export interface AiAgentSchedule {
  id: string
  tenantId: string | null
  agentId: string
  seedKey: string
  module: string
  cronExpression: string
  timezone: string
  isEnabled: boolean
  isPaused: boolean
  executionMode: string
  riskMode: string
  approvalMode: string
  maxConcurrency: number
  allowOverlap: boolean
  providerPreference: string | null
  modelPreference: string | null
  isSystemDefault: boolean
  lastRunAt: string | null
  nextRunAt: string | null
  lastStatus: string | null
  lastDurationMs: number | null
  failureStreak: number
  successStreak: number
  disabledReason: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateScheduleInput {
  cronExpression?: string
  timezone?: string
  executionMode?: string
  riskMode?: string
  approvalMode?: string
  maxConcurrency?: number
  providerPreference?: string | null
  modelPreference?: string | null
}

export interface AiScheduleTableProps {
  schedules: AiAgentSchedule[]
  isLoading: boolean
  onToggle: (id: string, enabled: boolean) => void
  onPause: (id: string, paused: boolean) => void
  onRunNow: (id: string) => void
  onEdit: (schedule: AiAgentSchedule) => void
  onReset: (id: string) => void
  t: (key: string) => string
}

export interface AiFindingsPageFilters {
  query: string
  agentId: string
  sourceModule: string
  status: string
  findingType: string
  severity: string
  sortBy: string
  sortOrder: string
  page: number
  limit: number
}

export interface AiFindingsStats {
  total: number
  proposed: number
  applied: number
  dismissed: number
  failed: number
  highConfidence: number
  bySeverity: Record<string, number>
  byAgent: Array<{ agentId: string; count: number }>
  byModule: Array<{ sourceModule: string; count: number }>
}

export interface FindingDetailDrawerProps {
  finding: AiExecutionFinding | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateStatus: (id: string, status: string) => void
  onPromote?: (findingId: string, targetModule: string) => void
  statusLoading: boolean
  promoteLoading?: boolean
  canPromote?: boolean
  t: (key: string) => string
}

export interface AiScheduleEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: AiAgentSchedule | null
  onSubmit: (id: string, data: UpdateScheduleInput) => void
  loading: boolean
  t: (key: string) => string
}
