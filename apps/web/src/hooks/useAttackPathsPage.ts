'use client'

import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useAttackPathsPageCrud } from './useAttackPathsPageCrud'
import { useAttackPathsPageDialogs } from './useAttackPathsPageDialogs'
import { useAttackPathsPageFilters } from './useAttackPathsPageFilters'

export function useAttackPathsPage() {
  const filters = useAttackPathsPageFilters()
  const dialogs = useAttackPathsPageDialogs()
  const crud = useAttackPathsPageCrud(dialogs)

  const permissions = useAuthStore(s => s.permissions)
  const canCreate = hasPermission(permissions, Permission.ATTACK_PATHS_CREATE)
  const canEdit = hasPermission(permissions, Permission.ATTACK_PATHS_UPDATE)
  const canDelete = hasPermission(permissions, Permission.ATTACK_PATHS_DELETE)

  return {
    t: filters.t,
    tCommon: filters.tCommon,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    severityFilter: filters.severityFilter,
    setSeverityFilter: filters.setSeverityFilter,
    statusFilter: filters.statusFilter,
    setStatusFilter: filters.setStatusFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSort: filters.handleSort,
    isFetching: filters.isFetching,
    data: filters.data,
    stats: filters.stats,
    pagination: filters.pagination,
    columns: filters.columns,
    selectedPathId: dialogs.selectedPathId,
    handleRowClick: dialogs.handleRowClick,
    handleCloseDetail: dialogs.handleCloseDetail,
    createDialogOpen: dialogs.createDialogOpen,
    setCreateDialogOpen: dialogs.setCreateDialogOpen,
    handleCreate: crud.handleCreate,
    createLoading: crud.createLoading,
    editDialogOpen: dialogs.editDialogOpen,
    setEditDialogOpen: dialogs.setEditDialogOpen,
    editingPath: dialogs.editingPath,
    editInitialValues: dialogs.editInitialValues,
    handleOpenEdit: dialogs.handleOpenEdit,
    handleEdit: crud.handleEdit,
    editLoading: crud.editLoading,
    handleDelete: crud.handleDelete,
    canCreate,
    canEdit,
    canDelete,
  }
}
