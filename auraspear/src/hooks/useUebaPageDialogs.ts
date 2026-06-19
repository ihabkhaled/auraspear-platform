'use client'

import { useState, useCallback, useMemo } from 'react'
import { UebaEntityType } from '@/enums'
import type { UebaEntity } from '@/types'

export function useUebaPageDialogs() {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<UebaEntity | null>(null)

  const handleRowClick = useCallback((entity: UebaEntity) => {
    setSelectedEntityId(prev => (prev === entity.id ? null : entity.id))
  }, [])

  const handleCloseDetailPanel = useCallback(() => {
    setSelectedEntityId(null)
  }, [])

  const handleEditOpen = useCallback((entity: UebaEntity) => {
    setEditingEntity(entity)
    setEditDialogOpen(true)
  }, [])

  const editInitialValues = useMemo(
    () => ({
      entityName: editingEntity?.entityName ?? '',
      entityType: editingEntity?.entityType ?? UebaEntityType.USER,
    }),
    [editingEntity?.entityName, editingEntity?.entityType]
  )

  return {
    selectedEntityId,
    setSelectedEntityId,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editingEntity,
    setEditingEntity,
    editInitialValues,
    handleRowClick,
    handleCloseDetailPanel,
    handleEditOpen,
  } as const satisfies Record<string, unknown>
}
