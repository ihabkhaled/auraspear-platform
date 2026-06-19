'use client'

import { useState, useCallback } from 'react'
import type { AttackPath, EditAttackPathFormValues } from '@/types'

export function useAttackPathsPageDialogs() {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPath, setEditingPath] = useState<AttackPath | null>(null)

  const handleRowClick = useCallback((path: AttackPath) => {
    setSelectedPathId(prev => (prev === path.id ? null : path.id))
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedPathId(null)
  }, [])

  const handleOpenEdit = useCallback((path: AttackPath) => {
    setEditingPath(path)
    setEditDialogOpen(true)
  }, [])

  const editInitialValues: EditAttackPathFormValues | null = editingPath
    ? {
        title: editingPath.title,
        description: editingPath.description ?? '',
        severity: editingPath.severity,
        status: editingPath.status,
        stages: (editingPath.stages ?? []).map(s => ({
          name: s.name,
          mitreId: s.mitreId,
          description: s.description,
          assets: s.assets,
        })),
        affectedAssets: editingPath.affectedAssets ?? 0,
      }
    : null

  return {
    selectedPathId,
    setSelectedPathId,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editingPath,
    setEditingPath,
    editInitialValues,
    handleRowClick,
    handleCloseDetail,
    handleOpenEdit,
  } as const satisfies Record<string, unknown>
}
