import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { Alert } from '@prisma/client'

export type AlertRecord = Alert

export type PaginatedAlerts = PaginatedResponse<AlertRecord>

export interface WazuhUpsertOp {
  externalId: string
  rule: Record<string, unknown> | undefined
  agent: Record<string, unknown> | null
  data: Record<string, unknown> | null
  source: Record<string, unknown>
  severity: string
  mitreTactics: string[]
  mitreTechniques: string[]
  timestamp: Date
}
