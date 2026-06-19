'use client'

import type { AiAutomationBadgeData } from '@/types'
import { useAgentConfig } from './useAgentConfig'

export function useAiAutomationBadge(agentId: string | null): AiAutomationBadgeData {
  const query = useAgentConfig(agentId)
  const config = query.data?.data ?? null

  return {
    isEnabled: config?.isEnabled ?? false,
    automationMode: config?.triggerMode ?? 'manual_only',
    agentName: config?.displayName ?? '',
    isLoading: query.isLoading,
  }
}
