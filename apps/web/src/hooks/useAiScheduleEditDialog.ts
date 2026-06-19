'use client'

import { useCallback, useMemo, useState } from 'react'
import { CronPreset } from '@/enums'
import { deriveScheduleFormState } from '@/lib/ai-config.utils'
import { CRON_PRESET_EXPRESSION } from '@/lib/constants/cron-presets'
import { cronExpressionFromPreset, cronPresetFromExpression } from '@/lib/cron.utils'
import { lookup } from '@/lib/utils'
import type { AiAgentSchedule, UpdateScheduleInput } from '@/types'

export function useAiScheduleEditDialog(
  schedule: AiAgentSchedule | null,
  onSubmit: (id: string, data: UpdateScheduleInput) => void
) {
  const derived = useMemo(() => deriveScheduleFormState(schedule), [schedule])

  const initialPreset = useMemo(
    () => cronPresetFromExpression(derived.cronExpression),
    [derived.cronExpression]
  )

  const [cronPreset, setCronPreset] = useState<CronPreset>(initialPreset)
  const [customCron, setCustomCron] = useState(
    initialPreset === CronPreset.CUSTOM ? derived.cronExpression : ''
  )
  const [timezone, setTimezone] = useState(derived.timezone)
  const [executionMode, setExecutionMode] = useState(derived.executionMode)
  const [riskMode, setRiskMode] = useState(derived.riskMode)
  const [approvalMode, setApprovalMode] = useState(derived.approvalMode)
  const [maxConcurrency, setMaxConcurrency] = useState(derived.maxConcurrency)
  const [providerPreference, setProviderPreference] = useState(derived.providerPreference)
  const [modelPreference, setModelPreference] = useState(derived.modelPreference)

  const handlePresetChange = useCallback((preset: CronPreset) => {
    setCronPreset(preset)
    if (preset !== CronPreset.CUSTOM) {
      setCustomCron(lookup(CRON_PRESET_EXPRESSION, preset) ?? '')
    }
  }, [])

  const resolvedCronExpression = useMemo(
    () => cronExpressionFromPreset(cronPreset, customCron),
    [cronPreset, customCron]
  )

  const handleSubmit = useCallback(() => {
    if (!schedule) {
      return
    }
    const data: UpdateScheduleInput = {
      cronExpression: resolvedCronExpression,
      timezone,
      executionMode,
      riskMode,
      approvalMode,
      maxConcurrency: Number.parseInt(maxConcurrency, 10) || 1,
      providerPreference: providerPreference.length > 0 ? providerPreference : null,
      modelPreference: modelPreference.length > 0 ? modelPreference : null,
    }
    onSubmit(schedule.id, data)
  }, [
    schedule,
    resolvedCronExpression,
    timezone,
    executionMode,
    riskMode,
    approvalMode,
    maxConcurrency,
    providerPreference,
    modelPreference,
    onSubmit,
  ])

  return {
    cronPreset,
    handlePresetChange,
    customCron,
    setCustomCron,
    isCustom: cronPreset === CronPreset.CUSTOM,
    timezone,
    setTimezone,
    executionMode,
    setExecutionMode,
    riskMode,
    setRiskMode,
    approvalMode,
    setApprovalMode,
    maxConcurrency,
    setMaxConcurrency,
    providerPreference,
    setProviderPreference,
    modelPreference,
    setModelPreference,
    handleSubmit,
  }
}
