'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { intelService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiIntelResult } from '@/types'

export function useAiIntel() {
  const t = useTranslations('intel')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canEnrich = hasPermission(permissions, Permission.INTEL_VIEW)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [activeTask, setActiveTask] = useState<string | null>(null)
  const [enrichResult, setEnrichResult] = useState<AiIntelResult | null>(null)
  const [advisoryResult, setAdvisoryResult] = useState<AiIntelResult | null>(null)

  const enrichMutation = useMutation({
    mutationFn: (iocId: string) => intelService.aiEnrichIoc(iocId, connectorValue),
    onSuccess: (data: AiIntelResult) => {
      setEnrichResult(data)
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const advisoryMutation = useMutation({
    mutationFn: (iocIds: string[]) => intelService.aiDraftAdvisory(iocIds, connectorValue),
    onSuccess: (data: AiIntelResult) => {
      setAdvisoryResult(data)
      setActiveTask(null)
    },
    onError: (error: unknown) => {
      buildErrorToastHandler(tErrors)(error)
      setActiveTask(null)
    },
  })

  const handleEnrichIoc = useCallback(
    (iocId: string) => {
      setActiveTask('enrich')
      enrichMutation.mutate(iocId)
    },
    [enrichMutation]
  )

  const handleDraftAdvisory = useCallback(
    (iocIds: string[]) => {
      setActiveTask('advisory')
      advisoryMutation.mutate(iocIds)
    },
    [advisoryMutation]
  )

  const isLoading = enrichMutation.isPending || advisoryMutation.isPending

  return {
    t,
    tCommon,
    tErrors,
    canEnrich,
    activeTask,
    enrichResult,
    advisoryResult,
    isLoading,
    handleEnrichIoc,
    handleDraftAdvisory,
  }
}
