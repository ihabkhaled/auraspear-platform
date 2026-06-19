import type {
  CaseArtifactType,
  CaseCycleStatus,
  CaseSeverity,
  CaseSortField,
  CaseStatus,
  CaseTaskStatus,
  CaseTimelineEntryType,
  CaseViewMode,
  CommentPartType,
  SortOrder,
} from '@/enums'
import type { TenantMember } from './admin.types'
import type { CaseCycle } from './case-cycle.types'
import type { SelectOption } from './common.types'

export interface CaseTask {
  id: string
  title: string
  status: CaseTaskStatus
  assignee: string
}

export interface CaseTimelineEntry {
  id: string
  timestamp: string
  type: CaseTimelineEntryType
  actor: string
  description: string
  metadata?: Record<string, unknown>
}

export interface CaseArtifact {
  id: string
  type: CaseArtifactType
  value: string
  source: string
}

export interface Case {
  id: string
  caseNumber: string
  title: string
  description: string
  status: CaseStatus
  severity: CaseSeverity
  ownerUserId: string | null
  ownerName: string | null
  ownerEmail: string | null
  createdBy: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  linkedAlerts: string[]
  cycleId: string | null
  timeline: CaseTimelineEntry[]
  tasks: CaseTask[]
  artifacts: CaseArtifact[]
  tenantId: string
  tenantName: string
}

export interface CreateCaseInput {
  title: string
  description: string
  severity: CaseSeverity
  ownerUserId?: string
  linkedAlertIds?: string[]
  cycleId?: string
}

export interface UpdateCaseInput {
  title?: string
  description?: string
  severity?: CaseSeverity
  ownerUserId?: string | null
  cycleId?: string | null
  status?: CaseStatus
}

export interface CaseSearchParams {
  page?: number
  limit?: number
  status?: string
  severity?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
  cycleId?: string
  ownerUserId?: string
}

export interface CaseListTableProps {
  cases: Case[]
  onCaseClick?: (caseItem: Case) => void
  loading?: boolean
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
  currentUserId?: string | undefined
  isAdmin?: boolean | undefined
}

export interface CreateCaseFormValues {
  title: string
  description: string
  severity: CaseSeverity
  assignee?: string | undefined
  cycleId?: string | undefined
}

export interface CreateCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCaseFormValues) => void
  assigneeOptions: SelectOption[]
  cycleOptions?: SelectOption[]
  loading?: boolean
}

export interface CaseDetailHeaderProps {
  caseItem: Case
  ownerName?: string | undefined
  members?: TenantMember[] | undefined
  cycles?: CaseCycleOption[] | undefined
  onEdit?: (() => void) | undefined
  onDelete?: (() => void) | undefined
  onEscalate?: (() => void) | undefined
  onStatusChange?: ((status: CaseStatus) => void) | undefined
  onAssigneeChange?: ((userId: string | null) => void) | undefined
  onCycleChange?: ((cycleId: string | null) => void) | undefined
}

export interface CaseCycleOption {
  id: string
  name: string
  status: string
}

export interface CaseKanbanCardProps {
  caseItem: Case
  onClick?: ((caseItem: Case) => void) | undefined
  currentUserId?: string | undefined
  isAdmin?: boolean | undefined
}

export interface EditCaseFormValues {
  title: string
  description: string
  severity: CaseSeverity
}

export interface EditCaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditCaseFormValues) => void
  initialValues: EditCaseFormValues
  loading?: boolean
}

export interface EditCaseHookParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditCaseFormValues) => void
  initialValues: EditCaseFormValues
}

export interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

export interface CommentAuthor {
  id: string
  name: string
  email: string
}

export interface CommentMentionUser {
  id: string
  name: string
  email: string
}

export interface CaseComment {
  id: string
  caseId: string
  body: string
  isEdited: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  author: CommentAuthor
  mentions: CommentMentionUser[]
}

export interface CreateCaseCommentInput {
  body: string
  mentionedUserIds: string[]
}

export interface UpdateCaseCommentInput {
  body: string
  mentionedUserIds: string[]
}

export interface MentionableUser {
  id: string
  name: string
  email: string
}

export interface CaseToolbarProps {
  viewMode: CaseViewMode
  onViewModeChange: (mode: CaseViewMode) => void
  activeSeverityFilter: CaseSeverity | undefined
  onSeverityFilterChange: (severity: CaseSeverity | undefined) => void
  sortField: CaseSortField
  onSortFieldChange: (field: CaseSortField) => void
  sortOrder: SortOrder
  onSortOrderChange: (order: SortOrder) => void
}

