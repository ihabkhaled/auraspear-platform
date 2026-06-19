import type { ComplianceStandard, ComplianceControlStatus, SortOrder } from '@/enums'

export interface ComplianceFramework {
  id: string
  tenantId: string
  name: string
  standard: ComplianceStandard
  version: string
  description: string | null
  totalControls: number
  passedControls: number
  failedControls: number
  complianceScore: number | null
  lastAssessedAt: string | null
  createdBy: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface ComplianceControl {
  id: string
  frameworkId: string
  controlId: string
  title: string
  description: string | null
  status: ComplianceControlStatus
  evidence: string | null
  assessedAt: string | null
  assessedBy: string | null
  assessedByName: string | null
}

export interface ComplianceStats {
  totalFrameworks: number
  avgComplianceScore: number | null
  passedControls: number
  failedControls: number
  notAssessedControls: number
}

export interface ComplianceStatsSource {
  totalFrameworks: number
  overallComplianceScore?: number | null
  avgComplianceScore?: number | null
  passedControls: number
  failedControls: number
  notAssessedControls: number
}

export interface ComplianceSearchParams {
  page?: number
  limit?: number
  standard?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface CreateComplianceFrameworkFormValues {
  name: string
  standard: ComplianceStandard
  version: string
  description: string
}

export interface EditComplianceFrameworkFormValues {
  name: string
  standard: ComplianceStandard
  version: string
  description: string
}

export interface EditComplianceControlFormValues {
  status: ComplianceControlStatus
  evidence: string
  notes: string
}

export interface ComplianceCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateComplianceFrameworkFormValues) => void
  loading?: boolean
}

export interface ComplianceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditComplianceFrameworkFormValues) => void
  initialValues: EditComplianceFrameworkFormValues
  loading?: boolean
}

export interface ComplianceDeleteDialogProps {
  frameworkId: string | null
  frameworkName: string
  onConfirm: (id: string) => void
}

export interface ComplianceDetailPanelProps {
  framework: ComplianceFramework | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: ((framework: ComplianceFramework) => void) | undefined
  onDelete?: ((framework: ComplianceFramework) => void) | undefined
}

export interface ComplianceControlCardProps {
  control: ComplianceControl
  onAssess: (control: ComplianceControl) => void
}

export interface ComplianceControlEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditComplianceControlFormValues) => void
  initialValues: EditComplianceControlFormValues
  controlTitle: string
  loading?: boolean
}

export interface ComplianceFiltersProps {
  searchQuery: string
  standardFilter: string
  onSearchChange: (value: string) => void
  onStandardChange: (value: string) => void
}

export interface ComplianceKpiCardsProps {
  stats: ComplianceStats | undefined
}

export interface ComplianceColumnTranslations {
  compliance: (key: string) => string
  common: (key: string) => string
}

export interface UseComplianceCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateComplianceFrameworkFormValues) => void
}

export interface UseComplianceEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditComplianceFrameworkFormValues) => void
  initialValues: EditComplianceFrameworkFormValues
}

export interface CompliancePageDialogsReturn {
  readonly createOpen: boolean
  readonly setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editOpen: boolean
  readonly setEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly detailOpen: boolean
  readonly setDetailOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly selectedFramework: ComplianceFramework | null
  readonly setSelectedFramework: React.Dispatch<React.SetStateAction<ComplianceFramework | null>>
  readonly deleteFrameworkId: string | null
  readonly setDeleteFrameworkId: React.Dispatch<React.SetStateAction<string | null>>
  readonly deleteFrameworkName: string
  readonly editInitialValues: EditComplianceFrameworkFormValues
  readonly handleRowClick: (framework: ComplianceFramework) => void
  readonly openEditDialog: (framework: ComplianceFramework) => void
  readonly openDeleteDialog: (framework: ComplianceFramework) => void
}

export interface UseComplianceControlEditParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditComplianceControlFormValues) => void
  initialValues: EditComplianceControlFormValues
}
