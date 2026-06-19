import type {
  IncidentActorType,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  SortOrder,
} from '@/enums'

export interface Incident {
  id: string
  tenantId: string
  incidentNumber: string
  title: string
  description: string | null
  severity: IncidentSeverity
  status: IncidentStatus
  category: IncidentCategory
  assigneeId: string | null
  assigneeName: string | null
  assigneeEmail: string | null
  linkedAlertIds: string[]
  linkedCaseId: string | null
  mitreTactics: string[]
  mitreTechniques: string[]
  createdBy: string
  createdByName: string | null
  tenantName: string
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  timeline: IncidentTimelineEntry[]
}

export interface IncidentTimelineEntry {
  id: string
  incidentId: string
  event: string
  actorType: IncidentActorType
  actorName: string
  timestamp: string
}

export interface IncidentStats {
  open: number
  inProgress: number
  contained: number
  resolved30d: number
  avgResolveHours: number | null
}

export interface IncidentSearchParams {
  page?: number
  limit?: number
  severity?: string
  status?: string
  category?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface CreateIncidentFormValues {
  title: string
  description: string
  severity: IncidentSeverity
  category: IncidentCategory
  assigneeId?: string | undefined
  mitreTechniques?: string | undefined
}

export interface EditIncidentFormValues {
  title: string
  description: string
  severity: IncidentSeverity
  category: IncidentCategory
  status: IncidentStatus
  assigneeId?: string | undefined
  mitreTechniques?: string | undefined
}

export interface IncidentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateIncidentFormValues) => void
  assigneeOptions: Array<{ value: string; label: string }>
  loading?: boolean
}

export interface IncidentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditIncidentFormValues) => void
  initialValues: EditIncidentFormValues
  assigneeOptions: Array<{ value: string; label: string }>
  loading?: boolean
}

export interface IncidentDeleteDialogProps {
  incidentNumber: string
  title: string
  onConfirm: () => void
  loading?: boolean
}

export interface IncidentKpiCardsProps {
  stats: IncidentStats | undefined
  isLoading: boolean
}

export interface IncidentFiltersProps {
  searchQuery: string
  statusFilter: string
  severityFilter: string
  categoryFilter: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onSeverityChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onClearAll: () => void
}

export interface IncidentTimelineProps {
  incidentId: string
}

export interface IncidentDetailPanelProps {
  incident: Incident | null
  open: boolean
  onOpenChange: (open: boolean) => void
  canEditIncident?: boolean | undefined
  canChangeStatus?: boolean | undefined
  onEditIncident?: (() => void) | undefined
  onChangeStatus?: ((status: IncidentStatus) => void) | undefined
  isChangingStatus?: boolean | undefined
}

export interface IncidentColumnTranslations {
  incidents: (key: string) => string
  common: (key: string) => string
}

export interface IncidentCreateHookParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateIncidentFormValues) => void
}

export interface IncidentEditHookParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditIncidentFormValues) => void
  initialValues: EditIncidentFormValues
}

export interface IncidentPageDialogsReturn {
  readonly createDialogOpen: boolean
  readonly setCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editDialogOpen: boolean
  readonly setEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly detailPanelOpen: boolean
  readonly setDetailPanelOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editingIncident: Incident | null
  readonly setEditingIncident: React.Dispatch<React.SetStateAction<Incident | null>>
  readonly detailIncident: Incident | null
  readonly setDetailIncident: React.Dispatch<React.SetStateAction<Incident | null>>
  readonly editInitialValues: EditIncidentFormValues
  readonly handleRowClick: (incident: Incident) => void
  readonly handleOpenEdit: (incident: Incident) => void
}
