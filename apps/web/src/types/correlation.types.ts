import type { ReactNode } from 'react'
import type { RuleSeverity, RuleSource, RuleStatus, SortOrder } from '@/enums'

export interface CorrelationRule {
  id: string
  tenantId: string
  ruleNumber: string
  title: string
  description: string | null
  source: RuleSource
  severity: RuleSeverity
  status: RuleStatus
  yamlContent: string | null
  conditions: Record<string, unknown> | null
  mitreTactics: string[]
  mitreTechniques: string[]
  hitCount: number
  linkedIncidents: number
  createdBy: string
  createdByName: string | null
  tenantName: string
  lastFiredAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CorrelationStats {
  correlationRules: number
  sigmaRules: number
  fired24h: number
  linkedToIncidents: number
}

export interface CorrelationSearchParams {
  page?: number
  limit?: number
  source?: string
  severity?: string
  status?: string
  query?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export interface CorrelationKpiCardsProps {
  stats: CorrelationStats | null
}

export interface CorrelationFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  activeTab: string
  onTabChange: (tab: string) => void
  severityFilter: string
  onSeverityChange: (value: string) => void
  statusFilter: string
  onStatusChange: (value: string) => void
}

export interface CorrelationCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CorrelationCreateFormValues) => void
  loading?: boolean
}

export interface CorrelationCreateFormValues {
  title: string
  description: string
  source: RuleSource
  severity: RuleSeverity
  status: RuleStatus
  mitreTechniques: string
  yamlContent: string
  conditions: string
}

export interface CorrelationEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CorrelationEditFormValues) => void
  rule: CorrelationRule | null
  loading?: boolean
}

export interface CorrelationEditFormValues {
  title: string
  description: string
  source: RuleSource
  severity: RuleSeverity
  status: RuleStatus
  mitreTechniques: string
  yamlContent: string
  conditions: string
}

export interface CorrelationDeleteDialogProps {
  rule: CorrelationRule | null
  onConfirm: (id: string) => void
  loading?: boolean
}

export interface CorrelationDetailPanelProps {
  rule: CorrelationRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: ((rule: CorrelationRule) => void) | undefined
  onDelete?: ((rule: CorrelationRule) => void) | undefined
  children?: ReactNode
}

export interface CorrelationColumnTranslations {
  correlation: (key: string) => string
}

export interface UseCorrelationCreateDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CorrelationCreateFormValues) => void
}

export interface UseCorrelationEditDialogParams {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CorrelationEditFormValues) => void
  rule: CorrelationRule | null
}

export interface UseCorrelationDetailPanelParams {
  rule: CorrelationRule | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: ((rule: CorrelationRule) => void) | undefined
  onDelete?: ((rule: CorrelationRule) => void) | undefined
}

export type CorrelationPageDialogsReturn = {
  createDialogOpen: boolean
  setCreateDialogOpen: (open: boolean) => void
  editDialogOpen: boolean
  setEditDialogOpen: (open: boolean) => void
  editingRule: CorrelationRule | null
  setEditingRule: (rule: CorrelationRule | null) => void
  deletingRule: CorrelationRule | null
  setDeletingRule: (rule: CorrelationRule | null) => void
  detailPanelOpen: boolean
  setDetailPanelOpen: (open: boolean) => void
  selectedRuleId: string | null
  setSelectedRuleId: (id: string | null) => void
  handleOpenCreate: () => void
  handleOpenEdit: (rule: CorrelationRule) => void
  handleOpenDelete: (rule: CorrelationRule) => void
  handleRowClick: (rule: CorrelationRule) => void
  findSelectedRule: (rules: CorrelationRule[] | undefined) => CorrelationRule | null
}
