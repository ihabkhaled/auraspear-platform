'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useDetectionRuleDeleteDialog } from '@/hooks'
import type { DetectionRuleDeleteDialogProps } from '@/types'

export function DetectionRuleDeleteDialog({
  ruleName,
  onConfirm,
  loading = false,
}: DetectionRuleDeleteDialogProps) {
  const { handleDelete } = useDetectionRuleDeleteDialog({ ruleName, onConfirm })

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
