'use client'

import { useCallback, useMemo, useState } from 'react'
import { ComplianceStandard } from '@/enums'
import type { ComplianceFramework, EditComplianceFrameworkFormValues } from '@/types'

export function useCompliancePageDialogs() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedFramework, setSelectedFramework] = useState<ComplianceFramework | null>(null)
  const [deleteFrameworkId, setDeleteFrameworkId] = useState<string | null>(null)
  const [deleteFrameworkName, setDeleteFrameworkName] = useState('')

  const handleRowClick = useCallback((framework: ComplianceFramework) => {
    setSelectedFramework(framework)
    setDetailOpen(true)
  }, [])

  const openEditDialog = useCallback((framework: ComplianceFramework) => {
    setSelectedFramework(framework)
    setDetailOpen(false)
    setEditOpen(true)
  }, [])

  const openDeleteDialog = useCallback((framework: ComplianceFramework) => {
    setDetailOpen(false)
    setDeleteFrameworkId(framework.id)
    setDeleteFrameworkName(framework.name)
  }, [])

  const editInitialValues: EditComplianceFrameworkFormValues = useMemo(
    () => ({
      name: selectedFramework?.name ?? '',
      standard: selectedFramework?.standard ?? ComplianceStandard.ISO_27001,
      version: selectedFramework?.version ?? '',
      description: selectedFramework?.description ?? '',
    }),
    [selectedFramework]
  )

  return {
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedFramework,
    setSelectedFramework,
    deleteFrameworkId,
    setDeleteFrameworkId,
    deleteFrameworkName,
    editInitialValues,
    handleRowClick,
    openEditDialog,
    openDeleteDialog,
  }
}
