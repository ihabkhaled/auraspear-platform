'use client'

import { useCallback, useMemo, useState } from 'react'
import { type AiTriggerMode, type AiOutputFormat } from '@/enums'
import { deriveAgentConfigState } from '@/lib/ai-config.utils'
import type { TenantAgentConfig, UpdateAgentConfigInput } from '@/types'

export function useAgentConfigEditDialog(
  config: TenantAgentConfig | null,
  onSubmit: (agentId: string, data: UpdateAgentConfigInput) => void
) {
  // Derive initial values from config — recalculates when config identity changes
  const derived = useMemo(() => deriveAgentConfigState(config), [config])

  const [enabled, setEnabled] = useState(derived.enabled)
  const [providerMode, setProviderMode] = useState(derived.providerMode)
  const [model, setModel] = useState(derived.model)
  const [temperature, setTemperature] = useState(derived.temperature)
  const [maxTokens, setMaxTokens] = useState(derived.maxTokens)
  const [triggerMode, setTriggerMode] = useState<AiTriggerMode>(derived.triggerMode)
  const [outputFormat, setOutputFormat] = useState<AiOutputFormat>(derived.outputFormat)
  const [presentationSkills, setPresentationSkills] = useState(derived.presentationSkills)
  const [systemPrompt, setSystemPrompt] = useState(derived.systemPrompt)
  const [promptSuffix, setPromptSuffix] = useState(derived.promptSuffix)
  const [indexPatterns, setIndexPatterns] = useState(derived.indexPatterns)
  const [tokensPerHourLimit, setTokensPerHourLimit] = useState(derived.tokensPerHourLimit)
  const [tokensPerDayLimit, setTokensPerDayLimit] = useState(derived.tokensPerDayLimit)
  const [tokensPerMonthLimit, setTokensPerMonthLimit] = useState(derived.tokensPerMonthLimit)
  const [maxConcurrentRuns, setMaxConcurrentRuns] = useState(derived.maxConcurrentRuns)

  const resetToConfig = useCallback(() => {
    const next = deriveAgentConfigState(config)
    setEnabled(next.enabled)
    setProviderMode(next.providerMode)
    setModel(next.model)
    setTemperature(next.temperature)
    setMaxTokens(next.maxTokens)
    setTriggerMode(next.triggerMode)
    setOutputFormat(next.outputFormat)
    setPresentationSkills(next.presentationSkills)
    setSystemPrompt(next.systemPrompt)
    setPromptSuffix(next.promptSuffix)
    setIndexPatterns(next.indexPatterns)
    setTokensPerHourLimit(next.tokensPerHourLimit)
    setTokensPerDayLimit(next.tokensPerDayLimit)
    setTokensPerMonthLimit(next.tokensPerMonthLimit)
    setMaxConcurrentRuns(next.maxConcurrentRuns)
  }, [config])

  const handleSubmit = useCallback(() => {
    if (!config) {
      return
    }
    const data: UpdateAgentConfigInput = {
      isEnabled: enabled,
      providerMode,
      model: model.length > 0 ? model : null,
      temperature: Number.parseFloat(temperature) || 0.7,
      maxTokensPerCall: Number.parseInt(maxTokens, 10) || 2048,
      triggerMode,
      outputFormat,
      presentationSkills: presentationSkills ? ['summary', 'visualization'] : [],
      systemPrompt: systemPrompt.length > 0 ? systemPrompt : null,
      promptSuffix: promptSuffix.length > 0 ? promptSuffix : null,
      indexPatterns: indexPatterns
        .split(',')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0),
      tokensPerHour: Number.parseInt(tokensPerHourLimit, 10) || 10000,
      tokensPerDay: Number.parseInt(tokensPerDayLimit, 10) || 100000,
      tokensPerMonth: Number.parseInt(tokensPerMonthLimit, 10) || 1000000,
      maxConcurrentRuns: Number.parseInt(maxConcurrentRuns, 10) || 3,
    }
    onSubmit(config.agentId, data)
  }, [
    config,
    enabled,
    providerMode,
    model,
    temperature,
    maxTokens,
    triggerMode,
    outputFormat,
    presentationSkills,
    systemPrompt,
    promptSuffix,
    indexPatterns,
    tokensPerHourLimit,
    tokensPerDayLimit,
    tokensPerMonthLimit,
    maxConcurrentRuns,
    onSubmit,
  ])

  return {
    enabled,
    setEnabled,
    providerMode,
    setProviderMode,
    model,
    setModel,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    triggerMode,
    setTriggerMode,
    outputFormat,
    setOutputFormat,
    presentationSkills,
    setPresentationSkills,
    systemPrompt,
    setSystemPrompt,
    promptSuffix,
    setPromptSuffix,
    indexPatterns,
    setIndexPatterns,
    tokensPerHourLimit,
    setTokensPerHourLimit,
    tokensPerDayLimit,
    setTokensPerDayLimit,
    tokensPerMonthLimit,
    setTokensPerMonthLimit,
    maxConcurrentRuns,
    setMaxConcurrentRuns,
    handleSubmit,
    resetToConfig,
  }
}
