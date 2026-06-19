export interface AiTokenUsage {
  input: number
  output: number
}

export interface AiResponse {
  result: string
  reasoning: string[]
  confidence: number
  model: string
  provider: string
  tokensUsed: AiTokenUsage
}

export interface ExplainAnomalyInput {
  metric: string
  value: number
  previousValue: number
  timeRange: string
}

export interface AiUsageSummaryEntry {
  featureKey: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  requestCount: number
}

export interface AiUsageSummary {
  tenantId: string
  startDate: string
  endDate: string
  entries: AiUsageSummaryEntry[]
  totals: {
    inputTokens: number
    outputTokens: number
    cost: number
    requests: number
  }
}

export interface AiMonthlyUsage {
  tenantId: string
  month: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  requestCount: number
}

/* ── FinOps types ────────────────────────────────────────── */

export interface AiUsageByUserEntry {
  userId: string
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  requestCount: number
}

export interface AiUsageByModelEntry {
  provider: string
  model: string | null
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  requestCount: number
}

export interface AiDailyUsageEntry {
  date: string
  inputTokens: number
  outputTokens: number
  cost: number
  requests: number
}

export interface AiFinopsDashboard {
  tenantId: string
  month: string
  totalCost: number
  totalTokens: number
  totalRequests: number
  budgetTotal: number | null
  budgetUsedPct: number | null
  projectedMonthEnd: number
  byFeature: AiUsageSummaryEntry[]
  byUser: AiUsageByUserEntry[]
  byModel: AiUsageByModelEntry[]
  dailyTrend: AiDailyUsageEntry[]
}

