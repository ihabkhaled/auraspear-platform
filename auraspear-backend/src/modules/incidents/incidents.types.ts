import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { Incident, IncidentTimeline } from '@prisma/client'

export type IncidentWithTenant = Incident & {
  tenant: { name: string }
}

export type IncidentWithTenantAndTimeline = Incident & {
  tenant: { name: string }
  timeline: IncidentTimeline[]
}

export type IncidentRecord = Incident & {
  timeline: IncidentTimeline[]
  assigneeName: string | null
  assigneeEmail: string | null
  createdByName: string | null
  tenantName: string
}

export type PaginatedIncidents = PaginatedResponse<
  Incident & {
    assigneeName: string | null
    assigneeEmail: string | null
    createdByName: string | null
    tenantName: string
  }
>

export interface IncidentStats {
  open: number
  inProgress: number
  contained: number
  resolved30d: number
  avgResolveHours: number | null
}
