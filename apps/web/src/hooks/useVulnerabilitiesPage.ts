'use client'

import { useVulnerabilitiesPageDialogs } from './useVulnerabilitiesPageDialogs'
import { useVulnerabilitiesPageFilters } from './useVulnerabilitiesPageFilters'

export function useVulnerabilitiesPage() {
  const filters = useVulnerabilitiesPageFilters()
  const dialogs = useVulnerabilitiesPageDialogs()

  return {
    t: filters.t,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    severityFilter: filters.severityFilter,
    setSeverityFilter: filters.setSeverityFilter,
    patchStatusFilter: filters.patchStatusFilter,
    setPatchStatusFilter: filters.setPatchStatusFilter,
    exploitFilter: filters.exploitFilter,
    setExploitFilter: filters.setExploitFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSort: filters.handleSort,
    isFetching: filters.isFetching,
    data: filters.data,
    stats: filters.stats,
    pagination: filters.pagination,
    columns: filters.columns,
    createOpen: dialogs.createOpen,
    setCreateOpen: dialogs.setCreateOpen,
    editOpen: dialogs.editOpen,
    setEditOpen: dialogs.setEditOpen,
    detailOpen: dialogs.detailOpen,
    setDetailOpen: dialogs.setDetailOpen,
    bulkImportOpen: dialogs.bulkImportOpen,
    setBulkImportOpen: dialogs.setBulkImportOpen,
    selectedVulnerability: dialogs.selectedVulnerability,
    isDeleting: dialogs.isDeleting,
    handleRowClick: dialogs.handleRowClick,
    handleEditFromDetail: dialogs.handleEditFromDetail,
    handleDeleteFromDetail: dialogs.handleDeleteFromDetail,
    handleOpenCreate: dialogs.handleOpenCreate,
    handleOpenBulkImport: dialogs.handleOpenBulkImport,
    canCreate: filters.canCreate,
    canEdit: filters.canEdit,
    canDelete: filters.canDelete,
  }
}
