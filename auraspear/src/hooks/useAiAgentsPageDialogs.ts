'use client'

import { useState, useCallback, useMemo } from 'react'
import type { AiAgent, EditAiAgentFormValues } from '@/types'

export function useAiAgentsPageDialogs() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editAgent, setEditAgent] = useState<AiAgent | null>(null)

  const handleRowClick = useCallback((agent: AiAgent) => {
    setSelectedAgentId(prev => (prev === agent.id ? null : agent.id))
  }, [])

  const handleEditOpen = useCallback((agent: AiAgent) => {
    setEditAgent(agent)
    setEditDialogOpen(true)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedAgentId(null)
  }, [])

  const findSelectedAgent = useCallback(
    (agents: AiAgent[] | undefined) => {
      if (!selectedAgentId || !agents) {
        return null
      }
      return agents.find(a => a.id === selectedAgentId) ?? null
    },
    [selectedAgentId]
  )

  const editInitialValues: EditAiAgentFormValues | null = useMemo(() => {
    if (!editAgent) return null
    return {
      name: editAgent.name,
      description: editAgent.description ?? '',
      model: editAgent.model,
      tier: editAgent.tier,
      soulMd: editAgent.soulMd ?? '',
    }
  }, [editAgent])

  return {
    selectedAgentId,
    setSelectedAgentId,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editAgent,
    setEditAgent,
    editInitialValues,
    handleRowClick,
    handleEditOpen,
    handleCloseDetail,
    findSelectedAgent,
  } as const satisfies Record<string, unknown>
}
