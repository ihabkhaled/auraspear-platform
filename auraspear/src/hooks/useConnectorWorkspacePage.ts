'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Toast, SweetAlertDialog, SweetAlertIcon } from '@/components/common'
import { type ConnectorType, Permission, WorkspaceTab } from '@/enums'
import {
  isConnectorType,
  CONNECTOR_ICONS,
  CONNECTOR_META,
} from '@/lib/constants/connectors.constants'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { lookup } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import type { CreateConnectorInput, WorkspaceSearchRequest } from '@/types'
import {
  useConnector,
  useTestConnector,
  useDeleteConnector,
  useCreateConnector,
  useSyncConnector,
} from './useConnectors'
import {
  useWorkspaceOverview,
  useWorkspaceRecentActivity,
  useWorkspaceEntities,
  useWorkspaceSearch,
  useWorkspaceAction,
} from './useConnectorWorkspace'

export function useConnectorWorkspacePage(rawType: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('connectors')
  const tWorkspace = useTranslations('connectors.workspace')
  const tErrors = useTranslations('errors')
  const [testing, setTesting] = useState(false)

  const isCreateMode = searchParams.get('create') === 'true'
  const initialTab = (searchParams.get('tab') ?? WorkspaceTab.OVERVIEW) as WorkspaceTab
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab)

  // Pagination state
  const [activityPage, setActivityPage] = useState(1)
  const [entitiesPage, setEntitiesPage] = useState(1)

  const permissions = useAuthStore(s => s.permissions)
  const isEditor = hasPermission(permissions, Permission.CONNECTORS_UPDATE)
  const isAdmin = hasPermission(permissions, Permission.CONNECTORS_DELETE)

  const isValidType = isConnectorType(rawType)
  const validType = isValidType ? (rawType as ConnectorType) : undefined
  const meta = validType ? lookup(CONNECTOR_META, validType) : undefined
  const Icon = validType ? lookup(CONNECTOR_ICONS, validType) : undefined

  // Connector config data
  const { data: connector, isLoading: connectorLoading } = useConnector(rawType, !isCreateMode)
  const testMutation = useTestConnector()
  const deleteMutation = useDeleteConnector()
  const createMutation = useCreateConnector()
  const syncMutation = useSyncConnector()

  // Workspace data (only if connector exists & not in create mode)
  const workspaceEnabled = isValidType && !isCreateMode && Boolean(connector?.enabled)

  const { data: overview, isFetching: overviewFetching } = useWorkspaceOverview(
    rawType,
    workspaceEnabled && activeTab === WorkspaceTab.OVERVIEW
  )

  const { data: recentActivity, isFetching: activityFetching } = useWorkspaceRecentActivity(
    rawType,
    activityPage,
    20,
    workspaceEnabled && activeTab === WorkspaceTab.DATA
  )

  const { data: entities, isFetching: entitiesFetching } = useWorkspaceEntities(
    rawType,
    entitiesPage,
    20,
    workspaceEnabled && activeTab === WorkspaceTab.DATA
  )

  const searchMutation = useWorkspaceSearch(rawType)
  const actionMutation = useWorkspaceAction(rawType)

  const handleTest = useCallback(() => {
    if (!isValidType || !meta) return
    setTesting(true)
    Toast.info(t('testingConnector', { name: meta.label }))
    testMutation.mutate(rawType, {
      onSuccess: result => {
        if (result.ok) {
          Toast.success(`${meta.label} ${t('connectedSuccessfully')}`)
        } else {
          Toast.error(result.details ?? t('connectionFailed'))
        }
      },
      onError: buildErrorToastHandler(tErrors),
      onSettled: () => {
        setTesting(false)
      },
    })
  }, [isValidType, meta, rawType, testMutation, t, tErrors])

  const handleDelete = useCallback(async () => {
    if (!isValidType || !meta) return
    const confirmed = await SweetAlertDialog.show({
      text: t('confirmDelete'),
      icon: SweetAlertIcon.QUESTION,
    })
    if (!confirmed) return

    deleteMutation.mutate(rawType, {
      onSuccess: () => {
        Toast.success(`${meta.label} ${t('deleted')}`)
        router.push('/connectors')
      },
      onError: buildErrorToastHandler(tErrors),
    })
  }, [isValidType, meta, rawType, deleteMutation, t, tErrors, router])

  const handleCreate = useCallback(
    (data: CreateConnectorInput) => {
      createMutation.mutate(data, {
        onSuccess: () => {
          Toast.success(t('connectorCreated'))
          router.push('/connectors')
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [createMutation, t, tErrors, router]
  )

  const handleSearch = useCallback(
    (request: WorkspaceSearchRequest) => {
      searchMutation.mutate(request, {
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [searchMutation, tErrors]
  )

  const handleSync = useCallback(() => {
    if (!isValidType || !meta) return
    Toast.info(t('syncStarted', { name: meta.label }))
    syncMutation.mutate(rawType, {
      onSuccess: result => {
        if (result.success) {
          Toast.success(result.message)
        } else {
          Toast.error(result.message)
        }
      },
      onError: buildErrorToastHandler(tErrors),
    })
  }, [isValidType, meta, rawType, syncMutation, t, tErrors])

  const handleAction = useCallback(
    (action: string, params?: Record<string, unknown>) => {
      actionMutation.mutate(
        { action, ...(params ? { params } : {}) },
        {
          onSuccess: result => {
            if (result.success) {
              Toast.success(result.message)
            } else {
              Toast.error(result.message)
            }
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [actionMutation, tErrors]
  )

  return {
    router,
    t,
    tWorkspace,
    isValidType,
    isLoading: isCreateMode ? false : connectorLoading,
    connector,
    type: validType,
    meta,
    Icon,
    isEditor,
    isAdmin,
    testing,
    deletePending: deleteMutation.isPending,
    createPending: createMutation.isPending,
    isCreateMode,

    // Workspace tab state
    activeTab,
    setActiveTab,

    // Workspace data
    overview,
    overviewFetching,
    recentActivity,
    activityFetching,
    entities,
    entitiesFetching,

    // Pagination
    activityPage,
    setActivityPage,
    entitiesPage,
    setEntitiesPage,

    // Search
    searchResults: searchMutation.data,
    searchPending: searchMutation.isPending,
    handleSearch,

    // Actions
    actionPending: actionMutation.isPending,
    handleAction,

    // Config actions
    handleTest,
    handleDelete,
    handleCreate,
    handleSync,
    syncPending: syncMutation.isPending,

    // Workspace enabled
    workspaceEnabled,
  }
}