export interface AiCostRate {
  id: string
  tenantId: string
  provider: string
  model: string
  inputCostPer1k: number
  outputCostPer1k: number
  effectiveFrom: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AiBudgetAlert {
  id: string
  tenantId: string
  scope: string
  scopeKey: string | null
  monthlyBudget: number
  alertThresholds: string
  lastAlertPct: number
  lastAlertAt: string | null
  enabled: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

/* ── Transcript & Compliance types ───────────────────── */

export interface AiTranscriptStats {
  totalThreads: number
  totalMessages: number
  totalAuditLogs: number
  threadsOnHold: number
  threadsRedacted: number
}

export interface AiTranscriptPolicy {
  id: string
  tenantId: string
  chatRetentionDays: number
  auditRetentionDays: number
  autoRedactPii: boolean
  requireLegalHold: boolean
  lastCleanupAt: string | null
  lastCleanupCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AiTranscriptThread {
  id: string
  tenantId: string
  userId: string
  user?: { email: string }
  title: string | null
  model: string | null
  provider: string | null
  messageCount: number
  totalTokensUsed: number
  lastActivityAt: string
  isArchived: boolean
  legalHold: boolean
  complianceStatus: string
  redactedAt: string | null
  createdAt: string
}

export interface AiAuditLogEntry {
  id: string
  tenantId: string
  actor: string
  action: string
  model: string
  inputTokens: number
  outputTokens: number
  prompt: string | null
  response: string | null
  durationMs: number | null
  createdAt: string
}

export interface AiTranscriptMessage {
  id: string
  threadId: string
  role: string
  content: string
  model: string | null
  provider: string | null
  inputTokens: number
  outputTokens: number
  durationMs: number | null
  sequenceNum: number
  createdAt: string
}

/* ── AI Ops Workspace types ──────────────────────────── */

export interface AiOpsWorkspace {
  agents: {
    total: number
    online: number
    totalSessions24h: number
  }
  orchestration: {
    dispatches24h: number
    success24h: number
    failures24h: number
    pendingApprovals: number
  }
  findings: {
    total: number
    proposed: number
    applied: number
    dismissed: number
    highConfidence: number
  }
  chat: {
    totalThreads: number
    totalMessages: number
    legalHoldCount: number
  }
  usage24h: {
    totalTokens: number
    estimatedCost: number
    requests: number
  }
  audit: {
    totalLogs24h: number
    uniqueActors24h: number
  }
  recentActivity: AiOpsRecentItem[]
}

export interface AiOpsRecentItem {
  id: string
  type: string
  title: string
  status: string
  agentId: string | null
  sourceModule: string | null
  createdAt: string
}

/* ── AI Handoff types ────────────────────────────────── */

export interface AiHandoffHistoryItem {
  id: string
  findingId: string
  findingTitle: string
  findingType: string
  severity: string | null
  agentId: string | null
  sourceModule: string | null
  linkedModule: string
  linkedEntityType: string
  linkedEntityId: string
  createdAt: string
}

export interface AiHandoffStats {
  totalPromotions: number
  byTarget: Array<{ linkedModule: string; count: number }>
  byAgent: Array<{ agentId: string; count: number }>
  last24h: number
}

export interface AiHandoffPromoteResult {
  finding: unknown
  link: unknown
  createdEntityId: string
  targetModule: string
}

/* ── RAG Observability types ─────────────────────────── */

export interface RagRetrievedMemory {
  id: string
  content: string
  category: string
  similarity: number
}

export interface RagTraceResult {
  query: string
  memoriesRetrieved: RagRetrievedMemory[]
  totalMemoriesScanned: number
  embeddingModel: string | null
  similarityThreshold: number
  topN: number
  retrievalDurationMs: number
}

export interface RagStats {
  totalRetrievals24h: number
  avgMemoriesPerRetrieval: number
  avgSimilarityScore: number
  topCategories: Array<{ category: string; count: number }>
}

export interface RagTracePanelProps {
  t: (key: string) => string
  traceQuery: string
  setTraceQuery: (v: string) => void
  traceResult: RagTraceResult | null
  onTrace: () => void
  isTracing: boolean
}

/* ── AI Eval Lab types ────────────────────────────────── */

export interface AiEvalSuite {
  id: string
  tenantId: string
  name: string
  description: string | null
  datasetJson: unknown
  createdBy: string
  createdAt: string
  updatedAt: string
  _count?: { runs: number }
}

export interface AiEvalRun {
  id: string
  tenantId: string
  suiteId: string
  provider: string
  model: string
  status: string
  totalCases: number
  passedCases: number
  failedCases: number
  avgScore: number | null
  avgLatencyMs: number | null
  totalTokens: number
  resultsJson: unknown
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdBy: string
  createdAt: string
  suite?: { name: string }
}

export interface AiEvalStats {
  totalSuites: number
  totalRuns: number
  avgScore: number | null
  pendingRuns: number
  completedRuns: number
  failedRuns: number
}

/* ── AI Simulation types ──────────────────────────────── */

export interface AiSimulation {
  id: string
  tenantId: string
  name: string
  description: string | null
  agentId: string
  datasetJson: unknown
  status: string
  totalCases: number
  completedCases: number
  resultsJson: unknown
  avgScore: number | null
  avgLatencyMs: number | null
  totalTokens: number
  errorMessage: string | null
  startedAt: string | null
  completedAt: string | null
  createdBy: string
  createdAt: string
}

export interface AiSimulationStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  avgScore: number | null
  avgLatencyMs: number | null
}

/* ── Semantic Search types ────────────────────────────── */

export interface SemanticSearchResult {
  id: string
  module: string
  entityType: string
  title: string
  snippet: string
  score: number
  createdAt: string
}

export interface SearchableModule {
  key: string
  label: string
}

/* ── Agent Graph types ────────────────────────────────── */

export interface AgentGraphNode {
  agentId: string
  displayName: string
  isEnabled: boolean
  isCore: boolean
  executionAgent: string | null
  schedules: { id: string; cronExpression: string; isEnabled: boolean }[]
  features: string[]
  lastStatus: string | null
  tokenUsage: number
}

export interface ScheduleHealthSummary {
  totalSchedules: number
  enabledSchedules: number
  disabledSchedules: number
  totalAgents: number
  enabledAgents: number
  coreAgents: number
  specialistAgents: number
}
