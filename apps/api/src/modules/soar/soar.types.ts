import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { SoarPlaybook, SoarExecution } from '@prisma/client'

export interface SoarPlaybookRecord {
  id: string
  tenantId: string
  name: string
  description: string | null
  status: string
  triggerType: string
  triggerConditions: Record<string, unknown> | null
  steps: Record<string, unknown>[]
  stepsCount: number
  executionCount: number
  lastExecutedAt: Date | null
  createdBy: string
  createdByName: string | null
  tenantName: string
  createdAt: Date
  updatedAt: Date
}

export type PaginatedPlaybooks = PaginatedResponse<SoarPlaybookRecord>

export interface SoarExecutionRecord {
  id: string
  playbookId: string
  playbookName: string
  tenantId: string
  status: string
  triggeredBy: string
  triggeredByName: string | null
  triggerType: string
  stepsCompleted: number
  totalSteps: number
  durationSeconds: number | null
  startedAt: Date
  completedAt: Date | null
  output: Record<string, unknown> | null
  error: string | null
  createdAt: Date
}

export type PaginatedExecutions = PaginatedResponse<SoarExecutionRecord>

export interface SoarStats {
  totalPlaybooks: number
  activePlaybooks: number
  totalExecutions: number
  successfulExecutions: number
  failedExecutions: number
  avgExecutionTimeMs: number | null
}

export interface PlaybookWithTenant {
  id: string
  tenantId: string
  name: string
  description: string | null
  status: string
  triggerType: string
  triggerConditions: unknown
  steps: unknown
  executionCount: number
  lastExecutedAt: Date | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  tenant: { name: string }
}

export interface ExecutionWithPlaybook {
  id: string
  playbookId: string
  tenantId: string
  status: string
  triggeredBy: string
  triggerSource: string | null
  stepsCompleted: number
  totalSteps: number
  startedAt: Date
  completedAt: Date | null
  output: unknown
  error: string | null
  createdAt: Date
  playbook: { name: string; triggerType: string }
}

export type PlaybookWithTenantPrisma = SoarPlaybook & {
  tenant: { name: string }
}

export type ExecutionWithPlaybookPrisma = SoarExecution & {
  playbook: { name: string; triggerType: string }
}
