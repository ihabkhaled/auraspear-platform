/**
 * Normalized response types for Connector Workspaces.
 * All connector strategies return data in these shapes so the frontend
 * can render a common shell regardless of connector type.
 */

import { type CardVariant, type Severity } from '../../../common/enums'

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
  severity?: Severity
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

/**
 * Strategy interface that each connector workspace must implement.
 */
export interface ConnectorWorkspaceStrategy {
  getOverview(config: Record<string, unknown>): Promise<{
    summaryCards: WorkspaceSummaryCard[]
    recentItems: WorkspaceRecentItem[]
    entitiesPreview: WorkspaceEntity[]
    quickActions: WorkspaceQuickAction[]
    metadata?: Record<string, unknown>
  }>

  getRecentActivity(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceRecentActivityResponse>

  getEntities(
    config: Record<string, unknown>,
    page: number,
    pageSize: number
  ): Promise<WorkspaceEntitiesResponse>

  search(
    config: Record<string, unknown>,
    request: WorkspaceSearchRequest
  ): Promise<WorkspaceSearchResponse>

  executeAction(
    config: Record<string, unknown>,
    action: string,
    params: Record<string, unknown>
  ): Promise<WorkspaceActionResponse>

  getAllowedActions(): string[]
}
