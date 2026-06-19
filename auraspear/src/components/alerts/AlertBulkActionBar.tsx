'use client'

import { CheckCircle, XCircle, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAlertBulkActionBar } from '@/hooks'
import type { AlertBulkActionBarProps } from '@/types'

export function AlertBulkActionBar({
  selectedCount,
  onAcknowledge,
  onClose,
  onClear,
  isAcknowledging,
  isClosing,
}: AlertBulkActionBarProps) {
  const { t } = useAlertBulkActionBar()

  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="bg-card border-border fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-3 rounded-lg border px-4 py-3 shadow-lg">
      <span className="text-sm font-medium">{t('selectedCount', { count: selectedCount })}</span>

      <div className="bg-border h-6 w-px" />

      {onAcknowledge && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAcknowledge}
          disabled={isAcknowledging || isClosing}
        >
          <CheckCircle className="h-4 w-4" />
          {t('bulkAcknowledge')}
        </Button>
      )}

      {onClose && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClose}
          disabled={isAcknowledging || isClosing}
        >
          <XCircle className="h-4 w-4" />
          {t('bulkClose')}
        </Button>
      )}

      <Button variant="ghost" size="sm" onClick={onClear}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
