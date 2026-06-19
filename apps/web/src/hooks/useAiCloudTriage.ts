'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { cloudSecurityService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiCloudTriageResult } from '@/types'

export function useAiCloudTriage(findingId: string) {
  const t = useTranslations('cloudSecurity')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canTriage = hasPermission(permissions, Permission.AI_CLOUD_TRIAGE)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [result, setResult] = useState<AiCloudTriageResult | null>(null)

  const triageMutation = useMutation({
    mutationFn: () => cloudSecurityService.aiTriageFinding(findingId, connectorValue),
    onSuccess: (data: AiCloudTriageResult) => {
      setResult(data)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleTriage = useCallback(() => {
    triageMutation.mutate()
  }, [triageMutation])

  const handleClearResult = useCallback(() => {
    setResult(null)
  }, [])

  return {
    t,
    tCommon,
    tErrors,
    canTriage,
    triage: handleTriage,
    isTriaging: triageMutation.isPending,
    result,
    clearResult: handleClearResult,
  }
}
