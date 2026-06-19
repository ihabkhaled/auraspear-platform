import { useState, useCallback } from 'react'
import type { CorrelationRule } from '@/types'

export function useCorrelationPageDialogs() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<CorrelationRule | null>(null)
  const [deletingRule, setDeletingRule] = useState<CorrelationRule | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null)

  const handleOpenCreate = useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  const handleOpenEdit = useCallback((rule: CorrelationRule) => {
    setEditingRule(rule)
    setEditDialogOpen(true)
  }, [])

  const handleOpenDelete = useCallback((rule: CorrelationRule) => {
    setDeletingRule(rule)
  }, [])

  const handleRowClick = useCallback((rule: CorrelationRule) => {
    setSelectedRuleId(rule.id)
    setDetailPanelOpen(true)
  }, [])

  const findSelectedRule = useCallback(
    (rules: CorrelationRule[] | undefined) => {
      if (!selectedRuleId || !rules) {
        return null
      }
      return rules.find(r => r.id === selectedRuleId) ?? null
    },
    [selectedRuleId]
  )

  return {
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    editingRule,
    setEditingRule,
    deletingRule,
    setDeletingRule,
    detailPanelOpen,
    setDetailPanelOpen,
    selectedRuleId,
    setSelectedRuleId,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenDelete,
    handleRowClick,
    findSelectedRule,
  } as const satisfies Record<string, unknown>
}
