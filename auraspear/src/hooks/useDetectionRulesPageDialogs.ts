'use client'

import { useCallback, useState } from 'react'
import type { DetectionRule } from '@/types'

export function useDetectionRulesPageDialogs() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRule, setSelectedRule] = useState<DetectionRule | null>(null)

  const handleOpenDetail = useCallback((rule: DetectionRule) => {
    setSelectedRule(rule)
    setDetailOpen(true)
  }, [])

  const handleOpenEdit = useCallback((rule: DetectionRule) => {
    setSelectedRule(rule)
    setDetailOpen(false)
    setEditOpen(true)
  }, [])

  return {
    createOpen,
    setCreateOpen,
    editOpen,
    setEditOpen,
    detailOpen,
    setDetailOpen,
    selectedRule,
    setSelectedRule,
    handleOpenDetail,
    handleOpenEdit,
  }
}
