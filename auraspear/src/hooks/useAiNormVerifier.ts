'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { normalizationService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiResponse } from '@/types'

export function useAiNormVerifier() {
  const t = useTranslations('normalization')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canVerify = hasPermission(permissions, Permission.NORMALIZATION_VIEW)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [result, setResult] = useState<AiResponse | null>(null)

  const verifyMutation = useMutation({
    mutationFn: (params: { pipelineId: string; sampleEvents: unknown[] }) =>
      normalizationService.aiVerifyPipeline(params.pipelineId, params.sampleEvents, connectorValue),
    onSuccess: (data: AiResponse) => {
      setResult(data)
      Toast.success(t('aiVerifySuccess'))
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleVerify = useCallback(
    (pipelineId: string, sampleEvents: unknown[]) => {
      verifyMutation.mutate({ pipelineId, sampleEvents })
    },
    [verifyMutation]
  )

  const resetResult = useCallback(() => {
    setResult(null)
  }, [])

  return {
    t,
    tErrors,
    canVerify,
    verifyMutation,
    result,
    isVerifying: verifyMutation.isPending,
    handleVerify,
    resetResult,
  }
}
