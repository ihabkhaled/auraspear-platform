export interface RecordUsageInput {
  tenantId: string
  featureKey: string
  provider: string
  model: string | null
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  userId: string
}

export interface UsageSummaryEntry {
  featureKey: string
  provider: string
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  requestCount: number
}

export interface UsageSummaryResponse {
  tenantId: string
  startDate: string
  endDate: string
  entries: UsageSummaryEntry[]
  totals: {
    inputTokens: number
    outputTokens: number
    cost: number
    requests: number
  }
}

export interface MonthlyUsageResponse {
  tenantId: string
  month: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
  requestCount: number
}

export interface BudgetCheckResult {
  allowed: boolean
  used: number
  budget: number | null
}

export interface UsageSummaryRawRow {
  feature_key: string
  provider: string
  total_input: bigint | number
  total_output: bigint | number
  total_cost: number
  request_count: bigint | number
}

export interface MonthlyUsageRawRow {
  total_input: bigint | number
  total_output: bigint | number
  total_cost: number
  request_count: bigint | number
}

/* ── FinOps: breakdown types ─────────────────────────────── */

export interface UsageByUserRawRow {
  user_id: string
  total_input: bigint | number
  total_output: bigint | number
  total_cost: number
  request_count: bigint | number
}

export interface UsageByUserEntry {
  userId: string
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  requestCount: number
}

export interface UsageByModelRawRow {
  provider: string
  model: string | null
  total_input: bigint | number
  total_output: bigint | number
  total_cost: number
  request_count: bigint | number
}

export interface UsageByModelEntry {
  provider: string
  model: string | null
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  requestCount: number
}

export interface DailyUsageRawRow {
  day: Date
  total_input: bigint | number
  total_output: bigint | number
  total_cost: number
  request_count: bigint | number
}

export interface DailyUsageEntry {
  date: string
  inputTokens: number
  outputTokens: number
  cost: number
  requests: number
}

export interface FinopsDashboardResponse {
  tenantId: string
  month: string
  totalCost: number
  totalTokens: number
  totalRequests: number
  budgetTotal: number | null
  budgetUsedPct: number | null
  projectedMonthEnd: number
  byFeature: UsageSummaryEntry[]
  byUser: UsageByUserEntry[]
  byModel: UsageByModelEntry[]
  dailyTrend: DailyUsageEntry[]
}

/* ── FinOps: cost rate types ──────────────────────────────── */

export interface CostRateInput {
  tenantId: string
  provider: string
  model: string
  inputCostPer1k: number
  outputCostPer1k: number
  createdBy: string
}

export interface CostRateRecord {
  id: string
  tenantId: string
  provider: string
  model: string
  inputCostPer1k: number
  outputCostPer1k: number
  effectiveFrom: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/* ── FinOps: budget alert types ───────────────────────────── */

export interface BudgetAlertInput {
  tenantId: string
  scope: string
  scopeKey: string | null
  monthlyBudget: number
  alertThresholds: string
  createdBy: string
}

export interface BudgetAlertRecord {
  id: string
  tenantId: string
  scope: string
  scopeKey: string | null
  monthlyBudget: number
  alertThresholds: string
  lastAlertPct: number
  lastAlertAt: Date | null
  enabled: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
