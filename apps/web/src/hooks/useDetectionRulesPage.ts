'use client'

import { useDetectionRulesPageCrud } from './useDetectionRulesPageCrud'
import { useDetectionRulesPageDialogs } from './useDetectionRulesPageDialogs'
import { useDetectionRulesPageFilters } from './useDetectionRulesPageFilters'

export function useDetectionRulesPage() {
  const filters = useDetectionRulesPageFilters()
  const dialogs = useDetectionRulesPageDialogs()
  const crud = useDetectionRulesPageCrud(dialogs)

  return {
    t: filters.t,
    tCommon: filters.tCommon,
    data: filters.data,
    stats: filters.stats,
    statsLoading: filters.statsLoading,
    columns: filters.columns,
    isFetching: filters.isFetching,
    pagination: filters.pagination,
    searchQuery: filters.searchQuery,
    ruleTypeFilter: filters.ruleTypeFilter,
    severityFilter: filters.severityFilter,
    statusFilter: filters.statusFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    createOpen: dialogs.createOpen,
    setCreateOpen: dialogs.setCreateOpen,
    editOpen: dialogs.editOpen,
    setEditOpen: dialogs.setEditOpen,
    detailOpen: dialogs.detailOpen,
    setDetailOpen: dialogs.setDetailOpen,
    selectedRule: dialogs.selectedRule,
    createLoading: crud.createLoading,
    editLoading: crud.editLoading,
    deleteLoading: crud.deleteLoading,
    handleSearchChange: filters.handleSearchChange,
    handleRuleTypeChange: filters.handleRuleTypeChange,
    handleSeverityChange: filters.handleSeverityChange,
    handleStatusChange: filters.handleStatusChange,
    handleSort: filters.handleSort,
    handleCreate: crud.handleCreate,
    handleEdit: crud.handleEdit,
    handleDelete: crud.handleDelete,
    handleToggle: crud.handleToggle,
    handleOpenDetail: dialogs.handleOpenDetail,
    handleOpenEdit: dialogs.handleOpenEdit,
    canManageRules: crud.canManageRules,
    canEditRule: crud.canEditRule,
    canDeleteRule: crud.canDeleteRule,
    canToggleRule: crud.canToggleRule,
    toggleLoading: crud.toggleLoading,
  }
}
