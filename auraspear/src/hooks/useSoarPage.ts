'use client'

import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useAiSoar } from './useAiSoar'
import { useSoarPageCrud } from './useSoarPageCrud'
import { useSoarPageDialogs } from './useSoarPageDialogs'
import { useSoarPageFilters } from './useSoarPageFilters'

export function useSoarPage() {
  const filters = useSoarPageFilters()
  const dialogs = useSoarPageDialogs()
  const crud = useSoarPageCrud(dialogs)
  const aiSoar = useAiSoar()

  const permissions = useAuthStore(s => s.permissions)
  const canCreate = hasPermission(permissions, Permission.SOAR_CREATE)
  const canEdit = hasPermission(permissions, Permission.SOAR_UPDATE)
  const canDelete = hasPermission(permissions, Permission.SOAR_DELETE)
  const canExecute = hasPermission(permissions, Permission.SOAR_EXECUTE)

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
    statusFilter: filters.statusFilter,
    triggerFilter: filters.triggerFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSearchChange: filters.handleSearchChange,
    handleStatusChange: filters.handleStatusChange,
    handleTriggerChange: filters.handleTriggerChange,
    handleSort: filters.handleSort,
    handleRowClick: dialogs.handleRowClick,
    createOpen: dialogs.createOpen,
    setCreateOpen: dialogs.setCreateOpen,
    editOpen: dialogs.editOpen,
    setEditOpen: dialogs.setEditOpen,
    detailOpen: dialogs.detailOpen,
    setDetailOpen: dialogs.setDetailOpen,
    selectedPlaybook: dialogs.selectedPlaybook,
    deletePlaybookId: dialogs.deletePlaybookId,
    deletePlaybookName: dialogs.deletePlaybookName,
    runPlaybookId: dialogs.runPlaybookId,
    runPlaybookName: dialogs.runPlaybookName,
    editInitialValues: dialogs.editInitialValues,
    handleCreate: crud.handleCreate,
    handleEdit: crud.handleEdit,
    handleDelete: crud.handleDelete,
    handleExecute: crud.handleExecute,
    openEditDialog: dialogs.openEditDialog,
    openDeleteDialog: dialogs.openDeleteDialog,
    openRunDialog: dialogs.openRunDialog,
    createLoading: crud.createLoading,
    editLoading: crud.editLoading,
    canCreate,
    canEdit,
    canDelete,
    canExecute,
    aiSoar,
  }
}
