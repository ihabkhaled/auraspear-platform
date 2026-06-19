'use client'

import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useLlmConnectorsPageCrud } from './useLlmConnectorsPageCrud'
import { useLlmConnectorsPageDialogs } from './useLlmConnectorsPageDialogs'
import { useLlmConnectorsPageFilters } from './useLlmConnectorsPageFilters'

export function useLlmConnectorsPage() {
  const permissions = useAuthStore(s => s.permissions)
  const filters = useLlmConnectorsPageFilters()
  const dialogs = useLlmConnectorsPageDialogs()
  const crud = useLlmConnectorsPageCrud(dialogs)

  const canCreate = hasPermission(permissions, Permission.LLM_CONNECTORS_CREATE)
  const canUpdate = hasPermission(permissions, Permission.LLM_CONNECTORS_UPDATE)
  const canDelete = hasPermission(permissions, Permission.LLM_CONNECTORS_DELETE)
  const canTest = hasPermission(permissions, Permission.LLM_CONNECTORS_TEST)

  return {
    t: filters.t,
    searchQuery: filters.searchQuery,
    setSearchQuery: filters.setSearchQuery,
    isFetching: filters.isFetching,
    data: filters.data,
    columns: filters.columns,
    createDialogOpen: dialogs.createDialogOpen,
    setCreateDialogOpen: dialogs.setCreateDialogOpen,
    editDialogOpen: dialogs.editDialogOpen,
    setEditDialogOpen: dialogs.setEditDialogOpen,
    editInitialValues: dialogs.editInitialValues,
    handleEditOpen: dialogs.handleEditOpen,
    handleCreateSubmit: crud.handleCreateSubmit,
    isCreating: crud.isCreating,
    handleEditSubmit: crud.handleEditSubmit,
    isUpdating: crud.isUpdating,
    handleDeleteConfirm: crud.handleDeleteConfirm,
    handleTestConnector: crud.handleTestConnector,
    handleToggleConnector: crud.handleToggleConnector,
    isTesting: crud.isTesting,
    isToggling: crud.isToggling,
    canCreate,
    canUpdate,
    canDelete,
    canTest,
  }
}
