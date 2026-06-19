import type { SoarPlaybookStatus, SoarTriggerType, SoarExecutionStatus, SortOrder } from '@/enums'

export interface SoarPlaybook {
  id: string
  tenantId: string
  name: string
  description: string | null
  status: SoarPlaybookStatus
  triggerType: SoarTriggerType
  stepsCount: number
  lastExecutedAt: string | null
  executionCount: number
  avgDurationSeconds: number | null
  createdBy: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface SoarExecution {
  id: string
  playbookId: string
  playbookName: string
  status: SoarExecutionStatus
  triggeredBy: string
  triggeredByName: string | null
  triggerType: SoarTriggerType
  stepsCompleted: number
  totalSteps: number
  durationSeconds: number | null
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

export interface SoarStats {
  totalPlaybooks: number
  activePlaybooks: number
  totalExecutions30d: number
  successRate: number | null
  avgDurationSeconds: number | null
}

export interface SoarStatsSource {
  totalPlaybooks?: number | null
  activePlaybooks?: number | null
  totalExecutions30d?: number | null
  totalExecutions?: number | null
  successRate?: number | null
  successfulExecutions?: number | null
  failedExecutions?: number | null
  avgDurationSeconds?: number | null
  avgExecutionTimeMs?: number | null
}

export interface SoarPlaybookSearchParams {
  page?: number
  limit?: number
  status?: string
  triggerType?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface SoarExecutionSearchParams {
  page?: number
  limit?: number
  playbookId?: string
  status?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface CreateSoarPlaybookFormValues {
  name: string
  description: string
  triggerType: SoarTriggerType
  steps: string
  triggerConditions?: string
  cronExpression: string
}

export interface EditSoarPlaybookFormValues {
  name: string
  description: string
  triggerType: SoarTriggerType
  steps: string
  triggerConditions?: string
  cronExpression: string
}

export interface SoarCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateSoarPlaybookFormValues) => void
  loading?: boolean
}

export interface SoarEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditSoarPlaybookFormValues) => void
  initialValues: EditSoarPlaybookFormValues
  loading?: boolean
}

export interface SoarDeleteDialogProps {
  playbookId: string | null
  playbookName: string
  onConfirm: (id: string) => void
}

export interface SoarRunDialogProps {
  playbookId: string | null
  playbookName: string
  onConfirm: (id: string) => void
}

export interface SoarDetailPanelProps {
  playbook: SoarPlaybook | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: ((playbook: SoarPlaybook) => void) | undefined
  onDelete?: ((playbook: SoarPlaybook) => void) | undefined
  onRun?: ((playbook: SoarPlaybook) => void) | undefined
}

export interface SoarExecutionHistoryProps {
  playbookId: string | null
}

export interface SoarFiltersProps {
  searchQuery: string
  statusFilter: string
  triggerFilter: string
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onTriggerChange: (value: string) => void
}

export interface SoarKpiCardsProps {
  stats: SoarStats | undefined
}

export interface UseSoarCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateSoarPlaybookFormValues) => void
}

export interface UseSoarEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditSoarPlaybookFormValues) => void
  initialValues: EditSoarPlaybookFormValues
}

export interface SoarPageDialogsReturn {
  readonly createOpen: boolean
  readonly setCreateOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly editOpen: boolean
  readonly setEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly detailOpen: boolean
  readonly setDetailOpen: React.Dispatch<React.SetStateAction<boolean>>
  readonly selectedPlaybook: SoarPlaybook | null
  readonly setSelectedPlaybook: React.Dispatch<React.SetStateAction<SoarPlaybook | null>>
  readonly deletePlaybookId: string | null
  readonly setDeletePlaybookId: React.Dispatch<React.SetStateAction<string | null>>
  readonly deletePlaybookName: string
  readonly runPlaybookId: string | null
  readonly setRunPlaybookId: React.Dispatch<React.SetStateAction<string | null>>
  readonly runPlaybookName: string
  readonly editInitialValues: EditSoarPlaybookFormValues
  readonly handleRowClick: (playbook: SoarPlaybook) => void
  readonly openEditDialog: (playbook: SoarPlaybook) => void
  readonly openDeleteDialog: (playbook: SoarPlaybook) => void
  readonly openRunDialog: (playbook: SoarPlaybook) => void
}

export interface SoarColumnTranslations {
  soar: (key: string) => string
  common: (key: string) => string
}

export interface AiSoarPanelProps {
  canUseCopilot: boolean
  description: string
  onDescriptionChange: (value: string) => void
  isLoading: boolean
  draftResult: AiSoarResult | null
  onDraftPlaybook: () => void
  tCommon: (key: string) => string
  t: (key: string) => string
}

export interface AiSoarResult {
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
