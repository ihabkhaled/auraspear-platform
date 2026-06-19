'use client'

import { useCallback, useMemo, useState } from 'react'
import { NormalizationSourceType } from '@/enums'
import type { NormalizationPipeline } from '@/types'

export function useNormalizationPageDialogs() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPipeline, setSelectedPipeline] = useState<NormalizationPipeline | null>(null)

  const handleRowClick = useCallback((pipeline: NormalizationPipeline) => {
    setSelectedPipeline(pipeline)
    setDetailOpen(true)
  }, [])

  const handleOpenEdit = useCallback((pipeline: NormalizationPipeline) => {
    setSelectedPipeline(pipeline)
    setDetailOpen(false)
    setEditOpen(true)
  }, [])

  const editInitialValues = useMemo(
    () => ({
      name: selectedPipeline?.name ?? '',
      sourceType: selectedPipeline?.sourceType ?? NormalizationSourceType.SYSLOG,
      parserConfig: selectedPipeline
        ? JSON.stringify(selectedPipeline.parserConfig, null, 2)
        : '{}',
      fieldMappings: selectedPipeline
        ? JSON.stringify(selectedPipeline.fieldMappings, null, 2)
        : '{}',
    }),
    [selectedPipeline]
  )

  return {
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedPipeline,
    setSelectedPipeline,
    editInitialValues,
    handleRowClick,
    handleOpenEdit,
  }
}
