import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { AttackPath } from '@prisma/client'

export type AttackPathRecord = AttackPath & {
  tenantName: string
}

export type PaginatedAttackPaths = PaginatedResponse<
  AttackPath & {
    tenantName: string
  }
>

export interface AttackPathStats {
  activePaths: number
  assetsAtRisk: number
  avgKillChainCoverage: number
}
