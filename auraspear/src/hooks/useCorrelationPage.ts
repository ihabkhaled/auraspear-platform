import { useMemo } from 'react'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useCorrelationPageCrud } from './useCorrelationPageCrud'
import { useCorrelationPageDialogs } from './useCorrelationPageDialogs'
import { useCorrelationPageFilters } from './useCorrelationPageFilters'

export function useCorrelationPage() {
  const filters = useCorrelationPageFilters()
  const dialogs = useCorrelationPageDialogs()
  const crud = useCorrelationPageCrud(dialogs)

  const selectedRule = useMemo(
    () => dialogs.findSelectedRule(filters.data?.data),
    [dialogs, filters.data]
  )

  const permissions = useAuthStore(s => s.permissions)
  const canCreate = hasPermission(permissions, Permission.CORRELATION_CREATE)
  const canEdit = hasPermission(permissions, Permission.CORRELATION_UPDATE)
  const canDelete = hasPermission(permissions, Permission.CORRELATION_DELETE)

  return {
    t: filters.t,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    activeTab: filters.activeTab,
    setActiveTab: filters.setActiveTab,
    severityFilter: filters.severityFilter,
    setSeverityFilter: filters.setSeverityFilter,
    statusFilter: filters.statusFilter,
    setStatusFilter: filters.setStatusFilter,
    selectedRule,
    setSelectedRuleId: dialogs.setSelectedRuleId,
    isFetching: filters.isFetching,
    data: filters.data,
    stats: filters.stats,
    pagination: filters.pagination,
    columns: filters.columns,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSort: filters.handleSort,
    handleRowClick: dialogs.handleRowClick,
    createDialogOpen: dialogs.createDialogOpen,
    setCreateDialogOpen: dialogs.setCreateDialogOpen,
    editDialogOpen: dialogs.editDialogOpen,
    setEditDialogOpen: dialogs.setEditDialogOpen,
    editingRule: dialogs.editingRule,
    deletingRule: dialogs.deletingRule,
    detailPanelOpen: dialogs.detailPanelOpen,
    setDetailPanelOpen: dialogs.setDetailPanelOpen,
    handleCreateSubmit: crud.handleCreateSubmit,
    handleEditSubmit: crud.handleEditSubmit,
    handleDeleteConfirm: crud.handleDeleteConfirm,
    handleOpenCreate: dialogs.handleOpenCreate,
    handleOpenEdit: dialogs.handleOpenEdit,
    handleOpenDelete: dialogs.handleOpenDelete,
    isCreating: crud.isCreating,
    isUpdating: crud.isUpdating,
    isDeleting: crud.isDeleting,
    canCreate,
    canEdit,
    canDelete,
  }
}
