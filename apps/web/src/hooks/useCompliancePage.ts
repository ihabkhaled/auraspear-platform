'use client'

import { useCompliancePageCrud } from './useCompliancePageCrud'
import { useCompliancePageDialogs } from './useCompliancePageDialogs'
import { useCompliancePageFilters } from './useCompliancePageFilters'

export function useCompliancePage() {
  const filters = useCompliancePageFilters()
  const dialogs = useCompliancePageDialogs()
  const crud = useCompliancePageCrud(dialogs)

  return {
    t: filters.t,
    tCommon: filters.tCommon,
    data: filters.data,
    stats: filters.stats,
    columns: filters.columns,
    isLoading: filters.isLoading,
    isFetching: filters.isFetching,
    pagination: filters.pagination,
    searchQuery: filters.searchQuery,
    standardFilter: filters.standardFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSearchChange: filters.handleSearchChange,
    handleStandardChange: filters.handleStandardChange,
    handleSort: filters.handleSort,
    handleRowClick: dialogs.handleRowClick,
    createOpen: dialogs.createOpen,
    setCreateOpen: dialogs.setCreateOpen,
    editOpen: dialogs.editOpen,
    setEditOpen: dialogs.setEditOpen,
    detailOpen: dialogs.detailOpen,
    setDetailOpen: dialogs.setDetailOpen,
    selectedFramework: dialogs.selectedFramework,
    deleteFrameworkId: dialogs.deleteFrameworkId,
    deleteFrameworkName: dialogs.deleteFrameworkName,
    editInitialValues: dialogs.editInitialValues,
    handleCreate: crud.handleCreate,
    handleEdit: crud.handleEdit,
    handleDelete: crud.handleDelete,
    openEditDialog: dialogs.openEditDialog,
    openDeleteDialog: dialogs.openDeleteDialog,
    createLoading: crud.createLoading,
    editLoading: crud.editLoading,
    canCreate: crud.canCreate,
    canEdit: crud.canEdit,
  }
}
