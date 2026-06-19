'use client'

import { useCloudSecurityPageCrud } from './useCloudSecurityPageCrud'
import { useCloudSecurityPageDialogs } from './useCloudSecurityPageDialogs'
import { useCloudSecurityPageFilters } from './useCloudSecurityPageFilters'

export function useCloudSecurityPage() {
  const filters = useCloudSecurityPageFilters()
  const dialogs = useCloudSecurityPageDialogs()
  const crud = useCloudSecurityPageCrud(dialogs)

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
    providerFilter: filters.providerFilter,
    statusFilter: filters.statusFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    createOpen: dialogs.createOpen,
    setCreateOpen: dialogs.setCreateOpen,
    editOpen: dialogs.editOpen,
    setEditOpen: dialogs.setEditOpen,
    detailOpen: dialogs.detailOpen,
    setDetailOpen: dialogs.setDetailOpen,
    selectedAccount: dialogs.selectedAccount,
    accountFindings: dialogs.accountFindings,
    createLoading: crud.createLoading,
    editLoading: crud.editLoading,
    deleteLoading: crud.deleteLoading,
    handleSearchChange: filters.handleSearchChange,
    handleProviderChange: filters.handleProviderChange,
    handleStatusChange: filters.handleStatusChange,
    handleSort: filters.handleSort,
    handleCreate: crud.handleCreate,
    handleEdit: crud.handleEdit,
    handleDelete: crud.handleDelete,
    handleRowClick: dialogs.handleRowClick,
    handleOpenEdit: dialogs.handleOpenEdit,
    canCreate: crud.canCreate,
    canEdit: crud.canEdit,
    canDelete: crud.canDelete,
  }
}
