'use client'

import { useCallback, useState } from 'react'
import type { RunbookRecord } from '@/types'

export function useKnowledgePageDialogs() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedRunbook, setSelectedRunbook] = useState<RunbookRecord | null>(null)
  const [detailRunbook, setDetailRunbook] = useState<RunbookRecord | null>(null)

  const handleRowClick = useCallback((runbook: RunbookRecord) => {
    setDetailRunbook(runbook)
  }, [])

  const openEditDialog = useCallback((runbook: RunbookRecord) => {
    setSelectedRunbook(runbook)
    setEditOpen(true)
  }, [])

  return {
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    selectedRunbook,
    setSelectedRunbook,
    detailRunbook,
    setDetailRunbook,
    handleRowClick,
    openEditDialog,
  }
}
