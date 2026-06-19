import { toIso } from '../../../common/utils/date-time.utility'
import type {
  DailyUsageEntry,
  DailyUsageRawRow,
  MonthlyUsageRawRow,
  MonthlyUsageResponse,
  UsageByModelEntry,
  UsageByModelRawRow,
  UsageByUserEntry,
  UsageByUserRawRow,
  UsageSummaryEntry,
  UsageSummaryRawRow,
  UsageSummaryResponse,
} from './usage-budget.types'

/* ---------------------------------------------------------------- */
/* USAGE SUMMARY BUILDING                                            */
/* ---------------------------------------------------------------- */

export function buildUsageSummaryResponse(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  rows: UsageSummaryRawRow[]
): UsageSummaryResponse {
  let totalInput = 0
  let totalOutput = 0
  let totalCost = 0
  let totalRequests = 0

  const entries: UsageSummaryEntry[] = []

  for (const row of rows) {
    const inputTokens = Number(row.total_input)
    const outputTokens = Number(row.total_output)
    const cost = Number(row.total_cost)
    const requestCount = Number(row.request_count)

    totalInput += inputTokens
    totalOutput += outputTokens
    totalCost += cost
    totalRequests += requestCount

    entries.push({
      featureKey: row.feature_key,
      provider: row.provider,
      totalInputTokens: inputTokens,
      totalOutputTokens: outputTokens,
      totalCost: cost,
      requestCount,
    })
  }

  return {
    tenantId,
    startDate: toIso(startDate),
    endDate: toIso(endDate),
    entries,
    totals: {
      inputTokens: totalInput,
      outputTokens: totalOutput,
      cost: totalCost,
      requests: totalRequests,
    },
  }
}

/* ---------------------------------------------------------------- */
/* MONTHLY USAGE BUILDING                                            */
/* ---------------------------------------------------------------- */

export function buildMonthlyUsageResponse(
  tenantId: string,
  monthLabel: string,
  row: MonthlyUsageRawRow | undefined
): MonthlyUsageResponse {
  const inputTokens = row ? Number(row.total_input) : 0
  const outputTokens = row ? Number(row.total_output) : 0

  return {
    tenantId,
    month: monthLabel,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: row ? Number(row.total_cost) : 0,
    requestCount: row ? Number(row.request_count) : 0,
  }
}

/* ---------------------------------------------------------------- */
/* USER BREAKDOWN BUILDING                                           */
/* ---------------------------------------------------------------- */

export function buildUsageByUser(rows: UsageByUserRawRow[]): UsageByUserEntry[] {
  return rows.map(row => ({
    userId: row.user_id,
    totalInputTokens: Number(row.total_input),
    totalOutputTokens: Number(row.total_output),
    totalCost: Number(row.total_cost),
    requestCount: Number(row.request_count),
  }))
}

/* ---------------------------------------------------------------- */
/* MODEL BREAKDOWN BUILDING                                          */
/* ---------------------------------------------------------------- */

export function buildUsageByModel(rows: UsageByModelRawRow[]): UsageByModelEntry[] {
  return rows.map(row => ({
    provider: row.provider,
    model: row.model,
    totalInputTokens: Number(row.total_input),
    totalOutputTokens: Number(row.total_output),
    totalCost: Number(row.total_cost),
    requestCount: Number(row.request_count),
  }))
}

/* ---------------------------------------------------------------- */
/* DAILY TREND BUILDING                                              */
/* ---------------------------------------------------------------- */

export function buildDailyUsage(rows: DailyUsageRawRow[]): DailyUsageEntry[] {
  return rows.map(row => ({
    date: toIso(row.day).split('T').at(0) ?? '',
    inputTokens: Number(row.total_input),
    outputTokens: Number(row.total_output),
    cost: Number(row.total_cost),
    requests: Number(row.request_count),
  }))
}

/* ---------------------------------------------------------------- */
/* PROJECTION UTILITY                                                */
/* ---------------------------------------------------------------- */

export function projectMonthEndCost(currentCost: number, dayOfMonth: number, daysInMonth: number): number {
  if (dayOfMonth <= 0) return currentCost
  return (currentCost / dayOfMonth) * daysInMonth
}
