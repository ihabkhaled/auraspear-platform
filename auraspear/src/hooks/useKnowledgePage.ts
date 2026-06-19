'use client'

import { useKnowledgePageCrud } from './useKnowledgePageCrud'
import { useKnowledgePageDialogs } from './useKnowledgePageDialogs'
import { useKnowledgePageFilters } from './useKnowledgePageFilters'

export function useKnowledgePage() {
  const filters = useKnowledgePageFilters()
  const dialogs = useKnowledgePageDialogs()
  const crud = useKnowledgePageCrud(dialogs)

  return {
    t: filters.t,
    tCommon: filters.tCommon,
    tenantId: filters.tenantId,
    data: filters.data,
    columns: filters.columns,
    isLoading: filters.isLoading,
    isFetching: filters.isFetching,
    pagination: filters.pagination,
    currentPage: filters.currentPage,
    searchQuery: filters.searchQuery,
    categoryFilter: filters.categoryFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSearchChange: filters.handleSearchChange,
    handleCategoryChange: filters.handleCategoryChange,
    handleSort: filters.handleSort,
    handlePageChange: filters.handlePageChange,
    handleRowClick: dialogs.handleRowClick,
    createOpen: dialogs.createOpen,
    setCreateOpen: dialogs.setCreateOpen,
    editOpen: dialogs.editOpen,
    setEditOpen: dialogs.setEditOpen,
    selectedRunbook: dialogs.selectedRunbook,
    detailRunbook: dialogs.detailRunbook,
    setDetailRunbook: dialogs.setDetailRunbook,
    handleCreate: crud.handleCreate,
    handleEdit: crud.handleEdit,
    handleDelete: crud.handleDelete,
    openEditDialog: dialogs.openEditDialog,
    createLoading: crud.createLoading,
    editLoading: crud.editLoading,
    canCreate: crud.canCreate,
    canEdit: crud.canEdit,
    canDelete: crud.canDelete,
    aiGenerate: crud.aiGenerate,
    aiSearch: crud.aiSearch,
  }
}
