'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useCloudAccountDeleteDialog } from '@/hooks'
import type { CloudAccountDeleteDialogProps } from '@/types'

export function CloudAccountDeleteDialog({
  accountName,
  onConfirm,
  loading = false,
}: CloudAccountDeleteDialogProps) {
  const { handleDelete } = useCloudAccountDeleteDialog({ accountName, onConfirm })

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4" />
    </Button>
  )
}
