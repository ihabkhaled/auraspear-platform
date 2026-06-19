import type {
  ReportFormat,
  ReportModule,
  ReportStatus,
  ReportTemplateKey,
  ReportType,
  SortOrder,
} from '@/enums'

export interface Report {
  id: string
  tenantId: string
  templateId: string | null
  name: string
  description: string | null
  type: ReportType
  module: ReportModule | null
  templateKey: ReportTemplateKey | null
  templateName: string | null
  format: ReportFormat
  status: ReportStatus
  parameters: Record<string, unknown> | null
  filterSnapshot: Record<string, unknown> | null
  fileUrl: string | null
  fileSize: string | null
  generatedBy: string
  generatedByName: string | null
  generatedAt: string | null
  createdAt: string
}

export interface ReportStats {
  totalReports: number
  completedReports: number
  generatingReports: number
  failedReports: number
  availableTemplates: number
}

export interface ReportSearchParams {
  page?: number
  limit?: number
  type?: ReportType
  module?: ReportModule
  format?: ReportFormat
  status?: ReportStatus
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface CreateReportFormValues {
  name: string
  description: string
  type: ReportType
  module?: ReportModule | undefined
  templateKey?: ReportTemplateKey | undefined
  format: ReportFormat
  parameters: string
  filterSnapshot?: string | undefined
}

export interface EditReportFormValues {
  name: string
  description: string
  type: ReportType
  module?: ReportModule | undefined
  templateKey?: ReportTemplateKey | undefined
  format: ReportFormat
  parameters: string
  filterSnapshot?: string | undefined
}

export interface ReportTemplate {
  id: string
  tenantId: string | null
  key: ReportTemplateKey
  module: ReportModule
  name: string
  description: string | null
  type: ReportType
  defaultFormat: ReportFormat
  parameters: Record<string, unknown> | null
  isSystem: boolean
  tenantName: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateReportFromTemplateInput {
  templateKey: ReportTemplateKey
  module: ReportModule
  name?: string | undefined
  description?: string | undefined
  format?: ReportFormat | undefined
  parameters?: Record<string, unknown> | undefined
  filterSnapshot?: Record<string, unknown> | undefined
}

export interface ReportCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateReportFormValues) => void
  loading?: boolean
}

export interface ReportEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditReportFormValues) => void
  initialValues: EditReportFormValues
  loading?: boolean
}

export interface ReportDeleteDialogProps {
  reportId: string | null
  reportName: string
  onConfirm: (id: string) => void
}

export interface ReportDetailPanelProps {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (() => void) | undefined
  onDelete?: (() => void) | undefined
}

export interface ReportFiltersProps {
  searchQuery: string
  typeFilter: string
  formatFilter: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onTypeChange: (value: string) => void
  onFormatChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export interface ReportKpiCardsProps {
  stats: ReportStats | undefined
}

export interface ReportTemplateGridProps {
  templates: ReportTemplate[]
  loading: boolean
  generatingTemplateKey: ReportTemplateKey | null
  onGenerate: (template: ReportTemplate) => void
  t: (key: string) => string
}

export interface UseReportCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateReportFormValues) => void
}

export interface UseReportEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditReportFormValues) => void
  initialValues: EditReportFormValues
}

export interface ReportsPageDialogsReturn {
  readonly createOpen: boolean
  readonly setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editOpen: boolean
  readonly setEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly detailOpen: boolean
  readonly setDetailOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly selectedReport: Report | null
  readonly setSelectedReport: React.Dispatch<React.SetStateAction<Report | null>>
  readonly deleteReportId: string | null
  readonly setDeleteReportId: React.Dispatch<React.SetStateAction<string | null>>
  readonly deleteReportName: string
  readonly editInitialValues: EditReportFormValues
  readonly handleRowClick: (report: Report) => void
  readonly openEditDialog: () => void
  readonly openDeleteDialog: () => void
}

export interface ReportColumnTranslations {
  reports: (key: string) => string
  common: (key: string) => string
}
