'use client'

import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useIncidentPageCrud } from './useIncidentPageCrud'
import { useIncidentPageDialogs } from './useIncidentPageDialogs'
import { useIncidentPageFilters } from './useIncidentPageFilters'

export function useIncidentsPage() {
  const filters = useIncidentPageFilters()
  const dialogs = useIncidentPageDialogs()
  const crud = useIncidentPageCrud(dialogs)

  const permissions = useAuthStore(s => s.permissions)
  const canDelete = hasPermission(permissions, Permission.INCIDENTS_DELETE)
  const canCreate = hasPermission(permissions, Permission.INCIDENTS_CREATE)
  const canEdit = hasPermission(permissions, Permission.INCIDENTS_UPDATE)
  const canAddTimeline = hasPermission(permissions, Permission.INCIDENTS_ADD_TIMELINE)
  const canChangeStatus = hasPermission(permissions, Permission.INCIDENTS_CHANGE_STATUS)

  return {
    t: filters.t,
    tCommon: filters.tCommon,
    data: filters.data,
    stats: filters.stats,
    statsLoading: filters.statsLoading,
    columns: filters.columns,
    isLoading: filters.isLoading,
    isFetching: filters.isFetching,
    pagination: filters.pagination,
    searchQuery: filters.searchQuery,
    statusFilter: filters.statusFilter,
    severityFilter: filters.severityFilter,
    categoryFilter: filters.categoryFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    assigneeOptions: filters.assigneeOptions,
    handleSearchChange: filters.handleSearchChange,
    handleStatusChange: filters.handleStatusChange,
    handleSeverityChange: filters.handleSeverityChange,
    handleCategoryChange: filters.handleCategoryChange,
    handleClearAllFilters: filters.handleClearAllFilters,
    handleSort: filters.handleSort,
    createDialogOpen: dialogs.createDialogOpen,
    setCreateDialogOpen: dialogs.setCreateDialogOpen,
    editDialogOpen: dialogs.editDialogOpen,
    setEditDialogOpen: dialogs.setEditDialogOpen,
    detailPanelOpen: dialogs.detailPanelOpen,
    setDetailPanelOpen: dialogs.setDetailPanelOpen,
    editingIncident: dialogs.editingIncident,
    detailIncident: dialogs.detailIncident,
    setDetailIncident: dialogs.setDetailIncident,
    editInitialValues: dialogs.editInitialValues,
    handleRowClick: dialogs.handleRowClick,
    handleOpenEdit: dialogs.handleOpenEdit,
    handleCreate: crud.handleCreate,
    handleEdit: crud.handleEdit,
    handleChangeStatus: crud.handleChangeStatus,
    handleDelete: crud.handleDelete,
    handleCopyId: crud.handleCopyId,
    createLoading: crud.createLoading,
    editLoading: crud.editLoading,
    changeStatusLoading: crud.changeStatusLoading,
    deleteLoading: crud.deleteLoading,
    canDelete,
    canCreate,
    canEdit,
    canAddTimeline,
    canChangeStatus,
  }
}
