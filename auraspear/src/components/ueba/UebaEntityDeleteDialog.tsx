'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useUebaEntityDeleteDialog } from '@/hooks'
import type { UebaEntityDeleteDialogProps } from '@/types'

export function UebaEntityDeleteDialog({
  entityName,
  anomalyCount,
  onConfirm,
}: UebaEntityDeleteDialogProps) {
  const { t, handleDelete } = useUebaEntityDeleteDialog({
    entityName,
    anomalyCount,
    onConfirm,
  })

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} aria-label={t('deleteEntity')}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  )
}
