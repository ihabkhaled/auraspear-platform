import type { MlModelStatus, MlModelType, SortOrder, UebaEntityType, UebaRiskLevel } from '@/enums'

export interface UebaEntity {
  id: string
  tenantId: string
  entityType: UebaEntityType
  entityName: string
  riskScore: number
  riskLevel: UebaRiskLevel
  anomalyCount: number
  topAnomaly: string | null
  trendData: number[] | null
  lastSeenAt: string | null
  createdAt: string
  updatedAt: string
}

export interface UebaAnomaly {
  id: string
  tenantId: string
  entityId: string
  entityName: string
  entityType: string
  anomalyType: string
  description: string
  severity: UebaRiskLevel
  score: number
  detectedAt: string
  resolved: boolean
}

export interface MlModel {
  id: string
  tenantId: string
  name: string
  modelType: MlModelType
  status: MlModelStatus
  accuracy: number
  lastTrainedAt: string | null
  dataPointsProcessed: number
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface UebaStats {
  totalEntities: number
  criticalRiskEntities: number
  highRiskEntities: number
  anomalies24h: number
  activeModels: number
}

export interface UebaEntitySearchParams {
  page?: number
  limit?: number
  query?: string
  entityType?: string
  riskLevel?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface UebaAnomalySearchParams {
  page?: number
  limit?: number
  severity?: string
  entityId?: string
  resolved?: boolean
  sortBy?: string
  sortOrder?: SortOrder
}

export interface MlModelSearchParams {
  page?: number
  limit?: number
  query?: string
  status?: string
  modelType?: string
}

export interface CreateUebaEntityFormValues {
  entityName: string
  entityType: UebaEntityType
}

export interface EditUebaEntityFormValues {
  entityName: string
  entityType: UebaEntityType
}

export interface UebaEntityCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateUebaEntityFormValues) => void
  loading?: boolean
}

export interface UebaEntityEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditUebaEntityFormValues) => void
  initialValues: EditUebaEntityFormValues
  loading?: boolean
}

export interface UebaEntityDeleteDialogProps {
  entityName: string
  anomalyCount: number
  onConfirm: () => void
}

export interface UebaEntityDetailPanelProps {
  entityId: string | null
  onClose: () => void
}

export interface UebaKpiCardsProps {
  stats: UebaStats | null
}

export interface UebaFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  entityTypeFilter: string
  onEntityTypeChange: (value: string) => void
  riskLevelFilter: string
  onRiskLevelChange: (value: string) => void
}

export interface UseUebaFiltersInput {
  onSearchChange: (value: string) => void
  onEntityTypeChange: (value: string) => void
  onRiskLevelChange: (value: string) => void
}

export interface UebaAnomalyCardProps {
  anomaly: UebaAnomaly
  onResolve: (id: string) => void
  resolving: boolean
}

export interface UebaMlModelCardProps {
  model: MlModel
}

export interface UseUebaEntityCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateUebaEntityFormValues) => void
}

export interface UseUebaEntityEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditUebaEntityFormValues) => void
  initialValues: EditUebaEntityFormValues
}

export interface UebaPageDialogsReturn {
  readonly selectedEntityId: string | null
  readonly setSelectedEntityId: React.Dispatch<React.SetStateAction<string | null>>
  readonly createDialogOpen: boolean
  readonly setCreateDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editDialogOpen: boolean
  readonly setEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editingEntity: UebaEntity | null
  readonly setEditingEntity: React.Dispatch<React.SetStateAction<UebaEntity | null>>
  readonly editInitialValues: EditUebaEntityFormValues
  readonly handleRowClick: (entity: UebaEntity) => void
  readonly handleCloseDetailPanel: () => void
  readonly handleEditOpen: (entity: UebaEntity) => void
}

export interface UebaColumnTranslations {
  ueba: (key: string) => string
}

export interface AiUebaNarrativeResult {
  result: string
  reasoning: string[]
  confidence: number
  model: string
  provider: string
  tokensUsed: {
    input: number
    output: number
  }
}
