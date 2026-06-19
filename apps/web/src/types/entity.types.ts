import type { ApiResponse } from './common.types'

export interface EntityRecord {
  id: string
  tenantId: string
  type: string
  value: string
  displayName: string | null
  firstSeen: string
  lastSeen: string
  riskScore: number
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface EntityRelationRecord {
  id: string
  tenantId: string
  fromEntityId: string
  toEntityId: string
  relationType: string
  confidence: number
  source: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

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

export interface EntityGraphData {
  rootEntity: EntityRecord
  nodes: EntityGraphNode[]
  edges: EntityGraphEdge[]
}

export interface EntitySearchParams {
  search?: string
  type?: string
  minRiskScore?: number
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: string
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

export interface EntityColumnTranslations {
  type: string
  value: string
  riskScore: string
  firstSeen: string
  lastSeen: string
  actions: string
}

export interface CreateEntityInput {
  type: string
  value: string
  displayName?: string
  metadata?: Record<string, unknown>
}

export interface UpdateEntityInput {
  displayName?: string
  metadata?: Record<string, unknown>
}

export interface EntityFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  typeFilter: string
  onTypeChange: (value: string) => void
  t: (key: string) => string
}

export interface RiskScoreBadgeProps {
  score: number
}

export interface EntityGraphPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  graphData: ApiResponse<EntityGraphData> | undefined
  graphLoading: boolean
  t: (key: string) => string
}
