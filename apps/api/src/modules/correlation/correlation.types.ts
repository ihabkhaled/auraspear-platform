import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { CorrelationRule } from '@prisma/client'

export type RuleRecord = CorrelationRule & {
  createdByName: string | null
  tenantName: string
}

export type PaginatedRules = PaginatedResponse<RuleRecord>

export interface CorrelationStats {
  correlationRules: number
  sigmaRules: number
  fired24h: number
  linkedToIncidents: number
}

/* ---------------------------------------------------------------- */
/* Correlation Executor                                              */
/* ---------------------------------------------------------------- */

export interface CorrelationEvent {
  type: string
  timestamp: string
  data: Record<string, unknown>
}

export interface CorrelationResult {
  ruleId: string
  status: 'triggered' | 'not_triggered' | 'error'
  eventsCorrelated: number
  triggeredAt?: string
  description?: string
  durationMs: number
  error?: string
}

export interface CorrelationRuleInput {
  id: string
  name: string
  eventTypes: string[]
  threshold: number
  timeWindowMinutes: number
  groupBy?: string
}
