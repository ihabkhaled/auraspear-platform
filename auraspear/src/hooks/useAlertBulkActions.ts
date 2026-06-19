'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { useBulkAcknowledgeAlerts, useBulkCloseAlerts } from './useAlerts'

export function useAlertBulkActions() {
  const t = useTranslations('alerts')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const acknowledgeMutation = useBulkAcknowledgeAlerts()
  const closeMutation = useBulkCloseAlerts()

  const handleBulkAcknowledge = useCallback(() => {
    if (selectedIds.length === 0) return

    acknowledgeMutation.mutate(selectedIds, {
      onSuccess: result => {
        Toast.success(t('bulkSuccess', { count: result.data.succeeded }))
        setSelectedIds([])
      },
      onError: () => {
        Toast.error(t('bulkError'))
      },
    })
  }, [selectedIds, acknowledgeMutation, t])

  const handleBulkClose = useCallback(() => {
    if (selectedIds.length === 0) return

    closeMutation.mutate(
      { ids: selectedIds, resolution: 'Bulk closed by operator' },
      {
        onSuccess: result => {
          Toast.success(t('bulkSuccess', { count: result.data.succeeded }))
          setSelectedIds([])
        },
        onError: () => {
          Toast.error(t('bulkError'))
        },
      }
    )
  }, [selectedIds, closeMutation, t])

  const handleClearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  return {
    selectedIds,
    setSelectedIds,
    handleBulkAcknowledge,
    handleBulkClose,
    handleClearSelection,
    isAcknowledging: acknowledgeMutation.isPending,
    isClosing: closeMutation.isPending,
  }
}
