// Types for the AI handoff service. Extracted from the service to satisfy
// the no-inline-declarations rule (apps/api CLAUDE.md rule 13 / audit BE-05).

import type { AiExecutionFinding, AiFindingOutputLink } from '@prisma/client'

export interface HandoffHistoryItem {
  id: string
  findingId: string
  findingTitle: string
  findingType: string
  severity: string | null
  agentId: string | null
  sourceModule: string | null
  linkedModule: string
  linkedEntityType: string
  linkedEntityId: string
  createdAt: Date
}

export interface HandoffStats {
  totalPromotions: number
  byTarget: Array<{ linkedModule: string; count: number }>
  byAgent: Array<{ agentId: string; count: number }>
  last24h: number
}

export interface PromoteInput {
  tenantId: string
  findingId: string
  targetModule: string
  actorUserId: string
  actorEmail: string
  title?: string
  description?: string
}

export interface PromoteResult {
  finding: AiExecutionFinding
  link: AiFindingOutputLink
  createdEntityId: string
  targetModule: string
}
