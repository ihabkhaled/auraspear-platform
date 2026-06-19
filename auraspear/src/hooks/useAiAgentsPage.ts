'use client'

import { useMemo } from 'react'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useAiAgentsPageCrud } from './useAiAgentsPageCrud'
import { useAiAgentsPageDialogs } from './useAiAgentsPageDialogs'
import { useAiAgentsPageFilters } from './useAiAgentsPageFilters'

export function useAiAgentsPage() {
  const permissions = useAuthStore(s => s.permissions)
  const filters = useAiAgentsPageFilters()
  const dialogs = useAiAgentsPageDialogs()
  const crud = useAiAgentsPageCrud(dialogs)

  const canCreate = hasPermission(permissions, Permission.AI_AGENTS_CREATE)
  const canEdit = hasPermission(permissions, Permission.AI_AGENTS_UPDATE)
  const canDelete = hasPermission(permissions, Permission.AI_AGENTS_DELETE)

  const selectedAgent = useMemo(
    () => dialogs.findSelectedAgent(filters.data?.data),
    [dialogs, filters.data]
  )

  return {
    t: filters.t,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    statusFilter: filters.statusFilter,
    setStatusFilter: filters.setStatusFilter,
    tierFilter: filters.tierFilter,
    setTierFilter: filters.setTierFilter,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    handleSort: filters.handleSort,
    isFetching: filters.isFetching,
    data: filters.data,
    stats: filters.stats,
    pagination: filters.pagination,
    columns: filters.columns,
    selectedAgent,
    selectedAgentId: dialogs.selectedAgentId,
    setSelectedAgentId: dialogs.setSelectedAgentId,
    handleRowClick: dialogs.handleRowClick,
    createDialogOpen: dialogs.createDialogOpen,
    setCreateDialogOpen: dialogs.setCreateDialogOpen,
    handleCreateSubmit: crud.handleCreateSubmit,
    isCreating: crud.isCreating,
    editDialogOpen: dialogs.editDialogOpen,
    setEditDialogOpen: dialogs.setEditDialogOpen,
    editAgent: dialogs.editAgent,
    editInitialValues: dialogs.editInitialValues,
    handleEditOpen: dialogs.handleEditOpen,
    handleEditSubmit: crud.handleEditSubmit,
    isUpdating: crud.isUpdating,
    handleDeleteConfirm: crud.handleDeleteConfirm,
    isDeleting: crud.isDeleting,
    handleCloseDetail: dialogs.handleCloseDetail,
    canCreate,
    canEdit,
    canDelete,
  }
}
