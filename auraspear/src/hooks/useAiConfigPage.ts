'use client'

import { useCallback, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { SweetAlertDialog, SweetAlertIcon, Toast } from '@/components/common'
import { ApprovalStatus, Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { agentConfigService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type {
  AiAgentSchedule,
  AiFeatureConfig,
  AiPromptTemplate,
  CreateAiPromptInput,
  CreateOsintSourceInput,
  OsintSourceConfig,
  ResolveApprovalInput,
  TenantAgentConfig,
  UpdateAgentConfigInput,
  UpdateAiFeatureConfigInput,
  UpdateAiPromptInput,
  UpdateOsintSourceInput,
  UpdateScheduleInput,
} from '@/types'
import { useAgentConfigs, useToggleAgent, useUpdateAgentConfig } from './useAgentConfig'
import { useAiApprovals, useResolveApproval } from './useAiApprovals'
import { useAiFeatures, useToggleAiFeature, useUpdateAiFeature } from './useAiFeatures'
import {
  useAiPrompts,
  useActivateAiPrompt,
  useCreateAiPrompt,
  useDeleteAiPrompt,
  useUpdateAiPrompt,
} from './useAiPrompts'
import {
  useAiSchedules,
  usePauseSchedule,
  useResetSchedule,
  useRunScheduleNow,
  useToggleSchedule,
  useUpdateSchedule,
} from './useAiSchedules'
import { useAvailableAiConnectors } from './useAvailableAiConnectors'
import { useOrchestratorStats } from './useOrchestratorStats'
import {
  useCreateOsintSource,
  useDeleteOsintSource,
  useOsintSources,
  useTestOsintSource,
  useUpdateOsintSource,
} from './useOsintSources'

export function useAiConfigPage() {
  const t = useTranslations('aiConfig')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)

  // Permissions
  const canView = hasPermission(permissions, Permission.AI_CONFIG_VIEW)
  const canEdit = hasPermission(permissions, Permission.AI_CONFIG_EDIT)
  const canManageOsint = hasPermission(permissions, Permission.AI_CONFIG_MANAGE_OSINT)
  const canManageApprovals = hasPermission(permissions, Permission.AI_APPROVALS_MANAGE)
  const canManagePrompts = hasPermission(permissions, Permission.AI_CONFIG_MANAGE_PROMPTS)

  // Tab state — persisted in URL so refresh keeps the active tab
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeTab = searchParams.get('tab') ?? 'agents'
  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      router.replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, router, pathname]
  )

  // Dialog states — store agentId, not full config (avoids stale data after toggle/save)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [osintDialogOpen, setOsintDialogOpen] = useState(false)
  const [selectedOsintSource, setSelectedOsintSource] = useState<OsintSourceConfig | null>(null)
  const [approvalFilter, setApprovalFilter] = useState<string>(ApprovalStatus.PENDING)

  // Prompt dialog state
  const [promptDialogOpen, setPromptDialogOpen] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState<AiPromptTemplate | null>(null)

  // Feature dialog state
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false)
  const [selectedFeature, setSelectedFeature] = useState<AiFeatureConfig | null>(null)

  // Schedule dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<AiAgentSchedule | null>(null)

  // Orchestrator stats
  const { stats: orchestratorStats, isFetching: orchestratorStatsFetching } = useOrchestratorStats()

  // Queries — only fetch data for the active tab
  const { availableConnectors } = useAvailableAiConnectors()
  const agentConfigsQuery = useAgentConfigs()
  const osintSourcesQuery = useOsintSources(activeTab === 'osint')
  const isApprovalsTab = activeTab === 'approvals'
  const resolvedApprovalFilter =
    isApprovalsTab && approvalFilter !== 'all' ? approvalFilter : undefined
  const approvalsQuery = useAiApprovals(resolvedApprovalFilter, isApprovalsTab)
  const promptsQuery = useAiPrompts(activeTab === 'prompts')
  const featuresQuery = useAiFeatures(activeTab === 'features')
  const schedulesQuery = useAiSchedules(activeTab === 'schedules')

  // Mutations
  const updateConfigMutation = useUpdateAgentConfig()
  const toggleAgentMutation = useToggleAgent()
  const createOsintMutation = useCreateOsintSource()
  const updateOsintMutation = useUpdateOsintSource()
  const deleteOsintMutation = useDeleteOsintSource()
  const testOsintMutation = useTestOsintSource()
  const resolveApprovalMutation = useResolveApproval()
  const createPromptMutation = useCreateAiPrompt()
  const updatePromptMutation = useUpdateAiPrompt()
  const activatePromptMutation = useActivateAiPrompt()
  const deletePromptMutation = useDeleteAiPrompt()
  const updateFeatureMutation = useUpdateAiFeature()
  const toggleFeatureMutation = useToggleAiFeature()
  const toggleScheduleMutation = useToggleSchedule()
  const pauseScheduleMutation = usePauseSchedule()
  const runScheduleNowMutation = useRunScheduleNow()
  const updateScheduleMutation = useUpdateSchedule()
  const resetScheduleMutation = useResetSchedule()

  // Derive selectedConfig from latest query data (always fresh after toggle/save)
  const agentConfigs: TenantAgentConfig[] = agentConfigsQuery.data?.data ?? []
  const selectedConfig = selectedAgentId
    ? (agentConfigs.find(c => c.agentId === selectedAgentId) ?? null)
    : null

  // Agent handlers
  const handleEditAgent = useCallback((config: TenantAgentConfig) => {
    setSelectedAgentId(config.agentId)
    setEditDialogOpen(true)
  }, [])

  const handleUpdateAgent = useCallback(
    (agentId: string, data: UpdateAgentConfigInput) => {
      updateConfigMutation.mutate(
        { agentId, data },
        {
          onSuccess: () => {
            Toast.success(t('configUpdated'))
            setEditDialogOpen(false)
            setSelectedAgentId(null)
          },
          onError: error => {
            buildErrorToastHandler(tErrors)(error)
          },
        }
      )
    },
    [updateConfigMutation, t, tErrors]
  )

  const handleToggleAgent = useCallback(
    (agentId: string, enabled: boolean) => {
      toggleAgentMutation.mutate(
        { agentId, enabled },
        {
          onSuccess: () => {
            Toast.success(enabled ? t('agentEnabled') : t('agentDisabled'))
          },
          onError: error => {
            buildErrorToastHandler(tErrors)(error)
          },
        }
      )
    },
    [toggleAgentMutation, t, tErrors]
  )

  // OSINT handlers
  const handleOpenOsintCreate = useCallback(() => {
    setSelectedOsintSource(null)
    setOsintDialogOpen(true)
  }, [])

  const handleEditOsint = useCallback((source: OsintSourceConfig) => {
    setSelectedOsintSource(source)
    setOsintDialogOpen(true)
  }, [])

  const handleOsintSubmit = useCallback(
    (data: CreateOsintSourceInput | UpdateOsintSourceInput) => {
      if (selectedOsintSource) {
        updateOsintMutation.mutate(
          { id: selectedOsintSource.id, data: data as UpdateOsintSourceInput },
          {
            onSuccess: () => {
              Toast.success(t('sourceUpdated'))
              setOsintDialogOpen(false)
              setSelectedOsintSource(null)
            },
            onError: error => {
              buildErrorToastHandler(tErrors)(error)
            },
          }
        )
      } else {
        createOsintMutation.mutate(data as CreateOsintSourceInput, {
          onSuccess: () => {
            Toast.success(t('sourceCreated'))
            setOsintDialogOpen(false)
          },
          onError: error => {
            buildErrorToastHandler(tErrors)(error)
          },
        })
      }
    },
    [selectedOsintSource, updateOsintMutation, createOsintMutation, t, tErrors]
  )

  const handleDeleteOsint = useCallback(
    async (source: OsintSourceConfig) => {
      const confirmed = await SweetAlertDialog.show({
        text: t('deleteConfirm'),
        icon: SweetAlertIcon.QUESTION,
      })
      if (!confirmed) {
        return
      }
      deleteOsintMutation.mutate(source.id, {
        onSuccess: () => {
          Toast.success(t('sourceDeleted'))
        },
        onError: error => {
          buildErrorToastHandler(tErrors)(error)
        },
      })
    },
    [deleteOsintMutation, t, tErrors]
  )

  const handleTestOsint = useCallback(
    (sourceId: string) => {
      testOsintMutation.mutate(sourceId, {
        onSuccess: result => {
          const testData = result?.data as
            | { success?: boolean; messageKey?: string; error?: string }
            | undefined
          if (testData?.success) {
            Toast.success(t('testConnectionSuccess'))
          } else {
            const msgKey = testData?.messageKey?.replace('errors.', '') ?? ''
            const translated = msgKey ? tErrors(msgKey) : testData?.error
            Toast.error(translated ?? t('testConnectionFailed'))
          }
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [testOsintMutation, t, tErrors]
  )

  const handleToggleOsint = useCallback(
    (sourceId: string, enabled: boolean) => {
      updateOsintMutation.mutate(
        { id: sourceId, data: { isEnabled: enabled } },
        {
          onSuccess: () => {
            Toast.success(enabled ? t('sourceEnabled') : t('sourceDisabled'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [updateOsintMutation, t, tErrors]
  )

  // Prompt handlers
  const handleOpenPromptCreate = useCallback(() => {
    setSelectedPrompt(null)
    setPromptDialogOpen(true)
  }, [])

  const handleEditPrompt = useCallback((prompt: AiPromptTemplate) => {
    setSelectedPrompt(prompt)
    setPromptDialogOpen(true)
  }, [])

  const handlePromptSubmit = useCallback(
    (data: CreateAiPromptInput | UpdateAiPromptInput) => {
      if (selectedPrompt) {
        updatePromptMutation.mutate(
          { id: selectedPrompt.id, data: data as UpdateAiPromptInput },
          {
            onSuccess: () => {
              Toast.success(t('promptUpdated'))
              setPromptDialogOpen(false)
              setSelectedPrompt(null)
            },
            onError: buildErrorToastHandler(tErrors),
          }
        )
      } else {
        createPromptMutation.mutate(data as CreateAiPromptInput, {
          onSuccess: () => {
            Toast.success(t('promptCreated'))
            setPromptDialogOpen(false)
          },
          onError: buildErrorToastHandler(tErrors),
        })
      }
    },
    [selectedPrompt, updatePromptMutation, createPromptMutation, t, tErrors]
  )

  const handleActivatePrompt = useCallback(
    (id: string) => {
      activatePromptMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('promptActivated'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [activatePromptMutation, t, tErrors]
  )

  const handleDeletePrompt = useCallback(
    async (prompt: AiPromptTemplate) => {
      const confirmed = await SweetAlertDialog.show({
        text: t('deletePromptConfirm'),
        icon: SweetAlertIcon.QUESTION,
      })
      if (!confirmed) {
        return
      }
      deletePromptMutation.mutate(prompt.id, {
        onSuccess: () => {
          Toast.success(t('promptDeleted'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [deletePromptMutation, t, tErrors]
  )

  // Feature handlers
  const handleEditFeature = useCallback((feature: AiFeatureConfig) => {
    setSelectedFeature(feature)
    setFeatureDialogOpen(true)
  }, [])

  const handleToggleFeature = useCallback(
    (featureKey: string, enabled: boolean) => {
      toggleFeatureMutation.mutate(
        { featureKey, enabled },
        {
          onSuccess: () => {
            Toast.success(enabled ? t('featureToggleEnabled') : t('featureToggleDisabled'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [toggleFeatureMutation, t, tErrors]
  )

  const handleUpdateFeature = useCallback(
    (featureKey: string, data: UpdateAiFeatureConfigInput) => {
      updateFeatureMutation.mutate(
        { featureKey, data },
        {
          onSuccess: () => {
            Toast.success(t('featureUpdated'))
            setFeatureDialogOpen(false)
            setSelectedFeature(null)
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [updateFeatureMutation, t, tErrors]
  )

  // Schedule handlers
  const handleEditSchedule = useCallback((schedule: AiAgentSchedule) => {
    setSelectedSchedule(schedule)
    setScheduleDialogOpen(true)
  }, [])

  const handleUpdateSchedule = useCallback(
    (id: string, data: UpdateScheduleInput) => {
      updateScheduleMutation.mutate(
        { id, data },
        {
          onSuccess: () => {
            Toast.success(t('schedules.updated'))
            setScheduleDialogOpen(false)
            setSelectedSchedule(null)
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [updateScheduleMutation, t, tErrors]
  )

  const handleToggleSchedule = useCallback(
    (id: string, enabled: boolean) => {
      toggleScheduleMutation.mutate(
        { id, enabled },
        {
          onSuccess: () => {
            Toast.success(enabled ? t('schedules.enabled') : t('schedules.disabled'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [toggleScheduleMutation, t, tErrors]
  )

  const handlePauseSchedule = useCallback(
    (id: string, paused: boolean) => {
      pauseScheduleMutation.mutate(
        { id, paused },
        {
          onSuccess: () => {
            Toast.success(paused ? t('schedules.pausedSuccess') : t('schedules.resumedSuccess'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [pauseScheduleMutation, t, tErrors]
  )

  const handleRunScheduleNow = useCallback(
    (id: string) => {
      runScheduleNowMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('schedules.runNowSuccess'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [runScheduleNowMutation, t, tErrors]
  )

  const handleResetSchedule = useCallback(
    async (id: string) => {
      const confirmed = await SweetAlertDialog.show({
        text: t('schedules.resetConfirm'),
        icon: SweetAlertIcon.QUESTION,
      })
      if (!confirmed) {
        return
      }
      resetScheduleMutation.mutate(id, {
        onSuccess: () => {
          Toast.success(t('schedules.resetSuccess'))
        },
        onError: buildErrorToastHandler(tErrors),
      })
    },
    [resetScheduleMutation, t, tErrors]
  )

  // Approval handlers
  const handleResolveApproval = useCallback(
    (id: string, data: ResolveApprovalInput) => {
      resolveApprovalMutation.mutate(
        { id, data },
        {
          onSuccess: () => {
            Toast.success(t('approvalResolved'))
          },
          onError: error => {
            buildErrorToastHandler(tErrors)(error)
          },
        }
      )
    },
    [resolveApprovalMutation, t, tErrors]
  )

  // Bulk toggle handlers
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  const bulkToggleAgentsMutation = useMutation({
    mutationFn: (enabled: boolean) => agentConfigService.bulkToggleAgents(enabled),
    onSuccess: (_data, enabled) => {
      Toast.success(enabled ? t('allAgentsEnabled') : t('allAgentsDisabled'))
      void queryClient.invalidateQueries({ queryKey: ['agent-config', 'agents', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['orchestrator-stats', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const bulkToggleOsintMutation = useMutation({
    mutationFn: (enabled: boolean) => agentConfigService.bulkToggleOsintSources(enabled),
    onSuccess: (_data, enabled) => {
      Toast.success(enabled ? t('allOsintEnabled') : t('allOsintDisabled'))
      void queryClient.invalidateQueries({ queryKey: ['agent-config', 'osint-sources', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const bulkToggleFeaturesMutation = useMutation({
    mutationFn: (enabled: boolean) => agentConfigService.bulkToggleFeatures(enabled),
    onSuccess: (_data, enabled) => {
      Toast.success(enabled ? t('allFeaturesEnabled') : t('allFeaturesDisabled'))
      void queryClient.invalidateQueries({ queryKey: ['ai-features', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const bulkToggleSchedulesMutation = useMutation({
    mutationFn: (enabled: boolean) => agentConfigService.bulkToggleSchedules(enabled),
    onSuccess: (_data, enabled) => {
      Toast.success(enabled ? t('allSchedulesEnabled') : t('allSchedulesDisabled'))
      void queryClient.invalidateQueries({ queryKey: ['ai-schedules', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleBulkToggle = useCallback(
    async (section: string, enabled: boolean) => {
      const confirmKey = enabled ? 'bulkEnableConfirm' : 'bulkDisableConfirm'
      const confirmed = await SweetAlertDialog.show({
        text: t(confirmKey),
        icon: SweetAlertIcon.QUESTION,
      })
      if (!confirmed) return

      switch (section) {
        case 'agents':
          bulkToggleAgentsMutation.mutate(enabled)
          break
        case 'osint':
          bulkToggleOsintMutation.mutate(enabled)
          break
        case 'features':
          bulkToggleFeaturesMutation.mutate(enabled)
          break
        case 'schedules':
          bulkToggleSchedulesMutation.mutate(enabled)
          break
      }
    },
    [
      bulkToggleAgentsMutation,
      bulkToggleOsintMutation,
      bulkToggleFeaturesMutation,
      bulkToggleSchedulesMutation,
      t,
    ]
  )

  return {
    t,
    activeTab,
    setActiveTab,
    canView,
    canEdit,
    canManageOsint,
    canManageApprovals,
    // Orchestrator stats
    orchestratorStats,
    orchestratorStatsFetching,
    // Agent configs
    agentConfigs,
    agentConfigsLoading: agentConfigsQuery.isLoading,
    editDialogOpen,
    setEditDialogOpen,
    selectedConfig,
    handleEditAgent,
    handleUpdateAgent,
    updateConfigLoading: updateConfigMutation.isPending,
    handleToggleAgent,
    availableConnectors,
    // OSINT sources
    osintSources: osintSourcesQuery.data?.data ?? [],
    osintSourcesLoading: osintSourcesQuery.isLoading,
    osintDialogOpen,
    setOsintDialogOpen,
    selectedOsintSource,
    handleOpenOsintCreate,
    handleEditOsint,
    handleOsintSubmit,
    osintSubmitLoading: createOsintMutation.isPending || updateOsintMutation.isPending,
    handleDeleteOsint,
    handleTestOsint,
    handleToggleOsint,
    testOsintLoading: testOsintMutation.isPending,
    // Approvals
    approvals: approvalsQuery.data?.data ?? [],
    approvalsLoading: approvalsQuery.isLoading,
    approvalFilter,
    setApprovalFilter,
    handleResolveApproval,
    resolveApprovalLoading: resolveApprovalMutation.isPending,
    // Prompts
    prompts: (promptsQuery.data?.data ?? []) as AiPromptTemplate[],
    promptsLoading: promptsQuery.isLoading,
    promptDialogOpen,
    setPromptDialogOpen,
    selectedPrompt,
    handleOpenPromptCreate,
    handleEditPrompt,
    handlePromptSubmit,
    promptSubmitLoading: createPromptMutation.isPending || updatePromptMutation.isPending,
    handleActivatePrompt,
    handleDeletePrompt,
    canManagePrompts,
    // Features
    features: (featuresQuery.data?.data ?? []) as AiFeatureConfig[],
    featuresLoading: featuresQuery.isLoading,
    featureDialogOpen,
    setFeatureDialogOpen,
    selectedFeature,
    handleEditFeature,
    handleUpdateFeature,
    featureUpdateLoading: updateFeatureMutation.isPending,
    handleToggleFeature,
    // Schedules
    schedules: (schedulesQuery.data?.data ?? []) as AiAgentSchedule[],
    schedulesLoading: schedulesQuery.isLoading,
    scheduleDialogOpen,
    setScheduleDialogOpen,
    selectedSchedule,
    handleEditSchedule,
    handleUpdateSchedule,
    handleToggleSchedule,
    handlePauseSchedule,
    handleRunScheduleNow,
    handleResetSchedule,
    scheduleUpdateLoading: updateScheduleMutation.isPending,
    // Bulk toggle
    handleBulkToggle,
  }
}
