import type { SortOrder } from '@/enums'

export interface ApplicationLogEntry {
  id: string
  level: string
  message: string
  feature: string
  action: string
  functionName: string | null
  className: string | null
  tenantId: string | null
  actorUserId: string | null
  actorEmail: string | null
  requestId: string | null
  targetResource: string | null
  targetResourceId: string | null
  outcome: string | null
  metadata: Record<string, unknown> | null
  stackTrace: string | null
  httpMethod: string | null
  httpRoute: string | null
  httpStatusCode: number | null
  sourceType: string | null
  ipAddress: string | null
  createdAt: string
}

export interface AppLogSearchParams {
  page?: number | undefined
  limit?: number | undefined
  query?: string | undefined
  level?: string | undefined
  feature?: string | undefined
  action?: string | undefined
  functionName?: string | undefined
  actorEmail?: string | undefined
  actorUserId?: string | undefined
  tenantId?: string | undefined
  requestId?: string | undefined
  sourceType?: string | undefined
  outcome?: string | undefined
  from?: string | undefined
  to?: string | undefined
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
}

export interface AppLogTableProps {
  logs: ApplicationLogEntry[]
  loading?: boolean
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
  onRowClick?: (log: ApplicationLogEntry) => void
}

export interface AppLogDetailDialogProps {
  log: ApplicationLogEntry | null
  open: boolean
  onClose: () => void
}

export interface AppLogDetailRowProps {
  label: string
  value: string | null | undefined
  isError?: boolean
}

export interface AppLogMetadataFieldConfig {
  key: string
  labelKey: string
  isError?: boolean
  suffix?: string
}

export interface AppLogExtractedMetadataField {
  key: string
  label: string
  value: string
  isError: boolean
}
