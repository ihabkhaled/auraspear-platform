'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { alertService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiTriageResult } from '@/types'

export function useAiAlertTriage(alertId: string) {
  const t = useTranslations('alerts')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canTriage = hasPermission(permissions, Permission.AI_ALERT_TRIAGE)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, AiTriageResult>>({})

  const summarizeMutation = useMutation({
    mutationFn: () => alertService.triageSummarize(alertId, connectorValue),
    onSuccess: (data: AiTriageResult) => {
      setResults(prev => ({ ...prev, summarize: data }))
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const explainSeverityMutation = useMutation({
    mutationFn: () => alertService.triageExplainSeverity(alertId, connectorValue),
    onSuccess: (data: AiTriageResult) => {
      setResults(prev => ({ ...prev, explainSeverity: data }))
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const falsePositiveScoreMutation = useMutation({
    mutationFn: () => alertService.triageFalsePositiveScore(alertId, connectorValue),
    onSuccess: (data: AiTriageResult) => {
      setResults(prev => ({ ...prev, falsePositiveScore: data }))
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const nextActionMutation = useMutation({
    mutationFn: () => alertService.triageNextAction(alertId, connectorValue),
    onSuccess: (data: AiTriageResult) => {
      setResults(prev => ({ ...prev, nextAction: data }))
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

  const handleExplainSeverity = useCallback(() => {
    setActiveTask('explainSeverity')
    explainSeverityMutation.mutate()
  }, [explainSeverityMutation])

  const handleFalsePositiveScore = useCallback(() => {
    setActiveTask('falsePositiveScore')
    falsePositiveScoreMutation.mutate()
  }, [falsePositiveScoreMutation])

  const handleNextAction = useCallback(() => {
    setActiveTask('nextAction')
    nextActionMutation.mutate()
  }, [nextActionMutation])

  const isLoading =
    summarizeMutation.isPending ||
    explainSeverityMutation.isPending ||
    falsePositiveScoreMutation.isPending ||
    nextActionMutation.isPending

  return {
    t,
    tCommon,
    tErrors,
    canTriage,
    activeTask,
    results,
    isLoading,
    handleSummarize,
    handleExplainSeverity,
    handleFalsePositiveScore,
    handleNextAction,
  }
}
