'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { soarService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiSoarResult } from '@/types'

export function useAiSoar() {
  const t = useTranslations('soar')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canUseCopilot = hasPermission(permissions, Permission.AI_SOAR_COPILOT)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [description, setDescription] = useState('')
  const [draftResult, setDraftResult] = useState<AiSoarResult | null>(null)

  const draftMutation = useMutation({
    mutationFn: (desc: string) => soarService.aiDraftPlaybook(desc, connectorValue),
    onSuccess: (data: AiSoarResult) => {
      setDraftResult(data)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleDraftPlaybook = useCallback(() => {
    if (description.trim().length === 0) {
      return
    }
    draftMutation.mutate(description)
  }, [description, draftMutation])

  return {
    t,
    tCommon,
    tErrors,
    canUseCopilot,
    description,
    setDescription,
    draftResult,
    isLoading: draftMutation.isPending,
    handleDraftPlaybook,
  }
}
