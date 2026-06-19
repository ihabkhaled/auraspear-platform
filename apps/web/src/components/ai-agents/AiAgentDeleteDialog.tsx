'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAiAgentDeleteDialog } from '@/hooks'
import type { AiAgentDeleteDialogProps } from '@/types'

export function AiAgentDeleteDialog(props: AiAgentDeleteDialogProps) {
  const { t, handleDelete } = useAiAgentDeleteDialog(props)

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
      <Trash2 className="h-3.5 w-3.5" />
      {t('deleteAgent')}
    </Button>
  )
}
