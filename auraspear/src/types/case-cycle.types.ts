import type { CaseCycleStatus } from '@/enums'
import type { Case } from './case.types'

export interface CaseCycle {
  id: string
  tenantId: string
  name: string
  description: string | null
  status: CaseCycleStatus
  startDate: string
  endDate: string | null
  createdBy: string
  closedBy: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  caseCount: number
  openCount: number
  closedCount: number
}

export interface CaseCycleDetail extends CaseCycle {
  cases: (Case & {
    ownerName: string | null
    ownerEmail: string | null
  })[]
}

export interface CreateCaseCycleInput {
  name: string
  description?: string
  startDate: string
  endDate?: string
}

export interface CloseCaseCycleInput {
  endDate?: string
}

export interface CaseCycleSearchParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: string
  status?: string
}

export interface EditCycleFormValues {
  name: string
  description: string
  startDate: string
  endDate: string
}

export interface EditCycleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditCycleFormValues) => void
  loading?: boolean
  cycle: CaseCycle | null
}

export interface EditCycleHookParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditCycleFormValues) => void
  cycle: CaseCycle | null
}
