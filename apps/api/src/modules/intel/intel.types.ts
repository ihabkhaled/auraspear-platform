import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { IntelIOC, IntelMispEvent } from '@prisma/client'

export type IOCRecord = IntelIOC
export type MispEventRecord = IntelMispEvent
export type PaginatedIOCs = PaginatedResponse<IOCRecord>
export type PaginatedMispEvents = PaginatedResponse<MispEventRecord>

export interface IOCMatchResult {
  alertId: string
  matchedIOCs: Array<{
    iocValue: string
    iocType: string
    source: string
    severity: string
  }>
  matchCount: number
}

export interface IOCMatch {
  iocValue: string
  iocType: string
  source: string
  severity: string
}

export interface IntelStatsResponse {
  threatActors: number
  ipIOCs: number
  fileHashes: number
  activeDomains: number
  totalIOCs: number
}
