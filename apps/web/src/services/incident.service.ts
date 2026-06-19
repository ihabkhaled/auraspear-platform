import type { IncidentStatus } from '@/enums'
import api from '@/lib/api'
import type {
  ApiResponse,
  Incident,
  IncidentSearchParams,
  IncidentStats,
  IncidentTimelineEntry,
} from '@/types'

export const incidentService = {
  getIncidents: (params?: IncidentSearchParams) =>
    api.get<ApiResponse<Incident[]>>('/incidents', { params }).then(r => r.data),

  getIncidentById: (id: string) =>
    api.get<ApiResponse<Incident>>(`/incidents/${id}`).then(r => r.data),

  createIncident: (data: Record<string, unknown>) =>
    api.post<ApiResponse<Incident>>('/incidents', data).then(r => r.data),

  updateIncident: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<Incident>>(`/incidents/${id}`, data).then(r => r.data),

  changeIncidentStatus: (id: string, status: IncidentStatus) =>
    api.patch<ApiResponse<Incident>>(`/incidents/${id}/status`, { status }).then(r => r.data),

  deleteIncident: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/incidents/${id}`).then(r => r.data),

  getIncidentStats: () => api.get<ApiResponse<IncidentStats>>('/incidents/stats').then(r => r.data),

  getIncidentTimeline: (id: string) =>
    api.get<ApiResponse<IncidentTimelineEntry[]>>(`/incidents/${id}/timeline`).then(r => r.data),

  addTimelineEntry: (id: string, data: { event: string; actorType?: string }) =>
    api
      .post<ApiResponse<IncidentTimelineEntry>>(`/incidents/${id}/timeline`, data)
      .then(r => r.data),
}
