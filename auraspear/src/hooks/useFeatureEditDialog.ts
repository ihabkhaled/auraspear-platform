'use client'

import { useCallback, useMemo, useState } from 'react'
import { deriveFeatureState } from '@/lib/ai-config.utils'
import type { AiFeatureConfig, UpdateAiFeatureConfigInput } from '@/types'

export function useFeatureEditDialog(
  feature: AiFeatureConfig | null,
  onSubmit: (featureKey: string, data: UpdateAiFeatureConfigInput) => void
) {
  const derived = useMemo(() => deriveFeatureState(feature), [feature])

  const [enabled, setEnabled] = useState(derived.enabled)
  const [preferredProvider, setPreferredProvider] = useState<string | null>(
    derived.preferredProvider
  )
  const [maxTokens, setMaxTokens] = useState(derived.maxTokens)
  const [approvalLevel, setApprovalLevel] = useState(derived.approvalLevel)
  const [monthlyTokenBudget, setMonthlyTokenBudget] = useState<number | null>(
    derived.monthlyTokenBudget
  )

  const handleSubmit = useCallback(() => {
    if (!feature) {
      return
    }
    const data: UpdateAiFeatureConfigInput = {
      enabled,
      preferredProvider,
      maxTokens,
      approvalLevel,
      monthlyTokenBudget,
    }
    onSubmit(feature.featureKey, data)
  }, [feature, enabled, preferredProvider, maxTokens, approvalLevel, monthlyTokenBudget, onSubmit])

  return {
    enabled,
    setEnabled,
    preferredProvider,
    setPreferredProvider,
    maxTokens,
    setMaxTokens,
    approvalLevel,
    setApprovalLevel,
    monthlyTokenBudget,
    setMonthlyTokenBudget,
    handleSubmit,
  }
}
