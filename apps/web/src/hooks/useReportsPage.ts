'use client'

import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useAiReport } from './useAiReport'
import { useReportTemplates } from './useReports'
import { useReportsPageCrud } from './useReportsPageCrud'
import { useReportsPageDialogs } from './useReportsPageDialogs'
import { useReportsPageFilters } from './useReportsPageFilters'

export function useReportsPage() {
  const filters = useReportsPageFilters()
  const dialogs = useReportsPageDialogs()
  const crud = useReportsPageCrud(dialogs)
  const templates = useReportTemplates()
  const aiReport = useAiReport()

  const permissions = useAuthStore(s => s.permissions)
  const canManageReports = hasPermission(permissions, Permission.REPORTS_CREATE)
  const canDeleteReport = hasPermission(permissions, Permission.REPORTS_DELETE)

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
    typeFilter: filters.typeFilter,
    formatFilter: filters.formatFilter,
    statusFilter: filters.statusFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSearchChange: filters.handleSearchChange,
    handleTypeChange: filters.handleTypeChange,
    handleFormatChange: filters.handleFormatChange,
    handleStatusChange: filters.handleStatusChange,
    handleSort: filters.handleSort,
    handleRowClick: dialogs.handleRowClick,
    createOpen: dialogs.createOpen,
    setCreateOpen: dialogs.setCreateOpen,
    editOpen: dialogs.editOpen,
    setEditOpen: dialogs.setEditOpen,
    detailOpen: dialogs.detailOpen,
    setDetailOpen: dialogs.setDetailOpen,
    selectedReport: dialogs.selectedReport,
    deleteReportId: dialogs.deleteReportId,
    deleteReportName: dialogs.deleteReportName,
    editInitialValues: dialogs.editInitialValues,
    handleCreate: crud.handleCreate,
    handleEdit: crud.handleEdit,
    handleDelete: crud.handleDelete,
    openEditDialog: dialogs.openEditDialog,
    openDeleteDialog: dialogs.openDeleteDialog,
    createLoading: crud.createLoading,
    editLoading: crud.editLoading,
    templates: templates.data?.data ?? [],
    templatesLoading: templates.isLoading,
    handleGenerateFromTemplate: crud.handleGenerateFromTemplate,
    generatingTemplateKey: crud.generatingTemplateKey,
    canManageReports,
    canDeleteReport,
    aiReport: aiReport.report,
    aiReportTimeRange: aiReport.selectedTimeRange,
    aiReportLoading: aiReport.isLoading,
    handleAiTimeRangeChange: aiReport.handleTimeRangeChange,
    handleGenerateAiReport: aiReport.generateReport,
    aiReportTCommon: aiReport.tCommon,
  }
}
