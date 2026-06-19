import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { AiAgentPanelTab, AiAgentStatus, Permission } from '@/enums'
import { isAiAgentPanelTab } from '@/lib/ai-agent.utils'
import { formatDate } from '@/lib/dayjs'
import { AI_AGENT_STATUS_LABEL_KEYS, AI_AGENT_TIER_LABEL_KEYS } from '@/lib/constants/ai-agents'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { lookup } from '@/lib/utils'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiAgentDetailPanelProps, AiAgentToolFormValues } from '@/types'
import {
  useAiAgent,
  useUpdateSoul,
  useStartAgent,
  useStopAgent,
  useRunAiAgent,
  useCreateAgentTool,
  useDeleteAgentTool,
} from './useAiAgents'

export function useAiAgentDetailPanel({
  agent: listAgent,
  onClose,
  onEdit,
  onDelete,
}: AiAgentDetailPanelProps) {
  const t = useTranslations('aiAgents')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)

  // Fetch full agent with tools and sessions from the detail endpoint
  const { data: fullAgentResponse } = useAiAgent(listAgent.id)
  const agent = fullAgentResponse?.data ?? listAgent

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [activeTab, setActiveTab] = useState(AiAgentPanelTab.OVERVIEW)
  const [soulMdDraft, setSoulMdDraft] = useState(agent.soulMd ?? '')
  const [runPrompt, setRunPrompt] = useState('')
  const [toolDialogOpen, setToolDialogOpen] = useState(false)
  const [sessionsOpen, setSessionsOpen] = useState(true)
  const [toolsOpen, setToolsOpen] = useState(true)
  const [soulOpen, setSoulOpen] = useState(true)

  const updateSoulMutation = useUpdateSoul()
  const startAgentMutation = useStartAgent()
  const stopAgentMutation = useStopAgent()
  const runAgentMutation = useRunAiAgent()
  const createToolMutation = useCreateAgentTool()
  const deleteToolMutation = useDeleteAgentTool()

  const isAgentOnline = agent.status === AiAgentStatus.ONLINE
  const canExecute = hasPermission(permissions, Permission.AI_AGENTS_EXECUTE)

  const statusLabel = useMemo(
    () => t(lookup(AI_AGENT_STATUS_LABEL_KEYS, agent.status)),
    [agent.status, t]
  )

  const tierLabel = useMemo(() => t(lookup(AI_AGENT_TIER_LABEL_KEYS, agent.tier)), [agent.tier, t])

  const formattedTokens = useMemo(() => agent.totalTokens.toLocaleString(), [agent.totalTokens])

  const formattedCost = useMemo(() => `$${agent.totalCost.toFixed(2)}`, [agent.totalCost])

  const formattedDate = useMemo(() => formatDate(agent.createdAt), [agent.createdAt])

  const handleSaveSoul = useCallback(() => {
    updateSoulMutation.mutate(
      { id: agent.id, soulMd: soulMdDraft },
      {
        onSuccess: () => {
          Toast.success(t('soulUpdated'))
        },
        onError: buildErrorToastHandler(tErrors),
      }
    )
  }, [agent.id, soulMdDraft, updateSoulMutation, t, tErrors])

  const handleStartAgent = useCallback(() => {
    startAgentMutation.mutate(agent.id, {
      onSuccess: () => {
        Toast.success(t('agentStarted'))
      },
      onError: buildErrorToastHandler(tErrors),
    })
  }, [agent.id, startAgentMutation, t, tErrors])

  const handleStopAgent = useCallback(() => {
    stopAgentMutation.mutate(agent.id, {
      onSuccess: () => {
        Toast.success(t('agentStopped'))
      },
      onError: buildErrorToastHandler(tErrors),
    })
  }, [agent.id, stopAgentMutation, t, tErrors])

  const handleRunAgent = useCallback(() => {
    runAgentMutation.mutate(
      { id: agent.id, prompt: runPrompt, connector: connectorValue },
      {
        onSuccess: () => {
          setRunPrompt('')
          Toast.success(t('runQueued'))
        },
        onError: buildErrorToastHandler(tErrors),
      }
    )
  }, [agent.id, runAgentMutation, runPrompt, connectorValue, t, tErrors])

  const handleCreateTool = useCallback(
    (formValues: AiAgentToolFormValues) => {
      let parsedSchema: Record<string, unknown> = {}
      try {
        parsedSchema = JSON.parse(formValues.schema) as Record<string, unknown>
      } catch {
        Toast.error(tErrors('aiAgents.invalidToolSchema'))
        return
      }
      createToolMutation.mutate(
        {
          agentId: agent.id,
          data: {
            name: formValues.name,
            description: formValues.description,
            schema: parsedSchema,
          },
        },
        {
          onSuccess: () => {
            setToolDialogOpen(false)
            Toast.success(t('toolCreated'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [agent.id, createToolMutation, t, tErrors]
  )

  const handleDeleteTool = useCallback(
    (toolId: string) => {
      deleteToolMutation.mutate(
        { agentId: agent.id, toolId },
        {
          onSuccess: () => {
            Toast.success(t('toolDeleted'))
          },
          onError: buildErrorToastHandler(tErrors),
        }
      )
    },
    [agent.id, deleteToolMutation, t, tErrors]
  )

  const handleToggleAgent = isAgentOnline ? handleStopAgent : handleStartAgent
  const isToggling = startAgentMutation.isPending || stopAgentMutation.isPending
  const handleActiveTabChange = useCallback((value: string) => {
    if (isAiAgentPanelTab(value)) {
      setActiveTab(value)
    }
  }, [])

  return {
    t,
    agent,
    activeTab,
    handleActiveTabChange,
    soulMdDraft,
    setSoulMdDraft,
    runPrompt,
    setRunPrompt,
    toolDialogOpen,
    setToolDialogOpen,
    sessionsOpen,
    setSessionsOpen,
    toolsOpen,
    setToolsOpen,
    soulOpen,
    setSoulOpen,
    statusLabel,
    tierLabel,
    formattedTokens,
    formattedCost,
    formattedDate,
    handleSaveSoul,
    handleToggleAgent,
    handleRunAgent,
    handleCreateTool,
    handleDeleteTool,
    isAgentOnline,
    canExecute,
    isSavingSoul: updateSoulMutation.isPending,
    isToggling,
    isRunningAgent: runAgentMutation.isPending,
    isCreatingTool: createToolMutation.isPending,
    isDeletingTool: deleteToolMutation.isPending,
    onClose,
    onEdit,
    onDelete,
  }
}
