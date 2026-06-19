'use client'

import { useState, useCallback, useMemo } from 'react'
import { SoarTriggerType } from '@/enums'
import type { EditSoarPlaybookFormValues, SoarPlaybook } from '@/types'

export function useSoarPageDialogs() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPlaybook, setSelectedPlaybook] = useState<SoarPlaybook | null>(null)
  const [deletePlaybookId, setDeletePlaybookId] = useState<string | null>(null)
  const [deletePlaybookName, setDeletePlaybookName] = useState('')
  const [runPlaybookId, setRunPlaybookId] = useState<string | null>(null)
  const [runPlaybookName, setRunPlaybookName] = useState('')

  const handleRowClick = useCallback((playbook: SoarPlaybook) => {
    setSelectedPlaybook(playbook)
    setDetailOpen(true)
  }, [])

  const openEditDialog = useCallback((playbook: SoarPlaybook) => {
    setDetailOpen(false)
    setSelectedPlaybook(playbook)
    setEditOpen(true)
  }, [])

  const openDeleteDialog = useCallback((playbook: SoarPlaybook) => {
    setDetailOpen(false)
    setDeletePlaybookId(playbook.id)
    setDeletePlaybookName(playbook.name)
  }, [])

  const openRunDialog = useCallback((playbook: SoarPlaybook) => {
    setDetailOpen(false)
    setRunPlaybookId(playbook.id)
    setRunPlaybookName(playbook.name)
  }, [])

  const editInitialValues: EditSoarPlaybookFormValues = useMemo(
    () => ({
      name: selectedPlaybook?.name ?? '',
      description: selectedPlaybook?.description ?? '',
      triggerType: selectedPlaybook?.triggerType ?? SoarTriggerType.MANUAL,
      steps: '[]',
      triggerConditions: '',
      cronExpression: '',
    }),
    [selectedPlaybook]
  )

  return {
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedPlaybook,
    setSelectedPlaybook,
    deletePlaybookId,
    setDeletePlaybookId,
    deletePlaybookName,
    runPlaybookId,
    setRunPlaybookId,
    runPlaybookName,
    editInitialValues,
    handleRowClick,
    openEditDialog,
    openDeleteDialog,
    openRunDialog,
  } as const satisfies Record<string, unknown>
}
