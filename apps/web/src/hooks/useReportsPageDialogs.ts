'use client'

import { useState, useCallback, useMemo } from 'react'
import { ReportFormat, ReportType } from '@/enums'
import type { EditReportFormValues, Report } from '@/types'

export function useReportsPageDialogs() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [deleteReportId, setDeleteReportId] = useState<string | null>(null)
  const [deleteReportName, setDeleteReportName] = useState('')

  const handleRowClick = useCallback((report: Report) => {
    setSelectedReport(report)
    setDetailOpen(true)
  }, [])

  const openEditDialog = useCallback(() => {
    if (!selectedReport) {
      return
    }
    setDetailOpen(false)
    setEditOpen(true)
  }, [selectedReport])

  const openDeleteDialog = useCallback(() => {
    if (!selectedReport) {
      return
    }
    setDetailOpen(false)
    setDeleteReportId(selectedReport.id)
    setDeleteReportName(selectedReport.name)
  }, [selectedReport])

  const editInitialValues: EditReportFormValues = useMemo(
    () => ({
      name: selectedReport?.name ?? '',
      description: selectedReport?.description ?? '',
      type: selectedReport?.type ?? ReportType.EXECUTIVE,
      format: selectedReport?.format ?? ReportFormat.PDF,
      parameters: selectedReport?.parameters
        ? JSON.stringify(selectedReport.parameters, null, 2)
        : '',
    }),
    [selectedReport]
  )

  return {
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedReport,
    setSelectedReport,
    deleteReportId,
    setDeleteReportId,
    deleteReportName,
    editInitialValues,
    handleRowClick,
    openEditDialog,
    openDeleteDialog,
  } as const satisfies Record<string, unknown>
}
