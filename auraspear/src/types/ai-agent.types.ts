import type {
  AiAgentSessionStatus,
  AiAgentStatus,
  AiAgentTier,
  AiSessionTrigger,
  BadgeVariant,
  SortOrder,
} from '@/enums'

export interface AiAgent {
  id: string
  tenantId: string
  name: string
  model: string
  tier: AiAgentTier
  status: AiAgentStatus
  description: string | null
  soulMd: string | null
  totalTasks: number
  totalTokens: number
  totalCost: number
  avgTimeMs: number
  toolsCount: number
  sessionsCount: number
  tools?: AiAgentTool[]
  recentSessions?: AiAgentSession[]
  createdAt: string
  updatedAt: string
}

export interface AiAgentSession {
  id: string
  agentId: string
  status: AiAgentSessionStatus
  trigger: AiSessionTrigger | null
  sourceModule: string | null
  sourceEntity: string | null
  input: string
  output: string | null
  model: string | null
  provider: string | null
  tokensUsed: number
  cost: number
  durationMs: number
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
}

export interface AiAgentStats {
  totalAgents: number
  onlineAgents: number
  totalSessions: number
  totalTokens: number
  totalCost: number
}

export interface AiAgentSearchParams {
  page?: number
  limit?: number
  query?: string
  status?: string
  tier?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface AiAgentSessionSearchParams {
  page?: number
  limit?: number
}

export interface AiAgentTool {
  id: string
  agentId: string
  name: string
  description: string
  schema: unknown
  createdAt: string
}

export interface CreateAiAgentFormValues {
  name: string
  description: string
  model: string
  tier: AiAgentTier
  soulMd: string
}

export interface EditAiAgentFormValues {
  name: string
  description: string
  model: string
  tier: AiAgentTier
  soulMd: string
}

export interface AiAgentToolFormValues {
  name: string
  description: string
  schema: string
}

export interface CreateAgentToolInput {
  name: string
  description: string
  schema: Record<string, unknown>
}

export interface CreateAgentToolMutationInput {
  agentId: string
  data: CreateAgentToolInput
}

export interface DeleteAgentToolMutationInput {
  agentId: string
  toolId: string
}

export interface UpdateAiAgentSoulInput {
  soulMd: string
}

export interface UpdateAiAgentSoulMutationInput {
  id: string
  soulMd: string
}

export interface UpdateAiAgentMutationInput {
  id: string
  data: Record<string, unknown>
}

export interface RunAiAgentMutationInput {
  id: string
  prompt: string
  connector?: string | undefined
}

export interface DeleteAiAgentResult {
  deleted: boolean
}

export interface AiAgentCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateAiAgentFormValues) => void
  loading?: boolean
}

export interface AiAgentEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditAiAgentFormValues) => void
  initialValues: EditAiAgentFormValues
  loading?: boolean
}

export interface AiAgentDeleteDialogProps {
  agentName: string
  onConfirm: () => void
}

export interface AiAgentDetailPanelProps {
  agent: AiAgent
  onClose: () => void
  onEdit?: (() => void) | undefined
  onDelete?: (() => void) | undefined
}

export interface AiAgentToolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AiAgentToolFormValues) => void
  initialValues?: AiAgentToolFormValues
  loading?: boolean
}

export interface AiAgentSessionTableProps {
  agentId: string
}

export interface AiAgentKpiCardsProps {
  stats: AiAgentStats | null
}

export interface AiAgentFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
  tierFilter: string
  onTierChange: (value: string) => void
  onCreateClick?: (() => void) | undefined
}

export interface AiAgentColumnTranslations {
  aiAgents: (key: string) => string
}

export interface SessionColumnTranslations {
  (key: string): string
}

export interface AiAgentSessionDetailDialogProps {
  session: AiAgentSession | null
  open: boolean
  onClose: () => void
  t: (key: string) => string
  formattedDuration: string
  formattedCost: string
  formattedTokens: string
  formattedStartedAt: string
  formattedCompletedAt: string
}

export interface SessionStatusBadgeProps {
  variant: BadgeVariant
  className: string
}

export interface UseAiAgentCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateAiAgentFormValues) => void
}

export interface UseAiAgentEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: EditAiAgentFormValues) => void
  initialValues: EditAiAgentFormValues
}

export type AiAgentsPageDialogsReturn = {
  selectedAgentId: string | null
  setSelectedAgentId: (id: string | null) => void
  createDialogOpen: boolean
  setCreateDialogOpen: (open: boolean) => void
  editDialogOpen: boolean
  setEditDialogOpen: (open: boolean) => void
  editAgent: AiAgent | null
  setEditAgent: (agent: AiAgent | null) => void
  editInitialValues: EditAiAgentFormValues | null
  handleRowClick: (agent: AiAgent) => void
  handleEditOpen: (agent: AiAgent) => void
  handleCloseDetail: () => void
  findSelectedAgent: (agents: AiAgent[] | undefined) => AiAgent | null
}

export interface UseAiAgentToolDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: AiAgentToolFormValues) => void
  initialValues: AiAgentToolFormValues | undefined
}
