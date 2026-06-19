import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { HuntEvent, HuntSession, Prisma } from '@prisma/client'

export type HuntSessionRecord = HuntSession & { events: HuntEvent[] }
export type PaginatedHuntSessions = PaginatedResponse<HuntSession>
export type PaginatedHuntEvents = PaginatedResponse<HuntEvent>

export interface CreateSessionInput {
  tenantId: string
  query: string
  status: HuntSession['status']
  startedBy: string
  timeRange: string
  reasoning: string[]
}

export interface UpdateSessionStatusInput {
  id: string
  tenantId: string
  status: HuntSession['status']
  completedAt: Date
  reasoning: string[]
}

export interface UpdateSessionCompletedInput {
  id: string
  tenantId: string
  status: HuntSession['status']
  completedAt: Date
  eventsFound: number
  uniqueIps: number
  threatScore: number
  mitreTactics: string[]
  mitreTechniques: string[]
  timeRange: string
  executedQuery: Prisma.InputJsonValue
  reasoning: string[]
  aiAnalysis: string
}

export interface CreateEventInput {
  huntSessionId: string
  timestamp: Date
  severity: string
  eventId: string
  sourceIp: string | null
  user: string | null
  description: string
}

export interface HuntEventData {
  huntSessionId: string
  timestamp: Date
  severity: string
  eventId: string
  sourceIp: string | null
  user: string | null
  description: string
}
