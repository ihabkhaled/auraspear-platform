'use client'

import { useState, useCallback, useMemo } from 'react'
import { IncidentCategory, IncidentSeverity, IncidentStatus } from '@/enums'
import type { Incident } from '@/types'

export function useIncidentPageDialogs() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null)
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null)

  const handleRowClick = useCallback((incident: Incident) => {
    setDetailIncident(incident)
    setDetailPanelOpen(true)
  }, [])

  const handleOpenEdit = useCallback((incident: Incident) => {
    setDetailPanelOpen(false)
    setEditingIncident(incident)
    setEditDialogOpen(true)
  }, [])

  const editInitialValues = useMemo(
    () => ({
      title: editingIncident?.title ?? '',
      description: editingIncident?.description ?? '',
      severity: editingIncident?.severity ?? IncidentSeverity.MEDIUM,
      category: editingIncident?.category ?? IncidentCategory.OTHER,
      status: editingIncident?.status ?? IncidentStatus.OPEN,
      assigneeId: editingIncident?.assigneeId ?? undefined,
      mitreTechniques: editingIncident?.mitreTechniques?.join(', ') ?? '',
    }),
    [editingIncident]
  )

  return {
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    detailPanelOpen,
    setDetailPanelOpen,
    editingIncident,
    setEditingIncident,
    detailIncident,
    setDetailIncident,
    editInitialValues,
    handleRowClick,
    handleOpenEdit,
  } as const satisfies Record<string, unknown>
}
