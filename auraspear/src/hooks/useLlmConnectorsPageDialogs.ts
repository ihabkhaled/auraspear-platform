'use client'

import { useState, useCallback, useMemo } from 'react'
import type { LlmConnectorRecord, EditLlmConnectorFormValues } from '@/types'

export function useLlmConnectorsPageDialogs() {
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editConnector, setEditConnector] = useState<LlmConnectorRecord | null>(null)

  const handleEditOpen = useCallback((connector: LlmConnectorRecord) => {
    setEditConnector(connector)
    setEditDialogOpen(true)
  }, [])

  const findSelectedConnector = useCallback(
    (connectors: LlmConnectorRecord[] | undefined) => {
      if (!selectedConnectorId || !connectors) {
        return null
      }
      return connectors.find(c => c.id === selectedConnectorId) ?? null
    },
    [selectedConnectorId]
  )

  const editInitialValues: EditLlmConnectorFormValues | null = useMemo(() => {
    if (!editConnector) return null
    return {
      name: editConnector.name,
      description: editConnector.description ?? '',
      baseUrl: editConnector.baseUrl,
      apiKey: '',
      defaultModel: editConnector.defaultModel ?? '',
      organizationId: editConnector.organizationId ?? '',
      maxTokensParam: editConnector.maxTokensParam,
      timeout: editConnector.timeout,
    }
  }, [editConnector])

  return {
    selectedConnectorId,
    setSelectedConnectorId,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editConnector,
    setEditConnector,
    editInitialValues,
    handleEditOpen,
    findSelectedConnector,
  }
}
