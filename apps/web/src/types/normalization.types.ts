import type { NormalizationPipelineStatus, NormalizationSourceType, SortOrder } from '@/enums'

export interface NormalizationPipeline {
  id: string
  tenantId: string
  name: string
  description: string | null
  sourceType: NormalizationSourceType
  status: NormalizationPipelineStatus
  parserConfig: Record<string, unknown>
  fieldMappings: Record<string, unknown>
  processedCount: number
  errorCount: number
  lastProcessedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NormalizationStats {
  totalPipelines: number
  activePipelines: number
  inactivePipelines: number
  errorPipelines: number
  totalEventsProcessed: number
  totalErrors: number
}

export interface NormalizationSearchParams {
  page?: number
  limit?: number
  sourceType?: string
  status?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface CreateNormalizationFormValues {
  name: string
  sourceType: NormalizationSourceType
  parserConfig: string
  fieldMappings: string
}

export interface EditNormalizationFormValues {
  name: string
  sourceType: NormalizationSourceType
  parserConfig: string
  fieldMappings: string
}

export interface NormalizationCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateNormalizationFormValues) => void
  loading?: boolean
}

export interface NormalizationEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditNormalizationFormValues) => void
  initialValues: EditNormalizationFormValues
  loading?: boolean
}

export interface NormalizationDeleteDialogProps {
  pipelineName: string
  onConfirm: () => void
  loading?: boolean
}

export interface NormalizationKpiCardsProps {
  stats: NormalizationStats | undefined
  isLoading: boolean
}

export interface NormalizationFiltersProps {
  searchQuery: string
  sourceTypeFilter: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onSourceTypeChange: (value: string) => void
  onStatusChange: (value: string) => void
}

export interface NormalizationDetailPanelProps {
  pipeline: NormalizationPipeline | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: ((pipeline: NormalizationPipeline) => void) | undefined
  onDelete?: ((pipeline: NormalizationPipeline) => void) | undefined
  onAiVerify?: ((pipelineId: string) => void) | undefined
  aiVerifying?: boolean | undefined
}

export interface UseNormalizationDetailPanelParams {
  pipeline: NormalizationDetailPanelProps['pipeline']
  onEdit?: NormalizationDetailPanelProps['onEdit'] | undefined
  onDelete?: NormalizationDetailPanelProps['onDelete'] | undefined
  onAiVerify?: NormalizationDetailPanelProps['onAiVerify'] | undefined
  aiVerifying?: NormalizationDetailPanelProps['aiVerifying'] | undefined
}

export interface UseNormalizationCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateNormalizationFormValues) => void
}

export interface UseNormalizationDeleteDialogParams {
  pipelineName: string
  onConfirm: () => void
}

export interface UseNormalizationEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditNormalizationFormValues) => void
  initialValues: EditNormalizationFormValues
}

export interface NormalizationColumnTranslations {
  normalization: (key: string) => string
  common: (key: string) => string
}

export interface NormalizationPageDialogsReturn {
  readonly createOpen: boolean
  readonly setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editOpen: boolean
  readonly setEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly detailOpen: boolean
  readonly setDetailOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly selectedPipeline: NormalizationPipeline | null
  readonly setSelectedPipeline: React.Dispatch<React.SetStateAction<NormalizationPipeline | null>>
  readonly editInitialValues: EditNormalizationFormValues
  readonly handleRowClick: (pipeline: NormalizationPipeline) => void
  readonly handleOpenEdit: (pipeline: NormalizationPipeline) => void
  readonly handleOpenDelete: (pipeline: NormalizationPipeline) => void
}