export interface CaseCommentsProps {
  caseId: string
  currentUserId: string
  isAdmin: boolean
  isCaseClosed: boolean
  canAddComment?: boolean | undefined
}

export interface CommentItemProps {
  comment: CaseComment
  currentUserId: string
  isAdmin: boolean
  onEdit?: (commentId: string, body: string) => void
  onDelete?: (commentId: string) => void
}

export interface CommentComposerProps {
  caseId: string
  currentUserId: string
  onSubmit: (body: string, mentionedUserIds: string[]) => void
  loading?: boolean
  disabled?: boolean
}

export interface UseCommentComposerProps {
  caseId: string
  currentUserId: string
  onSubmit: (body: string, mentionedUserIds: string[]) => void
  loading?: boolean | undefined
}

export interface CreateCycleFormValues {
  name: string
  description: string
  startDate: string
  endDate: string
}

export interface CreateCycleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCycleFormValues) => void
  loading?: boolean
}

export interface CaseTimelineProps {
  entries: CaseTimelineEntry[]
}

export interface CycleHistoryTableProps {
  cycles: CaseCycle[]
  onCycleClick?: (cycle: CaseCycle) => void
  loading?: boolean
  sortBy?: string | undefined
  sortOrder?: SortOrder | undefined
  onSort?: ((key: string, order: SortOrder) => void) | undefined
  showActions?: boolean
  onEdit?: (cycle: CaseCycle) => void
  onActivate?: (cycle: CaseCycle) => void
  onClose?: (cycle: CaseCycle) => void
  onDelete?: (cycle: CaseCycle) => void
}

export interface CaseArtifactPanelProps {
  artifacts: CaseArtifact[]
  onLookup?: ((artifact: CaseArtifact) => void) | undefined
  onAddArtifact?: ((data: { type: string; value: string; source?: string }) => void) | undefined
  onDeleteArtifact?: ((artifactId: string) => void) | undefined
  addingArtifact?: boolean | undefined
}

export interface CaseTaskListProps {
  tasks: CaseTask[]
  onToggleTask?: ((taskId: string, completed: boolean) => void) | undefined
  onAddTask?: ((title: string) => void) | undefined
  onDeleteTask?: ((taskId: string) => void) | undefined
  addingTask?: boolean | undefined
}

export interface CaseKanbanBoardProps {
  cases: Case[]
  onCaseClick?: (caseItem: Case) => void
  currentUserId?: string | undefined
  isAdmin?: boolean | undefined
}

export interface CaseOwnerFilterProps {
  members: TenantMember[]
  selectedUserId: string | undefined
  onUserSelect: (userId?: string) => void
  currentUserId: string
}

export interface CycleSelectorProps {
  cycles: CaseCycle[]
  activeCycleId: string | undefined
  selectedCycleId: string | undefined
  onCycleChange: (cycleId: string | undefined) => void
  loading?: boolean
}

export interface CycleBadgeProps {
  status: CaseCycleStatus
}

export interface UpdateCaseInput {
  title?: string
  description?: string
  severity?: CaseSeverity
  assignee?: string
  status?: CaseStatus
  linkedAlertIds?: string[]
}

export interface CaseSearchParams {
  page?: number
  limit?: number
  status?: string
  severity?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface UseCaseListTableParams {
  currentUserId?: string | undefined
  isAdmin?: boolean | undefined
}

export interface UseCreateCaseDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCaseFormValues) => void
}

export interface UseEditCaseDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditCaseFormValues) => void
  initialValues: EditCaseFormValues
}

export interface UseCreateCycleDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateCycleFormValues) => void
}

export interface UseCaseArtifactPanelParams {
  artifacts: CaseArtifact[]
  onAddArtifact?: ((data: { type: string; value: string; source?: string }) => void) | undefined
}

export interface UseCaseTaskListParams {
  tasks: CaseTaskListProps['tasks']
  onAddTask?: ((title: string) => void) | undefined
}

export interface CommentPart {
  type: CommentPartType
  value: string
}

export interface AiCaseCopilotResult {
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

export interface AiCaseCopilotPanelProps {
  caseId: string
  canUseCopilot: boolean
  results: Record<string, AiCaseCopilotResult>
  activeTask: string | null
  isLoading: boolean
  onSummarize: () => void
  onExecutiveSummary: () => void
  onTimeline: () => void
  onNextTasks: () => void
  tCommon: (key: string) => string
  t: (key: string) => string
}
