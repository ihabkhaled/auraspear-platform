import api from '@/lib/api'
import type {
  ApiResponse,
  ConnectorRecord,
  ConnectorStats,
  ConnectorSyncResult,
  ConnectorSyncStatusRecord,
  ConnectorTestResult,
  CreateConnectorInput,
  DeleteConnectorResult,
  ToggleConnectorInput,
} from '@/types'

export const connectorService = {
  list: () => api.get<ApiResponse<ConnectorRecord[]>>('/connectors').then(r => r.data.data),

  getByType: (type: string) =>
    api.get<ApiResponse<ConnectorRecord>>(`/connectors/${type}`).then(r => r.data.data),

  getStats: () => api.get<ApiResponse<ConnectorStats>>('/connectors/stats').then(r => r.data.data),

  create: (data: CreateConnectorInput) =>
    api.post<ApiResponse<ConnectorRecord>>('/connectors', data).then(r => r.data.data),

  update: (type: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<ConnectorRecord>>(`/connectors/${type}`, data).then(r => r.data.data),

  remove: (type: string) =>
    api.delete<ApiResponse<DeleteConnectorResult>>(`/connectors/${type}`).then(r => r.data),

  test: (type: string) =>
    api.post<ApiResponse<ConnectorTestResult>>(`/connectors/${type}/test`).then(r => r.data.data),

  toggle: ({ type, enabled }: ToggleConnectorInput) =>
    api
      .post<ApiResponse<ConnectorRecord>>(`/connectors/${type}/toggle`, { enabled })
      .then(r => r.data.data),

  sync: (type: string) =>
    api
      .post<ApiResponse<ConnectorSyncResult>>(`/connector-sync/${type}/sync`)
      .then(r => r.data.data),

  getSyncStatus: () =>
    api
      .get<ApiResponse<ConnectorSyncStatusRecord[]>>('/connector-sync/status')
      .then(r => r.data.data),
}
