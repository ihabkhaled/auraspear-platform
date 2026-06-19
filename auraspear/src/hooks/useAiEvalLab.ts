'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { getErrorKey } from '@/lib/api-error'
import { hasPermission } from '@/lib/permissions'
import { AI_CONNECTOR_FALLBACK } from '@/lib/constants/ai-agents'
import { aiEvalService, llmConnectorService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AiEvalRun, AiEvalStats, AiEvalSuite, AvailableAiConnector } from '@/types'

export function useAiEvalLab() {
  const t = useTranslations('aiEval')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()

  const canView = hasPermission(permissions, Permission.AI_EVAL_VIEW)
  const canManage = hasPermission(permissions, Permission.AI_EVAL_MANAGE)

  const [suiteFilter, setSuiteFilter] = useState<string>('')
  const [showCreateSuite, setShowCreateSuite] = useState(false)
  const [newSuiteName, setNewSuiteName] = useState('')
  const [newSuiteDesc, setNewSuiteDesc] = useState('')
  const [showStartRun, setShowStartRun] = useState(false)
  const [runSuiteId, setRunSuiteId] = useState('')
  const [runProvider, setRunProvider] = useState('bedrock')
  const [runModel, setRunModel] = useState('')

  const suitesQuery = useQuery<AiEvalSuite[]>({
    queryKey: ['ai-eval-suites', tenantId],
    queryFn: () => aiEvalService.listSuites(),
    enabled: canView,
    staleTime: 30_000,
  })

  const runsQuery = useQuery<AiEvalRun[]>({
    queryKey: ['ai-eval-runs', tenantId, suiteFilter],
    queryFn: () => aiEvalService.listRuns(suiteFilter || undefined),
    enabled: canView,
    staleTime: 30_000,
  })

  const statsQuery = useQuery<AiEvalStats>({
    queryKey: ['ai-eval-stats', tenantId],
    queryFn: () => aiEvalService.getStats(),
    enabled: canView,
    staleTime: 30_000,
  })

  const connectorsQuery = useQuery<AvailableAiConnector[]>({
    queryKey: ['ai-connectors-available', tenantId],
    queryFn: () => llmConnectorService.getAvailable(),
    staleTime: 15_000,
  })

  const availableConnectors = connectorsQuery.data ?? AI_CONNECTOR_FALLBACK

  const createSuiteMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; datasetJson: unknown }) =>
      aiEvalService.createSuite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-eval-suites', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['ai-eval-stats', tenantId] })
    },
  })

  const deleteSuiteMutation = useMutation({
    mutationFn: (id: string) => aiEvalService.deleteSuite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-eval-suites', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['ai-eval-runs', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['ai-eval-stats', tenantId] })
    },
  })

  const startRunMutation = useMutation({
    mutationFn: (data: { suiteId: string; provider: string; model: string }) =>
      aiEvalService.startRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-eval-runs', tenantId] })
      queryClient.invalidateQueries({ queryKey: ['ai-eval-stats', tenantId] })
    },
  })

  const suites = suitesQuery.data ?? []
  const runs = runsQuery.data ?? []
  const stats = statsQuery.data ?? null

  const getErrorMessage = (error: unknown): string => {
    const key = getErrorKey(error)
    return tErrors(key)
  }

  function handleCreateSuite() {
    if (newSuiteName.trim().length === 0) return
    createSuiteMutation.mutate(
      (() => {
        const payload: { name: string; description?: string; datasetJson: unknown } = {
          name: newSuiteName.trim(),
          datasetJson: [],
        }
        const desc = newSuiteDesc.trim()
        if (desc.length > 0) payload.description = desc
        return payload
      })(),
      {
        onSuccess: () => {
          setNewSuiteName('')
          setNewSuiteDesc('')
          setShowCreateSuite(false)
        },
      }
    )
  }

  function handleStartRun() {
    if (!runSuiteId || !runModel.trim()) return
    startRunMutation.mutate(
      { suiteId: runSuiteId, provider: runProvider, model: runModel.trim() },
      {
        onSuccess: () => {
          setRunSuiteId('')
          setRunModel('')
          setShowStartRun(false)
        },
      }
    )
  }

  return {
    t,
    canView,
    canManage,
    suites,
    runs,
    stats,
    availableConnectors,
    isLoading: suitesQuery.isLoading || runsQuery.isLoading || statsQuery.isLoading,
    isFetching: suitesQuery.isFetching || runsQuery.isFetching,
    suiteFilter,
    setSuiteFilter,
    createSuite: createSuiteMutation.mutateAsync,
    isCreatingSuite: createSuiteMutation.isPending,
    deleteSuite: deleteSuiteMutation.mutateAsync,
    isDeletingSuite: deleteSuiteMutation.isPending,
    startRun: startRunMutation.mutateAsync,
    isStartingRun: startRunMutation.isPending,
    getErrorMessage,
    showCreateSuite,
    setShowCreateSuite,
    newSuiteName,
    setNewSuiteName,
    newSuiteDesc,
    setNewSuiteDesc,
    handleCreateSuite,
    showStartRun,
    setShowStartRun,
    runSuiteId,
    setRunSuiteId,
    runProvider,
    setRunProvider,
    runModel,
    setRunModel,
    handleStartRun,
  }
}
