import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { CaseCycle, Case } from '@prisma/client'

export type CaseCycleRecord = CaseCycle & {
  caseCount: number
  openCount: number
  closedCount: number
}

export type CaseCycleDetail = CaseCycle & {
  cases: (Case & {
    ownerName: string | null
    ownerEmail: string | null
  })[]
  caseCount: number
  openCount: number
  closedCount: number
}

export type PaginatedCaseCycles = PaginatedResponse<CaseCycleRecord>
