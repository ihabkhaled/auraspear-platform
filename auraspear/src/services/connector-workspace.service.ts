import api from '@/lib/api'
import type {
  ConnectorWorkspaceOverview,
  WorkspaceRecentActivityResponse,
  WorkspaceEntitiesResponse,
  WorkspaceSearchRequest,
  WorkspaceSearchResponse,
  WorkspaceActionResponse,
} from '@/types'

export const connectorWorkspaceService = {
  getOverview: (type: string) =>
    api
      .get<{ data: ConnectorWorkspaceOverview }>(`/connector-workspaces/${type}/overview`)
      .then(r => r.data.data),

  getRecentActivity: (type: string, page = 1, pageSize = 20) =>
    api
      .get<{
        data: WorkspaceRecentActivityResponse
      }>(`/connector-workspaces/${type}/recent-activity`, { params: { page, pageSize } })
      .then(r => r.data.data),

  getEntities: (type: string, page = 1, pageSize = 20) =>
    api
      .get<{ data: WorkspaceEntitiesResponse }>(`/connector-workspaces/${type}/entities`, {
        params: { page, pageSize },
      })
      .then(r => r.data.data),

  search: (type: string, request: WorkspaceSearchRequest) =>
    api
      .post<{ data: WorkspaceSearchResponse }>(`/connector-workspaces/${type}/search`, request)
      .then(r => r.data.data),

  executeAction: (type: string, action: string, params?: Record<string, unknown>) =>
    api
      .post<{
        data: WorkspaceActionResponse
      }>(`/connector-workspaces/${type}/actions/${action}`, { params: params ?? {} })
      .then(r => r.data.data),
}
