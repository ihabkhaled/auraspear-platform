'use client'

import { useCallback, useState } from 'react'
import type { Vulnerability } from '@/types'
import { useVulnerabilityDeleteDialog } from './useVulnerabilityDeleteDialog'

export function useVulnerabilitiesPageDialogs() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null)

  const { confirmDelete, isDeleting } = useVulnerabilityDeleteDialog()

  const handleRowClick = useCallback((vulnerability: Vulnerability) => {
    setSelectedVulnerability(vulnerability)
    setDetailOpen(true)
  }, [])

  const handleEditFromDetail = useCallback((vulnerability: Vulnerability) => {
    setSelectedVulnerability(vulnerability)
    setDetailOpen(false)
    setEditOpen(true)
  }, [])

  const handleDeleteFromDetail = useCallback(
    (vulnerability: Vulnerability) => {
      setDetailOpen(false)
      void confirmDelete(vulnerability)
    },
    [confirmDelete]
  )

  const handleOpenCreate = useCallback(() => {
    setCreateOpen(true)
  }, [])

  const handleOpenBulkImport = useCallback(() => {
    setBulkImportOpen(true)
  }, [])

  return {
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    bulkImportOpen,
    setBulkImportOpen,
    selectedVulnerability,
    isDeleting,
    handleRowClick,
    handleEditFromDetail,
    handleDeleteFromDetail,
    handleOpenCreate,
    handleOpenBulkImport,
  }
}
