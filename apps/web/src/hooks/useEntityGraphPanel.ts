'use client'

import { useState, useCallback } from 'react'
import { useEntityGraph } from './useEntityGraph'

export function useEntityGraphPanel() {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [graphOpen, setGraphOpen] = useState(false)

  const { data: graphData, isLoading: graphLoading } = useEntityGraph(selectedEntityId ?? '')

  const handleOpenGraph = useCallback((entityId: string) => {
    setSelectedEntityId(entityId)
    setGraphOpen(true)
  }, [])

  const handleCloseGraph = useCallback(() => {
    setGraphOpen(false)
    setSelectedEntityId(null)
  }, [])

  return {
    graphOpen,
    setGraphOpen,
    graphData,
    graphLoading,
    selectedEntityId,
    handleOpenGraph,
    handleCloseGraph,
  }
}
