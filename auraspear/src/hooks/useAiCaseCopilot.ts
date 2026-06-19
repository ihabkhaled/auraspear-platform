'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { caseService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiCaseCopilotResult } from '@/types'

export function useAiCaseCopilot(caseId: string) {
  const t = useTranslations('cases')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canUseCopilot = hasPermission(permissions, Permission.AI_CASE_COPILOT)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, AiCaseCopilotResult>>({})

  const summarizeMutation = useMutation({
    mutationFn: () => caseService.aiSummarize(caseId, connectorValue),
    onSuccess: (data: AiCaseCopilotResult) => {
      setResults(prev => ({ ...prev, summarize: data }))
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const executiveSummaryMutation = useMutation({
    mutationFn: () => caseService.aiExecutiveSummary(caseId, connectorValue),
    onSuccess: (data: AiCaseCopilotResult) => {
      setResults(prev => ({ ...prev, executiveSummary: data }))
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const timelineMutation = useMutation({
    mutationFn: () => caseService.aiTimeline(caseId, connectorValue),
    onSuccess: (data: AiCaseCopilotResult) => {
      setResults(prev => ({ ...prev, timeline: data }))
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const nextTasksMutation = useMutation({
    mutationFn: () => caseService.aiNextTasks(caseId, connectorValue),
    onSuccess: (data: AiCaseCopilotResult) => {
      setResults(prev => ({ ...prev, nextTasks: data }))
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const handleSummarize = useCallback(() => {
    setActiveTask('summarize')
    summarizeMutation.mutate()
  }, [summarizeMutation])

  const handleExecutiveSummary = useCallback(() => {
    setActiveTask('executiveSummary')
    executiveSummaryMutation.mutate()
  }, [executiveSummaryMutation])

  const handleTimeline = useCallback(() => {
    setActiveTask('timeline')
    timelineMutation.mutate()
  }, [timelineMutation])

  const handleNextTasks = useCallback(() => {
    setActiveTask('nextTasks')
    nextTasksMutation.mutate()
  }, [nextTasksMutation])

  const isLoading =
    summarizeMutation.isPending ||
    executiveSummaryMutation.isPending ||
    timelineMutation.isPending ||
    nextTasksMutation.isPending

  return {
    t,
    tCommon,
    tErrors,
    canUseCopilot,
    activeTask,
    results,
    isLoading,
    handleSummarize,
    handleExecutiveSummary,
    handleTimeline,
    handleNextTasks,
  }
}
