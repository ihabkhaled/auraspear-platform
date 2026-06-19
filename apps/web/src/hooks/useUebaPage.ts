'use client'

import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useUebaPageCrud } from './useUebaPageCrud'
import { useUebaPageDialogs } from './useUebaPageDialogs'
import { useUebaPageFilters } from './useUebaPageFilters'

export function useUebaPage() {
  const permissions = useAuthStore(s => s.permissions)
  const filters = useUebaPageFilters()
  const dialogs = useUebaPageDialogs()
  const crud = useUebaPageCrud(dialogs)

  const canCreate = hasPermission(permissions, Permission.UEBA_CREATE)
  const canEdit = hasPermission(permissions, Permission.UEBA_UPDATE)

  return {
    t: filters.t,
    tCommon: filters.tCommon,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    entityTypeFilter: filters.entityTypeFilter,
    setEntityTypeFilter: filters.setEntityTypeFilter,
    riskLevelFilter: filters.riskLevelFilter,
    setRiskLevelFilter: filters.setRiskLevelFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSort: filters.handleSort,
    isFetching: filters.isFetching,
    data: filters.data,
    stats: filters.stats,
    pagination: filters.pagination,
    columns: filters.columns,
    selectedEntityId: dialogs.selectedEntityId,
    handleRowClick: dialogs.handleRowClick,
    handleCloseDetailPanel: dialogs.handleCloseDetailPanel,
    createDialogOpen: dialogs.createDialogOpen,
    setCreateDialogOpen: dialogs.setCreateDialogOpen,
    handleCreateSubmit: crud.handleCreateSubmit,
    createLoading: crud.createLoading,
    editDialogOpen: dialogs.editDialogOpen,
    setEditDialogOpen: dialogs.setEditDialogOpen,
    handleEditOpen: dialogs.handleEditOpen,
    handleEditSubmit: crud.handleEditSubmit,
    editLoading: crud.editLoading,
    editingEntity: dialogs.editingEntity,
    editInitialValues: dialogs.editInitialValues,
    handleDeleteEntity: crud.handleDeleteEntity,
    deleteLoading: crud.deleteLoading,
    canCreate,
    canEdit,
  }
}
