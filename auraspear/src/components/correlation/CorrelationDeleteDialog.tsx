'use client'

import { useCorrelationDeleteDialog } from '@/hooks'
import type { CorrelationDeleteDialogProps } from '@/types'

export function CorrelationDeleteDialog({ rule, onConfirm }: CorrelationDeleteDialogProps) {
  useCorrelationDeleteDialog(rule, onConfirm)

  return null
}
