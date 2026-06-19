'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useNormalizationDeleteDialog } from '@/hooks'
import type { NormalizationDeleteDialogProps } from '@/types'

export function NormalizationDeleteDialog({
  pipelineName,
  onConfirm,
  loading = false,
}: NormalizationDeleteDialogProps) {
  const { handleDelete } = useNormalizationDeleteDialog({ pipelineName, onConfirm })

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
