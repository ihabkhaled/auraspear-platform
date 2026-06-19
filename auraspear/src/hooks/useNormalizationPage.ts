'use client'

import { useNormalizationPageCrud } from './useNormalizationPageCrud'
import { useNormalizationPageDialogs } from './useNormalizationPageDialogs'
import { useNormalizationPageFilters } from './useNormalizationPageFilters'

export function useNormalizationPage() {
  const filters = useNormalizationPageFilters()
  const dialogs = useNormalizationPageDialogs()
  const crud = useNormalizationPageCrud(dialogs)

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
    sourceTypeFilter: filters.sourceTypeFilter,
    statusFilter: filters.statusFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    createOpen: dialogs.createOpen,
    setCreateOpen: dialogs.setCreateOpen,
    editOpen: dialogs.editOpen,
    setEditOpen: dialogs.setEditOpen,
    detailOpen: dialogs.detailOpen,
    setDetailOpen: dialogs.setDetailOpen,
    selectedPipeline: dialogs.selectedPipeline,
    createLoading: crud.createLoading,
    editInitialValues: dialogs.editInitialValues,
    editLoading: crud.editLoading,
    deleteLoading: crud.deleteLoading,
    handleSearchChange: filters.handleSearchChange,
    handleSourceTypeChange: filters.handleSourceTypeChange,
    handleStatusChange: filters.handleStatusChange,
    handleSort: filters.handleSort,
    handleCreate: crud.handleCreate,
    handleEdit: crud.handleEdit,
    handleDelete: crud.handleDelete,
    handleRowClick: dialogs.handleRowClick,
    handleOpenEdit: dialogs.handleOpenEdit,
    handleOpenDelete: crud.handleOpenDelete,
    canCreate: crud.canCreate,
    canEdit: crud.canEdit,
    canDelete: crud.canDelete,
    canAiVerify: crud.canAiVerify,
    handleAiVerify: crud.handleAiVerify,
    aiVerifying: crud.aiVerifying,
  }
}
