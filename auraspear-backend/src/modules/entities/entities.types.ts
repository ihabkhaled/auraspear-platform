import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { Entity, EntityRelation } from '@prisma/client'

export type EntityRecord = Entity

export type EntityRelationRecord = EntityRelation

export type PaginatedEntities = PaginatedResponse<EntityRecord>

export interface EntityGraphNode {
  id: string
  type: string
  value: string
  displayName: string | null
  riskScore: number
}

export interface EntityGraphEdge {
  id: string
  fromEntityId: string
  toEntityId: string
  relationType: string
  confidence: number
  source: string | null
}

export interface EntityGraphResponse {
  rootEntity: EntityRecord
  nodes: EntityGraphNode[]
  edges: EntityGraphEdge[]
}

export interface RiskBreakdownFactor {
  factor: string
  score: number
  description: string
}

export interface RiskBreakdownResponse {
  entityId: string
  totalScore: number
  factors: RiskBreakdownFactor[]
}

export interface MsspTenantSummary {
  tenantId: string
  tenantName: string
  alertCount: number
  criticalAlerts: number
  openCases: number
  activeHunts: number
  connectorHealth: number
  aiUsage: number
}

export interface MsspPortfolioOverview {
  tenants: MsspTenantSummary[]
  totalAlerts: number
  totalCriticalAlerts: number
  totalOpenCases: number
}

export interface MsspTenantComparison {
  tenants: MsspTenantSummary[]
}

export interface AlertExtractionInput {
  tenantId: string
  id: string
  sourceIp: string | null
  destinationIp: string | null
  agentName: string | null
  rawEvent: unknown
  title: string
  source: string
}

export interface ExtractedEntity {
  type: string
  value: string
  displayName?: string
}

export interface ArtifactExtractionInput {
  tenantId: string
  type: string
  value: string
  source: string
}

export interface MispIocExtractionInput {
  tenantId: string
  iocType: string
  iocValue: string
  source: string
}
