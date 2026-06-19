/**
 * Frontend types for Connector Workspace feature.
 * Mirrors the backend normalized response shapes.
 */

import type { AlertSeverity, CardVariant } from '@/enums'

export interface WorkspaceSummaryCard {
  key: string
  label: string
  value: string | number
  change?: string
  icon?: string
  variant?: CardVariant
}

export interface WorkspaceRecentItem {
  id: string
  title: string
  description?: string
  timestamp: string
  severity?: AlertSeverity
  type?: string
  metadata?: Record<string, unknown>
}

export interface WorkspaceEntity {
  id: string
  name: string
  status?: string
  type?: string
  lastSeen?: string
  metadata?: Record<string, unknown>
}

export interface WorkspaceQuickAction {
  key: string
  label: string
  description?: string
  icon?: string
  requiredRole?: string
  dangerous?: boolean
}

export interface ConnectorWorkspaceOverview {
  connector: {
    type: string
    status: string
    enabled: boolean
    lastTestedAt: string | null
    latencyMs: number | null
    healthMessage: string | null
  }
  summaryCards: WorkspaceSummaryCard[]
  recentItems: WorkspaceRecentItem[]
  entitiesPreview: WorkspaceEntity[]
  quickActions: WorkspaceQuickAction[]
  metadata?: Record<string, unknown>
}

export interface WorkspaceRecentActivityResponse {
  items: WorkspaceRecentItem[]
  total: number
  page: number
  pageSize: number
}

export interface WorkspaceEntitiesResponse {
  entities: WorkspaceEntity[]
  total: number
  page: number
  pageSize: number
}

export interface WorkspaceSearchRequest {
  query: string
  filters?: Record<string, unknown>
  page?: number
  pageSize?: number
  from?: string
  to?: string
}

export interface WorkspaceSearchResponse {
  results: WorkspaceRecentItem[]
  total: number
  page: number
  pageSize: number
}

export interface WorkspaceActionRequest {
  params?: Record<string, unknown>
}

export interface WorkspaceActionResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
}
